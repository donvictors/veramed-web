import "server-only";

import { cookies } from "next/headers";
import { AUTH_SESSION_COOKIE } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserFromSession } from "@/lib/server/auth-store";
import { hasValidInternalAccess } from "@/lib/server/internal-access";
import {
  getRequestAccessCookieName,
  hasValidRequestAccessCookie,
} from "@/lib/server/request-access";
import type { ClinicalRequestType } from "@/lib/server/medical-approval";

export async function authorizeOrderRequest(
  request: Request,
  requestType: ClinicalRequestType,
  requestId: string,
) {
  if (hasValidInternalAccess(request, { requestType, requestId })) {
    return { ok: true as const, actor: "internal" as const };
  }

  const record =
    requestType === "checkup"
      ? await prisma.checkupRequest.findUnique({
          where: { id: requestId },
          select: { userId: true, createdAt: true },
        })
      : requestType === "chronic_control"
        ? await prisma.chronicControlRequest.findUnique({
            where: { id: requestId },
            select: { userId: true, createdAt: true },
          })
        : await prisma.symptomsRequest.findUnique({
            where: { id: requestId },
            select: { userId: true, createdAt: true },
          });

  if (!record) {
    return { ok: false as const, status: 404 as const, error: "Solicitud no encontrada." };
  }

  const cookieStore = await cookies();
  if (record.userId) {
    const sessionToken = cookieStore.get(AUTH_SESSION_COOKIE)?.value;
    const user = await getUserFromSession(sessionToken);
    if (user?.id === record.userId) {
      return { ok: true as const, actor: `user:${user.id}` };
    }
  } else {
    const requestAccessCookie = cookieStore.get(getRequestAccessCookieName())?.value;
    const hasGuestAccess = hasValidRequestAccessCookie(requestAccessCookie, {
      requestType,
      requestId,
      createdAtMs: record.createdAt.getTime(),
    });
    if (hasGuestAccess) {
      return { ok: true as const, actor: `guest:${requestId}` };
    }
  }

  return { ok: false as const, status: 403 as const, error: "No tienes acceso a esta orden." };
}
