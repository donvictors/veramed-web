import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import PortalMedicosClient from "@/app/portal-medicos/PortalMedicosClient";
import {
  MEDICAL_PORTAL_SESSION_COOKIE,
  verifyMedicalPortalSessionToken,
} from "@/lib/server/medical-portal-auth";

export default async function PortalMedicosPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(MEDICAL_PORTAL_SESSION_COOKIE)?.value;
  const session = await verifyMedicalPortalSessionToken(token);

  if (!session) {
    redirect("/medicos-login");
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-6 py-12 md:py-16">
        <PortalMedicosClient doctorEmail={session.email} />
      </div>
    </main>
  );
}
