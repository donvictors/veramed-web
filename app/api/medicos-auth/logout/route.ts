import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { MEDICAL_PORTAL_SESSION_COOKIE } from "@/lib/server/medical-portal-auth";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set(MEDICAL_PORTAL_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return NextResponse.json({ ok: true });
}
