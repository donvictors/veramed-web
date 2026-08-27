import { NextResponse } from "next/server";
import { openPrivatePdfAccess } from "@/lib/server/order-pdf-access";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const result = await openPrivatePdfAccess(token, request);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const safeFileName = result.fileName.replaceAll(/[\r\n"]/g, "_");
  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": result.contentType,
      "Content-Disposition": `attachment; filename="${safeFileName}"`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
