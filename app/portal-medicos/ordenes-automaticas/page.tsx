import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AutomaticOrdersClient from "./AutomaticOrdersClient";
import { canManageMedicalUsers, MEDICAL_PORTAL_SESSION_COOKIE, verifyMedicalPortalSessionToken } from "@/lib/server/medical-portal-auth";

export default async function AutomaticOrdersPage() {
  const store = await cookies();
  const session = await verifyMedicalPortalSessionToken(store.get(MEDICAL_PORTAL_SESSION_COOKIE)?.value);
  if (!session) redirect("/medicos-login");
  if (!canManageMedicalUsers(session) && session.role === "portal") redirect("/portal-medicos");
  return <AutomaticOrdersClient />;
}
