import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ReviewSymptomsOrderClient from "@/app/portal-medicos/orden/[id]/ReviewSymptomsOrderClient";
import {
  canValidateMedicalOrders,
  MEDICAL_PORTAL_SESSION_COOKIE,
  verifyMedicalPortalSessionToken,
} from "@/lib/server/medical-portal-auth";

type Params = {
  params: Promise<{ id: string }>;
};

export default async function ReviewSymptomsOrderPage(context: Params) {
  const cookieStore = await cookies();
  const token = cookieStore.get(MEDICAL_PORTAL_SESSION_COOKIE)?.value;
  const session = await verifyMedicalPortalSessionToken(token);

  if (!session) {
    redirect("/medicos-login");
  }
  if (!canValidateMedicalOrders(session)) {
    redirect("/portal-medicos");
  }

  const { id } = await context.params;

  return <ReviewSymptomsOrderClient requestId={id} doctorEmail={session.email} />;
}
