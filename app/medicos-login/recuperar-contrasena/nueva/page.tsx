import MedicalNewPasswordForm from "@/app/medicos-login/recuperar-contrasena/nueva/reset-form";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function MedicalNewPasswordPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const resolved = await searchParams;
  const rawToken = resolved.token;
  const token = Array.isArray(rawToken) ? rawToken[0]?.trim() ?? "" : rawToken?.trim() ?? "";
  return <MedicalNewPasswordForm token={token} />;
}
