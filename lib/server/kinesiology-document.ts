import "server-only";

import { openai, type OpenAILanguageModelResponsesOptions } from "@ai-sdk/openai";
import { put } from "@vercel/blob";
import { generateText, Output } from "ai";
import { z } from "zod";
import type { KinesiologyExtraction } from "@/lib/clinical/kinesiology-eligibility";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);

const extractionSchema = z.object({
  diagnosis: z.string().nullable(),
  anatomicalRegion: z.string().nullable(),
  laterality: z.enum(["left", "right", "bilateral", "not_applicable"]).nullable(),
  documentDate: z.string().nullable(),
  providerName: z.string().nullable(),
  providerInstitution: z.string().nullable(),
  surgeryOrProcedure: z.string().nullable(),
  rehabExplicitlyIndicated: z.boolean().nullable(),
  redFlagTextFound: z.array(z.string()).max(10),
  extractionConfidence: z.number().min(0).max(1),
});

function safeFileName(name: string) {
  return name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100) || "documento";
}

export async function validateAndStoreClinicalDocument(file: File, requestId: string) {
  if (!file.size) throw new Error("El archivo está vacío.");
  if (file.size > MAX_BYTES) throw new Error("El archivo supera el máximo de 10 MB.");
  if (!ALLOWED_TYPES.has(file.type)) throw new Error("Formato no permitido. Usa PDF, JPG, JPEG o PNG.");
  const bytes = Buffer.from(await file.arrayBuffer());
  const header = bytes.subarray(0, 8);
  const isPdf = header.subarray(0, 4).toString() === "%PDF";
  const isJpeg = header[0] === 0xff && header[1] === 0xd8;
  const isPng = header.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (!(isPdf || isJpeg || isPng)) throw new Error("El contenido del archivo no coincide con un formato permitido.");
  const token = process.env.PRIVATE_BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) throw new Error("El almacenamiento privado no está configurado.");
  const name = safeFileName(file.name);
  const path = `private/clinical/kinesiology/${requestId}/${name}`;
  const blob = await put(path, bytes, { access: "private", contentType: file.type, addRandomSuffix: true, token });
  return { bytes, path: blob.pathname, name, mime: file.type };
}

export async function extractKinesiologyDocument(bytes: Buffer, mime: string): Promise<KinesiologyExtraction> {
  if (!process.env.OPENAI_API_KEY?.trim()) throw new Error("La extracción clínica no está configurada.");
  const result = await generateText({
    model: openai.responses("gpt-4o-mini"),
    system: "Extrae únicamente datos explícitos del documento clínico. No diagnostiques, no decidas elegibilidad y no interpretes imágenes radiológicas: usa sólo el informe escrito. Si algo no está presente, usa null. redFlagTextFound debe contener fragmentos breves explícitos que sugieran urgencia, fractura aguda, infección, compromiso neurológico o restricción postoperatoria no clara.",
    messages: [{ role: "user", content: [{ type: "text", text: "Estructura este antecedente para revisión médica." }, { type: "file", data: bytes, mediaType: mime }] }],
    output: Output.object({ schema: extractionSchema }),
    abortSignal: AbortSignal.timeout(30000),
    providerOptions: { openai: { store: false } satisfies OpenAILanguageModelResponsesOptions },
  });
  return extractionSchema.parse(result.output);
}
