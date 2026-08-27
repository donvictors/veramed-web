import { NextResponse } from "next/server";
import { evaluateFlow, getClinicalFlow } from "@/lib/clinical/engine";
import {
  enforceRateLimit,
  httpErrorResponse,
  readJsonBody,
  requireSameOrigin,
} from "@/lib/server/http-security";

type EvaluateBody = {
  flowId?: string;
  answers?: Record<string, unknown>;
};

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    await enforceRateLimit({ request, action: "symptoms:clinical-evaluate", limit: 30, windowMs: 15 * 60 * 1000 });
    const body = (await readJsonBody(request, 12_000)) as EvaluateBody;

  const flowId = body.flowId?.trim();
  if (!flowId) {
    return NextResponse.json({ error: "flowId es obligatorio." }, { status: 400 });
  }

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
    return httpErrorResponse(error, "No fue posible evaluar el flujo clínico.");
  }
}
