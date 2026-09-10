export function getGoogleAuthCredentials(env: NodeJS.ProcessEnv = process.env) {
  const clientId = (env.AUTH_GOOGLE_ID || env.GOOGLE_CLIENT_ID || "").trim();
  const clientSecret = (env.AUTH_GOOGLE_SECRET || env.GOOGLE_CLIENT_SECRET || "").trim();
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}
