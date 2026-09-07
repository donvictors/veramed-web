import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import PortalMedicosClient from "@/app/portal-medicos/PortalMedicosClient";
import {
  MEDICAL_PORTAL_SESSION_COOKIE,
  verifyMedicalPortalSessionToken,
} from "@/lib/server/medical-portal-auth";

export default async function ValidateOrdersPage() {
  const cookieStore = await cookies();
  const session = await verifyMedicalPortalSessionToken(
    cookieStore.get(MEDICAL_PORTAL_SESSION_COOKIE)?.value,
  );
  if (!session) redirect("/medicos-login");

  return <PortalMedicosClient doctorEmail={session.email} />;
}
