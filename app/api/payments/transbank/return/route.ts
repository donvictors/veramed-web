import { NextResponse } from "next/server";

function asToken(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function buildReturnUrl(requestUrl: string, params: URLSearchParams) {
  const nextUrl = new URL("/payments/transbank/return", requestUrl);
  nextUrl.search = params.toString();
  return nextUrl;
}

export async function GET(request: Request) {
  const source = new URL(request.url);
  const token = source.searchParams.get("token_ws")?.trim() ?? "";
  const abortedToken = source.searchParams.get("TBK_TOKEN")?.trim() ?? "";
  const targetParams = new URLSearchParams();

  if (token) {
    targetParams.set("token_ws", token);
  } else if (abortedToken) {
    targetParams.set("reason", "flow-aborted");
  } else {
    targetParams.set("reason", "missing-token");
  }

  return NextResponse.redirect(buildReturnUrl(request.url, targetParams), 303);
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  const targetParams = new URLSearchParams();

  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const token = asToken(form.get("token_ws"));
    const tbkToken = asToken(form.get("TBK_TOKEN"));

    if (token) {
      targetParams.set("token_ws", token);
    } else if (tbkToken) {
      targetParams.set("reason", "flow-aborted");
    } else {
      targetParams.set("reason", "missing-token");
    }
  } else {
    try {
      const body = (await request.json()) as { token_ws?: string };
      const token = body.token_ws?.trim() ?? "";
      if (token) {
        targetParams.set("token_ws", token);
      } else {
        targetParams.set("reason", "missing-token");
      }
    } catch {
      targetParams.set("reason", "invalid-body");
    }
  }

  return NextResponse.redirect(buildReturnUrl(request.url, targetParams), 303);
}

