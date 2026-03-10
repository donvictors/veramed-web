import NewPasswordForm from "@/app/recuperar-contrasena/nueva/reset-form";

type SearchParams = Record<string, string | string[] | undefined>;

function getSingleParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0]?.trim() ?? "";
  return typeof value === "string" ? value.trim() : "";
}

export default async function RecoverPasswordNewPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const resolved = await searchParams;
  const token = getSingleParam(resolved.token);
  return <NewPasswordForm token={token} />;
}
