import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { decryptDiscountCode, encryptDiscountCode, hashDiscountCode, normalizeDiscountCode } from "@/lib/server/discount-codes";
import { canManageMedicalUsers, MEDICAL_PORTAL_SESSION_COOKIE, recordMedicalAudit, verifyMedicalPortalSessionToken } from "@/lib/server/medical-portal-auth";
import { httpErrorResponse, readJsonBody, requireSameOrigin } from "@/lib/server/http-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function admin() {
  const store = await cookies();
  const session = await verifyMedicalPortalSessionToken(store.get(MEDICAL_PORTAL_SESSION_COOKIE)?.value);
  return session && canManageMedicalUsers(session) ? session : null;
}

const createSchema = z.object({
  code: z.string().trim().min(4).max(80),
  label: z.string().trim().min(2).max(100),
  type: z.enum(["percent_off", "fixed_final_amount"]),
  percentOff: z.number().int().min(1).max(100).optional(),
  finalAmountClp: z.number().int().min(0).max(1_000_000).optional(),
  startsAt: z.string().optional(),
  expiresAt: z.string().optional(),
}).strict();

export async function GET() {
  const session = await admin();
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const [codes, standard, symptoms] = await Promise.all([
    prisma.discountCode.findMany({ orderBy: { createdAt: "desc" }, take: 500 }),
    prisma.transbankPaymentTransaction.groupBy({ by: ["discountCodeId"], where: { status: "paid", discountCodeId: { not: null } }, _count: { _all: true } }),
    prisma.symptomsPaymentTransaction.groupBy({ by: ["discountCodeId"], where: { status: "paid", discountCodeId: { not: null } }, _count: { _all: true } }),
  ]);
  const uses = new Map<string, number>();
  for (const group of [...standard, ...symptoms]) {
    if (group.discountCodeId) uses.set(group.discountCodeId, (uses.get(group.discountCodeId) ?? 0) + group._count._all);
  }
  return NextResponse.json({ items: codes.map((code) => ({
    id: code.id, code: decryptDiscountCode(code.codeCiphertext), label: code.label, type: code.type, percentOff: code.percentOff,
    finalAmountClp: code.finalAmountClp, active: code.active,
    startsAt: code.startsAt, expiresAt: code.expiresAt, createdAt: code.createdAt,
    paidUses: uses.get(code.id) ?? 0,
  })) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const session = await admin();
    if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    const parsed = createSchema.safeParse(await readJsonBody(request, 4_000));
    if (!parsed.success) return NextResponse.json({ error: "Revisa los datos del código." }, { status: 400 });
    const input = parsed.data;
    const code = normalizeDiscountCode(input.code);
    if (!/^[A-Z0-9_-]{4,80}$/.test(code)) return NextResponse.json({ error: "Usa letras, números, guiones o guion bajo." }, { status: 400 });
    if (input.type === "percent_off" && input.percentOff === undefined || input.type === "fixed_final_amount" && input.finalAmountClp === undefined) {
      return NextResponse.json({ error: "Indica el valor del descuento." }, { status: 400 });
    }
    const startsAt = input.startsAt ? new Date(input.startsAt) : null;
    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
    if (startsAt && !Number.isFinite(startsAt.getTime()) || expiresAt && !Number.isFinite(expiresAt.getTime()) || startsAt && expiresAt && expiresAt <= startsAt) {
      return NextResponse.json({ error: "Revisa las fechas de vigencia." }, { status: 400 });
    }
    const created = await prisma.discountCode.create({ data: {
      codeHash: hashDiscountCode(code), codeCiphertext: encryptDiscountCode(code), label: input.label, type: input.type,
      percentOff: input.type === "percent_off" ? input.percentOff : null,
      finalAmountClp: input.type === "fixed_final_amount" ? input.finalAmountClp : null,
      startsAt, expiresAt, active: true,
    } });
    await recordMedicalAudit({ session, action: "discount_code.create", request, metadata: { discountCodeId: created.id, label: created.label } });
    return NextResponse.json({ id: created.id, code }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ error: "Este código ya existe." }, { status: 409 });
    return httpErrorResponse(error, "No pudimos crear el código.");
  }
}
