import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import MedicalPortalShell from "@/app/portal-medicos/_components/MedicalPortalShell";
import {
  isPrimaryMedicalAdmin,
  MEDICAL_PORTAL_SESSION_COOKIE,
  verifyMedicalPortalSessionToken,
} from "@/lib/server/medical-portal-auth";

export default async function PortalMedicosLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const session = await verifyMedicalPortalSessionToken(
    cookieStore.get(MEDICAL_PORTAL_SESSION_COOKIE)?.value,
  );

  if (!session) redirect("/medicos-login");

  return (
    <MedicalPortalShell
      doctor={{
        name: session.name,
        firstName: session.firstName,
        paternalSurname: session.paternalSurname,
        maternalSurname: session.maternalSurname,
        email: session.email,
        role: session.role,
        isPrimaryAdmin: isPrimaryMedicalAdmin(session.email),
        specialty: session.specialty ?? null,
      }}
    >
      {children}
    </MedicalPortalShell>
  );
}
