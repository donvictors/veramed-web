import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_SESSION_COOKIE } from "@/lib/auth";
import { getUserFromSession } from "@/lib/server/auth-store";
import { listCheckupsByUser } from "@/lib/server/checkup-store";
import { listChronicControlsByUser } from "@/lib/server/chronic-control-store";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_SESSION_COOKIE)?.value;
  const user = await getUserFromSession(token);

  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const [checkups, chronicControls] = await Promise.all([
    listCheckupsByUser(user.id),
    listChronicControlsByUser(user.id),
  ]);

  const history = [...checkups, ...chronicControls].sort((a, b) => b.createdAt - a.createdAt);

  return NextResponse.json({
    user,
    history,
  });
}
