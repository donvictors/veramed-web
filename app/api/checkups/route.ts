import { NextResponse } from "next/server";
import { createCheckupRecord, serializeCheckupRecord } from "@/lib/server/checkup-store";
import { type CheckupInput, type PatientDetails } from "@/lib/checkup";

export async function POST(request: Request) {
  const payload = (await request.json()) as {
    input?: CheckupInput;
    patient?: PatientDetails;
  };

  if (!payload.input || !payload.patient) {
    return NextResponse.json({ error: "Datos incompletos." }, { status: 400 });
  }

  const record = await createCheckupRecord({
    input: payload.input,
    patient: payload.patient,
  });

  return NextResponse.json({ checkup: serializeCheckupRecord(record) }, { status: 201 });
}
