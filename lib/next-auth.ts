import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import { getGoogleAuthCredentials } from "@/lib/server/google-auth-config";

const googleCredentials = getGoogleAuthCredentials();

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET?.trim() || process.env.AUTH_SECRET?.trim(),
  pages: { signIn: "/ingresar", error: "/ingresar" },
  providers: googleCredentials ? [GoogleProvider(googleCredentials)] : [],
  session: {
    strategy: "jwt",
  },
};
