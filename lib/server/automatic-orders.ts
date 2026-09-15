import "server-only";

import { joinPatientFullName } from "@/lib/checkup";
import { prisma } from "@/lib/prisma";

const automaticPaid = {
  approvalMethod: "automatic_protocol" as const,
  reviewStatus: "approved" as const,
  payment: { is: { status: "paid" as const } },
};

function testNames(rec: unknown): string[] {
  if (!rec || typeof rec !== "object" || !("tests" in rec)) return [];
  const tests = (rec as { tests?: unknown }).tests;
  if (!Array.isArray(tests)) return [];
  return tests.map((test) => typeof test === "string" ? test : test && typeof test === "object" && "name" in test ? String(test.name) : "").filter(Boolean);
}

export async function listAutomaticOrders() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const select = {
    id: true, orderId: true, approvedAt: true, approvalProtocolVersion: true,
    orderEmailSentAt: true, patientFirstName: true, patientPaternalSurname: true,
    patientMaternalSurname: true, patientEmail: true, patientRut: true, rec: true,
    payment: { select: { amount: true, paidAt: true } },
  } as const;
  const [checkups, chronicControls, checkupTotal, chronicTotal, checkupToday, chronicToday, checkupEmailPending, chronicEmailPending] = await Promise.all([
    prisma.checkupRequest.findMany({ where: automaticPaid, orderBy: { approvedAt: "desc" }, take: 100, select }),
    prisma.chronicControlRequest.findMany({ where: automaticPaid, orderBy: { approvedAt: "desc" }, take: 100, select }),
    prisma.checkupRequest.count({ where: automaticPaid }),
    prisma.chronicControlRequest.count({ where: automaticPaid }),
    prisma.checkupRequest.count({ where: { ...automaticPaid, approvedAt: { gte: since } } }),
    prisma.chronicControlRequest.count({ where: { ...automaticPaid, approvedAt: { gte: since } } }),
    prisma.checkupRequest.count({ where: { ...automaticPaid, orderEmailSentAt: null } }),
    prisma.chronicControlRequest.count({ where: { ...automaticPaid, orderEmailSentAt: null } }),
  ]);
  const normalize = (type: "checkup" | "chronic_control", rows: typeof checkups | typeof chronicControls) => rows.map((row) => ({
    type, requestId: row.id, orderId: row.orderId,
    approvedAt: row.approvedAt?.toISOString() ?? null,
    protocolVersion: row.approvalProtocolVersion,
    emailSentAt: row.orderEmailSentAt?.toISOString() ?? null,
    patientName: joinPatientFullName({ firstName: row.patientFirstName, paternalSurname: row.patientPaternalSurname, maternalSurname: row.patientMaternalSurname }),
    patientEmail: row.patientEmail, patientRut: row.patientRut,
    amount: row.payment?.amount ?? null, paidAt: row.payment?.paidAt?.toISOString() ?? null,
    tests: testNames(row.rec),
  }));
  const items = [...normalize("checkup", checkups), ...normalize("chronic_control", chronicControls)]
    .sort((a, b) => Date.parse(b.approvedAt ?? "") - Date.parse(a.approvedAt ?? ""))
    .slice(0, 100);
  return {
    items,
    counts: {
      total: checkupTotal + chronicTotal, checkup: checkupTotal, chronicControl: chronicTotal,
      last24Hours: checkupToday + chronicToday,
      emailPending: checkupEmailPending + chronicEmailPending,
    },
  };
}
