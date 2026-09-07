import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ProfileSettings from "@/app/portal-medicos/_components/ProfileSettings";
import { MEDICAL_PORTAL_SESSION_COOKIE, verifyMedicalPortalSessionToken } from "@/lib/server/medical-portal-auth";

export default async function MedicalProfilePage() {
  const cookieStore = await cookies();
  const session = await verifyMedicalPortalSessionToken(cookieStore.get(MEDICAL_PORTAL_SESSION_COOKIE)?.value);
  if (!session) redirect("/medicos-login");
  return <ProfileSettings doctor={{ name: session.name, email: session.email, role: session.role, specialty: null }} />;
}
