import "server-only";

import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { calculateAgeFromBirthDate } from "@/lib/checkup";
import {
  prescriptionInstruction,
  prescriptionPatientFullName,
  type PrescriptionItemInput,
  type PrescriptionPatientInput,
} from "@/lib/prescriptions";

type PrescriptionPdfInput = {
  patient: PrescriptionPatientInput;
  items: PrescriptionItemInput[];
  prescriber: {
    name: string;
    rut: string;
    sisRegistration: string;
    email: string;
    specialty?: string;
  };
  verificationCode: string;
  issuedAt: Date;
  signatureBytes?: Buffer | null;
};

function clean(value: string) {
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
}

function dateLabel(value: Date) {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Santiago",
  }).format(value);
}

function wrapText(text: string, font: import("pdf-lib").PDFFont, size: number, maxWidth: number) {
  const words = clean(text).split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = word;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

async function loadLogo(document: PDFDocument) {
  try {
    const bytes = await readFile(path.join(process.cwd(), "public", "brand", "veramed-logo.png"));
    return document.embedPng(bytes);
  } catch {
    return null;
  }
}

export async function buildMedicalPrescriptionPdf(input: PrescriptionPdfInput) {
  const document = await PDFDocument.create();
  document.setTitle(`Receta médica ${input.verificationCode}`);
  document.setAuthor(input.prescriber.name);
  document.setSubject("Receta médica electrónica emitida en Veramed");
  document.setCreationDate(input.issuedAt);

  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const logo = await loadLogo(document);
  const signature = input.signatureBytes
    ? await document.embedPng(input.signatureBytes).catch(() => null)
    : null;
  const green = rgb(0.13, 0.43, 0.32);
  const muted = rgb(0.35, 0.4, 0.43);
  const pale = rgb(0.91, 0.96, 0.93);
  const ink = rgb(0.06, 0.09, 0.12);
  const margin = 44;
  const pageWidth = 612;
  const pageHeight = 792;
  const contentWidth = pageWidth - margin * 2;
  const pages: import("pdf-lib").PDFPage[] = [];
  let page!: import("pdf-lib").PDFPage;
  let y = 0;

  function drawHeader() {
    page = document.addPage([pageWidth, pageHeight]);
    pages.push(page);
    page.drawRectangle({
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
      color: rgb(1, 1, 1),
    });
    page.drawText("VERAMED", {
      x: 116,
      y: 300,
      size: 70,
      font: bold,
      color: pale,
      rotate: degrees(42),
      opacity: 0.22,
    });
    y = pageHeight - 43;
    if (logo) {
      const width = 126;
      page.drawImage(logo, {
        x: margin,
        y: y - 6,
        width,
        height: (logo.height / logo.width) * width,
      });
    } else {
      page.drawText("Veramed", { x: margin, y, size: 18, font: bold, color: green });
    }
    page.drawText("RECETA MÉDICA ELECTRÓNICA", {
      x: pageWidth - margin - 188,
      y: y + 1,
      size: 10,
      font: bold,
      color: green,
    });
    page.drawText(input.verificationCode, {
      x: pageWidth - margin - 188,
      y: y - 14,
      size: 9,
      font: regular,
      color: muted,
    });
    y -= 54;
    page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 1, color: green });
    y -= 26;
  }

  function ensureSpace(height: number) {
    if (y - height >= 174) return;
    drawFooter(false);
    drawHeader();
  }

  function drawFooter(last: boolean) {
    const footerTop = 142;
    page.drawLine({ start: { x: margin, y: footerTop }, end: { x: pageWidth - margin, y: footerTop }, thickness: 0.7, color: rgb(0.75, 0.78, 0.78) });
    page.drawText(`Emitida ${dateLabel(input.issuedAt)}`, { x: margin, y: 120, size: 8.5, font: regular, color: muted });
    page.drawText(`Código: ${input.verificationCode}`, { x: margin, y: 106, size: 8.5, font: bold, color: ink });
    page.drawText(`Página ${pages.length}`, { x: pageWidth / 2 - 18, y: 106, size: 8.5, font: regular, color: muted });

    if (last) {
      if (signature) {
        const width = 92;
        page.drawImage(signature, {
          x: pageWidth - margin - 142,
          y: 92,
          width,
          height: Math.min(42, (signature.height / signature.width) * width),
        });
      }
      page.drawLine({ start: { x: pageWidth - margin - 180, y: 91 }, end: { x: pageWidth - margin, y: 91 }, thickness: 0.7, color: ink });
      page.drawText(clean(input.prescriber.name), { x: pageWidth - margin - 172, y: 76, size: 8.5, font: bold, color: ink });
      page.drawText(`RUT ${clean(input.prescriber.rut)} · SIS ${clean(input.prescriber.sisRegistration)}`, { x: pageWidth - margin - 172, y: 64, size: 8, font: regular, color: muted });
      page.drawText(clean(input.prescriber.specialty || "Médico/a"), { x: pageWidth - margin - 172, y: 52, size: 7.7, font: regular, color: muted });
      page.drawText("Firmada electrónicamente en Veramed", { x: pageWidth - margin - 172, y: 40, size: 7.7, font: regular, color: green });
    }
  }

  drawHeader();
  page.drawText("RECETA MÉDICA", { x: margin, y, size: 19, font: bold, color: ink });
  y -= 26;
  page.drawRectangle({ x: margin, y: y - 82, width: contentWidth, height: 92, color: rgb(0.975, 0.985, 0.98), borderColor: rgb(0.82, 0.88, 0.85), borderWidth: 0.8 });
  const patientName = prescriptionPatientFullName(input.patient).toUpperCase();
  const age = calculateAgeFromBirthDate(input.patient.birthDate);
  const left = [
    ["Paciente", patientName],
    ["RUT", input.patient.rut],
    ["Dirección", input.patient.address || "No informada"],
  ] as const;
  const right = [
    ["Edad", age > 0 ? `${age} años` : "No informada"],
    ["Correo", input.patient.email],
    ["Teléfono", input.patient.phone || "No informado"],
  ] as const;
  let rowY = y - 13;
  for (const [label, value] of left) {
    page.drawText(`${label}:`, { x: margin + 12, y: rowY, size: 9, font: bold, color: muted });
    const shown = clean(value).slice(0, label === "Dirección" ? 56 : 42);
    page.drawText(shown, { x: margin + 70, y: rowY, size: 9, font: regular, color: ink });
    rowY -= 22;
  }
  rowY = y - 13;
  for (const [label, value] of right) {
    page.drawText(`${label}:`, { x: 340, y: rowY, size: 9, font: bold, color: muted });
    page.drawText(clean(value).slice(0, 36), { x: 390, y: rowY, size: 9, font: regular, color: ink });
    rowY -= 22;
  }
  y -= 106;

  input.items.forEach((item, index) => {
    const nameLines = wrapText(item.name.toUpperCase(), bold, 11, contentWidth - 42);
    const instructionLines = wrapText(`Indicación: ${prescriptionInstruction(item)}`, regular, 9.5, contentWidth - 42);
    const commercialLines = item.commercial ? wrapText(`Recomendación comercial: ${item.commercial}`, regular, 9, contentWidth - 42) : [];
    const observationLines = item.observations ? wrapText(`Observaciones: ${item.observations}`, regular, 9, contentWidth - 42) : [];
    const blockHeight = 24 + (nameLines.length + instructionLines.length + commercialLines.length + observationLines.length) * 13;
    ensureSpace(blockHeight + 12);
    page.drawCircle({ x: margin + 7, y: y + 2, size: 7, color: green });
    page.drawText(String(index + 1), { x: margin + (index < 9 ? 4.6 : 2.5), y: y - 1, size: 7, font: bold, color: rgb(1, 1, 1) });
    let lineY = y;
    for (const line of nameLines) {
      page.drawText(line, { x: margin + 24, y: lineY, size: 11, font: bold, color: ink });
      lineY -= 14;
    }
    for (const line of instructionLines) {
      page.drawText(line, { x: margin + 24, y: lineY, size: 9.5, font: regular, color: ink });
      lineY -= 13;
    }
    for (const line of commercialLines) {
      page.drawText(line, { x: margin + 24, y: lineY, size: 9, font: regular, color: muted });
      lineY -= 13;
    }
    for (const line of observationLines) {
      page.drawText(line, { x: margin + 24, y: lineY, size: 9, font: regular, color: muted });
      lineY -= 13;
    }
    page.drawText(`Inicio: ${item.startDate.split("-").reverse().join("-")}`, { x: margin + 24, y: lineY, size: 8.5, font: regular, color: muted });
    y = lineY - 22;
    page.drawLine({ start: { x: margin + 24, y: y + 8 }, end: { x: pageWidth - margin, y: y + 8 }, thickness: 0.5, color: rgb(0.88, 0.9, 0.89) });
  });

  drawFooter(true);
  pages.forEach((itemPage, index) => {
    itemPage.drawText(`de ${pages.length}`, { x: pageWidth / 2 + 18, y: 106, size: 8.5, font: regular, color: muted });
    if (index < pages.length - 1) {
      itemPage.drawText("Continuación", { x: pageWidth - margin - 58, y: 120, size: 8, font: regular, color: muted });
    }
  });

  return Buffer.from(await document.save());
}
