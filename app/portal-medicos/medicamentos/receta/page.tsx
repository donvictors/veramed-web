import StandardPrescriptionBuilder from "@/app/portal-medicos/_components/StandardPrescriptionBuilder";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  canValidateMedicalOrders,
  MEDICAL_PORTAL_SESSION_COOKIE,
  verifyMedicalPortalSessionToken,
} from "@/lib/server/medical-portal-auth";

export default async function PrescriptionPage() {
  const cookieStore = await cookies();
  const session = await verifyMedicalPortalSessionToken(
    cookieStore.get(MEDICAL_PORTAL_SESSION_COOKIE)?.value,
  );
  if (!session) redirect("/medicos-login");
  if (!canValidateMedicalOrders(session)) redirect("/portal-medicos");
  return <StandardPrescriptionBuilder />;
}
