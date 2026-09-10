import MedicalInvitationSignup from "@/app/medicos-login/crear-cuenta/signup-form";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function MedicalInvitationSignupPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const resolved = await searchParams;
  const rawToken = resolved.token;
  const token = Array.isArray(rawToken) ? rawToken[0]?.trim() ?? "" : rawToken?.trim() ?? "";
  return <MedicalInvitationSignup token={token} />;
}
