import { createHmac } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function normalize(value) {
  return String(value ?? "").trim().toUpperCase();
}

function hashCode(code, pepper) {
  return createHmac("sha256", pepper).update(normalize(code)).digest("hex");
}

function parseDefinitions() {
  const raw = process.env.DISCOUNT_CODES_IMPORT_JSON?.trim();
  if (!raw) {
    throw new Error("DISCOUNT_CODES_IMPORT_JSON no está configurada.");
  }
  const definitions = JSON.parse(raw);
  if (!Array.isArray(definitions) || definitions.length === 0) {
    throw new Error("DISCOUNT_CODES_IMPORT_JSON debe contener un arreglo no vacío.");
  }
  return definitions;
}

try {
  const pepper = process.env.DISCOUNT_CODE_PEPPER?.trim() || process.env.AUTH_SECRET?.trim();
  if (!pepper) {
    throw new Error("DISCOUNT_CODE_PEPPER o AUTH_SECRET no está configurada.");
  }

  const definitions = parseDefinitions();
  let imported = 0;
  for (const definition of definitions) {
    const code = normalize(definition.code);
    const type = definition.type;
    const label = String(definition.label ?? "").trim();
    if (!code || !label || (type !== "percent_off" && type !== "fixed_final_amount")) {
      throw new Error("Definición de descuento inválida.");
    }

    const percentOff =
      type === "percent_off" ? Math.max(0, Math.min(100, Math.round(definition.percentOff))) : null;
    const finalAmountClp =
      type === "fixed_final_amount" ? Math.max(1, Math.round(definition.finalAmountClp)) : null;
    if ((type === "percent_off" && !Number.isFinite(percentOff)) ||
        (type === "fixed_final_amount" && !Number.isFinite(finalAmountClp))) {
      throw new Error("Monto o porcentaje de descuento inválido.");
    }

    const data = {
      label,
      type,
      percentOff,
      finalAmountClp,
      active: definition.active !== false,
      startsAt: definition.startsAt ? new Date(definition.startsAt) : null,
      expiresAt: definition.expiresAt ? new Date(definition.expiresAt) : null,
    };
    await prisma.discountCode.upsert({
      where: { codeHash: hashCode(code, pepper) },
      update: data,
      create: { codeHash: hashCode(code, pepper), ...data },
    });
    imported += 1;
  }

  console.log(`Descuentos importados de forma privada: ${imported}`);
} finally {
  await prisma.$disconnect();
}
