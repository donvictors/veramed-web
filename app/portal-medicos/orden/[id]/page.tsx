import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ReviewSymptomsOrderClient from "@/app/portal-medicos/orden/[id]/ReviewSymptomsOrderClient";
import {
  MEDICAL_PORTAL_SESSION_COOKIE,
  verifyMedicalPortalSessionToken,
} from "@/lib/server/medical-portal-auth";

type Params = {
  params: Promise<{ id: string }>;
};

export default async function ReviewSymptomsOrderPage(context: Params) {
  const cookieStore = await cookies();
  const token = cookieStore.get(MEDICAL_PORTAL_SESSION_COOKIE)?.value;
  const session = verifyMedicalPortalSessionToken(token);

  if (!session) {
    redirect("/medicos-login");
  }

  const { id } = await context.params;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl px-6 py-12 md:py-16">
        <ReviewSymptomsOrderClient requestId={id} doctorEmail={session.email} />
      </div>
    </main>
  );
}

