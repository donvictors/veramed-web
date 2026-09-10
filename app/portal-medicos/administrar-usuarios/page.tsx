import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import UserAdministrationClient from "@/app/portal-medicos/administrar-usuarios/UserAdministrationClient";
import {
  canManageMedicalUsers,
  MEDICAL_PORTAL_SESSION_COOKIE,
  verifyMedicalPortalSessionToken,
} from "@/lib/server/medical-portal-auth";

export default async function UserAdministrationPage() {
  const cookieStore = await cookies();
  const session = await verifyMedicalPortalSessionToken(
    cookieStore.get(MEDICAL_PORTAL_SESSION_COOKIE)?.value,
  );
  if (!session) redirect("/medicos-login");
  if (!canManageMedicalUsers(session)) redirect("/portal-medicos");

  return <UserAdministrationClient />;
}
