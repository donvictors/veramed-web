import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { joinMedicalPortalName } from "@/lib/medical-portal/profile";
import { MEDICAL_SPECIALTIES } from "@/lib/medical-portal/specialties";
import { prisma } from "@/lib/prisma";
import {
  MEDICAL_PORTAL_SESSION_COOKIE,
  recordMedicalAudit,
  verifyMedicalPortalSessionToken,
} from "@/lib/server/medical-portal-auth";
import { httpErrorResponse, readJsonBody, requireSameOrigin } from "@/lib/server/http-security";

const profileSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  paternalSurname: z.string().trim().max(80),
  maternalSurname: z.string().trim().max(80),
  specialty: z.union([z.enum(MEDICAL_SPECIALTIES), z.literal("")]),
  medicalRut: z.string().trim().min(8).max(20),
  sisRegistration: z.string().trim().min(3).max(30),
});

export async function PATCH(request: Request) {
  try {
    requireSameOrigin(request);
    const cookieStore = await cookies();
    const session = await verifyMedicalPortalSessionToken(
      cookieStore.get(MEDICAL_PORTAL_SESSION_COOKIE)?.value,
    );
    if (!session) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const parsed = profileSchema.safeParse(await readJsonBody(request, 8_000));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Revisa los datos profesionales ingresados." },
        { status: 400 },
      );
    }

    const name = joinMedicalPortalName(parsed.data);
    const updated = await prisma.medicalPortalUser.update({
      where: { id: session.userId },
      data: {
        name,
        firstName: parsed.data.firstName,
        paternalSurname: parsed.data.paternalSurname,
        maternalSurname: parsed.data.maternalSurname,
        specialty: parsed.data.specialty || null,
        medicalRut: parsed.data.medicalRut,
        sisRegistration: parsed.data.sisRegistration,
      },
      select: {
        name: true,
        firstName: true,
        paternalSurname: true,
        maternalSurname: true,
        specialty: true,
        medicalRut: true,
        sisRegistration: true,
      },
    });

    await recordMedicalAudit({
      session,
      action: "medical.profile_updated",
      request,
      metadata: { specialty: updated.specialty },
    });

    return NextResponse.json({ user: updated }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return httpErrorResponse(error, "No pudimos actualizar el perfil médico.");
  }
}
