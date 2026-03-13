import { NextResponse } from "next/server";
import { evaluateFlow, getClinicalFlow } from "@/lib/clinical/engine";

type EvaluateBody = {
  flowId?: string;
  answers?: Record<string, unknown>;
};

export async function POST(request: Request) {
  let body: EvaluateBody;

  try {
    body = (await request.json()) as EvaluateBody;
  } catch {
    return NextResponse.json({ error: "Body JSON inválido." }, { status: 400 });
  }

  const flowId = body.flowId?.trim();
  if (!flowId) {
    return NextResponse.json({ error: "flowId es obligatorio." }, { status: 400 });
  }

  try {
    const flow = getClinicalFlow(flowId);
    const evaluation = evaluateFlow(flowId, body.answers ?? {});

    return NextResponse.json({
      flow: {
        flowId: flow.flowId,
        label: flow.label,
        keyQuestions: flow.keyQuestions,
      },
      evaluation,
      engineVersion: "clinical-deterministic-v1",
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No fue posible evaluar el flujo clínico.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

