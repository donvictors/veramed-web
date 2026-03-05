import { PDFDocument, StandardFonts } from "pdf-lib";
import { createVerificationCode } from "@/lib/checkup";

type PatientPayload = {
  fullName: string;
  rut: string;
  birthDate: string;
  email: string;
  phone: string;
  address: string;
};

type TestPayload = {
  name: string;
  why: string;
};

type BuildOrderPdfInput = {
  title: string;
  patient: PatientPayload;
  tests: TestPayload[];
  issuedAtMs: number;
};

function formatIssuedAt(issuedAtMs: number) {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(issuedAtMs));
}

function drawHeader(args: {
  page: import("pdf-lib").PDFPage;
  title: string;
  patient: PatientPayload;
  issuedAtLabel: string;
  verificationCode: string;
  font: import("pdf-lib").PDFFont;
  fontBold: import("pdf-lib").PDFFont;
}) {
  const { page, title, patient, issuedAtLabel, verificationCode, font, fontBold } = args;
  const { width, height } = page.getSize();
  const marginX = 42;
  let y = height - 42;

  page.drawText("Veramed", {
    x: marginX,
    y,
    size: 17,
    font: fontBold,
  });

  page.drawText("ORDEN MÉDICA DIGITAL", {
    x: width - 210,
    y: y + 2,
    size: 10,
    font: fontBold,
  });

  page.drawText(issuedAtLabel, {
    x: width - 210,
    y: y - 12,
    size: 10,
    font,
  });

  y -= 46;
  page.drawText(title, {
    x: marginX,
    y,
    size: 18,
    font: fontBold,
  });

  y -= 12;
  page.drawLine({
    start: { x: marginX, y },
    end: { x: width - marginX, y },
    thickness: 1,
  });

  y -= 20;
  const leftX = marginX;
  const rightX = width / 2 + 10;

  const patientLinesLeft = [
    ["Paciente", patient.fullName || "No informado"],
    ["RUT", patient.rut || "No informado"],
    ["Dirección", patient.address || "No informada"],
  ] as const;
  const patientLinesRight = [
    ["Nacimiento", patient.birthDate || "No informado"],
    ["Correo", patient.email || "No informado"],
    ["Teléfono", patient.phone || "No informado"],
  ] as const;

  let lineY = y;
  for (const [label, value] of patientLinesLeft) {
    page.drawText(`${label}:`, { x: leftX, y: lineY, size: 10, font });
    page.drawText(value, { x: leftX + 70, y: lineY, size: 10, font: fontBold });
    lineY -= 14;
  }

  lineY = y;
  for (const [label, value] of patientLinesRight) {
    page.drawText(`${label}:`, { x: rightX, y: lineY, size: 10, font });
    page.drawText(value, { x: rightX + 62, y: lineY, size: 10, font: fontBold });
    lineY -= 14;
  }

  y -= 48;
  page.drawLine({
    start: { x: marginX, y },
    end: { x: width - marginX, y },
    thickness: 0.8,
  });

  y -= 18;
  page.drawText(`ID: ${verificationCode}`, {
    x: marginX,
    y,
    size: 10,
    font,
  });

  return y - 16;
}

function drawFooter(args: {
  page: import("pdf-lib").PDFPage;
  pageNumber: number;
  totalPages: number;
  verificationCode: string;
  issuedAtLabel: string;
  font: import("pdf-lib").PDFFont;
  fontBold: import("pdf-lib").PDFFont;
}) {
  const { page, pageNumber, totalPages, verificationCode, issuedAtLabel, font, fontBold } = args;
  const { width } = page.getSize();
  const marginX = 42;
  const y = 36;

  page.drawLine({
    start: { x: marginX, y: y + 24 },
    end: { x: width - marginX, y: y + 24 },
    thickness: 0.8,
  });

  page.drawText("Código de verificación", {
    x: marginX,
    y: y + 10,
    size: 9,
    font: fontBold,
  });
  page.drawText(verificationCode, {
    x: marginX,
    y: y - 2,
    size: 9,
    font,
  });

  page.drawText("Fecha de emisión", {
    x: width / 2 - 48,
    y: y + 10,
    size: 9,
    font: fontBold,
  });
  page.drawText(issuedAtLabel, {
    x: width / 2 - 52,
    y: y - 2,
    size: 9,
    font,
  });

  page.drawText("veramed.cl", {
    x: width - 130,
    y: y + 10,
    size: 9,
    font: fontBold,
  });
  page.drawText(`Página ${pageNumber} de ${totalPages}`, {
    x: width - 130,
    y: y - 2,
    size: 9,
    font,
  });
}

export async function buildOrderPdf(input: BuildOrderPdfInput) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const issuedAtLabel = formatIssuedAt(input.issuedAtMs);
  const verificationCode = createVerificationCode(input.patient.rut, input.issuedAtMs);

  const topLimit = 210;
  const bottomLimit = 86;
  const marginX = 52;
  const lineHeight = 14;

  let page = doc.addPage([612, 792]); // Letter
  let y = drawHeader({
    page,
    title: input.title,
    patient: input.patient,
    issuedAtLabel,
    verificationCode,
    font,
    fontBold,
  });

  const pages: import("pdf-lib").PDFPage[] = [page];

  for (const test of input.tests) {
    const contentHeight = 10 + lineHeight * 3 + Math.ceil(test.name.length / 55) * lineHeight;
    if (y - contentHeight <= bottomLimit) {
      page = doc.addPage([612, 792]);
      pages.push(page);
      y = drawHeader({
        page,
        title: input.title,
        patient: input.patient,
        issuedAtLabel,
        verificationCode,
        font,
        fontBold,
      });
    }

    if (y > topLimit) {
      page.drawText("•", { x: marginX, y, size: 12, font: fontBold });
    }

    page.drawText(test.name.toUpperCase(), {
      x: marginX + 16,
      y,
      size: 10.5,
      font: fontBold,
    });
    y -= lineHeight;

    page.drawText(`Observaciones: ${test.why || "No requiere preparación especial."}`, {
      x: marginX + 16,
      y,
      size: 10,
      font,
    });
    y -= lineHeight;

    page.drawText(`Fecha: ${issuedAtLabel.split(",")[0] ?? issuedAtLabel}`, {
      x: marginX + 16,
      y,
      size: 10,
      font,
    });
    y -= lineHeight + 4;
  }

  const totalPages = pages.length;
  pages.forEach((itemPage, index) => {
    drawFooter({
      page: itemPage,
      pageNumber: index + 1,
      totalPages,
      verificationCode,
      issuedAtLabel,
      font,
      fontBold,
    });
  });

  return Buffer.from(await doc.save());
}
