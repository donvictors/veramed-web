import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import MyPrescriptionsClient from "@/app/portal-medicos/mis-recetas/MyPrescriptionsClient";
import {
  canValidateMedicalOrders,
  MEDICAL_PORTAL_SESSION_COOKIE,
  verifyMedicalPortalSessionToken,
} from "@/lib/server/medical-portal-auth";

export default async function MyPrescriptionsPage() {
  const cookieStore = await cookies();
  const session = await verifyMedicalPortalSessionToken(
    cookieStore.get(MEDICAL_PORTAL_SESSION_COOKIE)?.value,
  );
  if (!session) redirect("/medicos-login");
  if (!canValidateMedicalOrders(session)) redirect("/portal-medicos");
  return <MyPrescriptionsClient />;
}
