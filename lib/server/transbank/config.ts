import {
  Environment,
  IntegrationApiKeys,
  IntegrationCommerceCodes,
  Options,
  WebpayPlus,
} from "transbank-sdk";

export type TransbankMode = "INTEGRACION" | "PRODUCCION";

export function resolveTransbankMode(): TransbankMode {
  const raw = (process.env.TRANSBANK_ENV || "INTEGRACION").trim().toUpperCase();
  return raw === "PRODUCCION" ? "PRODUCCION" : "INTEGRACION";
}

export function getAppUrl() {
  const configured = process.env.APP_URL?.trim();
  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3000";
  }

  throw new Error("APP_URL no está configurada.");
}

export function buildTransbankTransaction() {
  const mode = resolveTransbankMode();

  if (mode === "PRODUCCION") {
    const commerceCode = process.env.TRANSBANK_COMMERCE_CODE?.trim();
    const apiKeySecret = process.env.TRANSBANK_API_KEY_SECRET?.trim();

    if (!commerceCode || !apiKeySecret) {
      throw new Error("Faltan credenciales de Transbank para PRODUCCION.");
    }

    const options = new Options(commerceCode, apiKeySecret, Environment.Production);
    return new WebpayPlus.Transaction(options);
  }

  const options = new Options(
    IntegrationCommerceCodes.WEBPAY_PLUS,
    IntegrationApiKeys.WEBPAY,
    Environment.Integration,
  );
  return new WebpayPlus.Transaction(options);
}

