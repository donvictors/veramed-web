import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import MedicalPortalShell from "@/app/portal-medicos/_components/MedicalPortalShell";
import {
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
        email: session.email,
        role: session.role,
        specialty: null,
      }}
    >
      {children}
    </MedicalPortalShell>
  );
}
