import { NextRequest, NextResponse } from "next/server";
import { signJwt } from "@/lib/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const p = url.searchParams;
  const response_type = p.get("response_type");
  const client_id = p.get("client_id");
  const redirect_uri = p.get("redirect_uri");
  const state = p.get("state");
  const code_challenge = p.get("code_challenge");
  const code_challenge_method = p.get("code_challenge_method");

  if (response_type !== "code" || !client_id || !redirect_uri) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  if (code_challenge && code_challenge_method !== "S256") {
    return NextResponse.json(
      {
        error: "invalid_request",
        error_description: "Only S256 PKCE supported",
      },
      { status: 400 }
    );
  }

  let parsedRedirect: URL;
  try {
    parsedRedirect = new URL(redirect_uri);
  } catch {
    return NextResponse.json(
      { error: "invalid_redirect_uri" },
      { status: 400 }
    );
  }
  const okScheme =
    parsedRedirect.protocol === "https:" ||
    (parsedRedirect.protocol === "http:" &&
      (parsedRedirect.hostname === "localhost" ||
        parsedRedirect.hostname === "127.0.0.1"));
  if (!okScheme) {
    return NextResponse.json(
      { error: "invalid_redirect_uri" },
      { status: 400 }
    );
  }

  const code = signJwt(
    {
      typ: "code",
      cid: client_id,
      cc: code_challenge ?? null,
      rdr: redirect_uri,
    },
    600
  );

  parsedRedirect.searchParams.set("code", code);
  if (state) parsedRedirect.searchParams.set("state", state);
  return NextResponse.redirect(parsedRedirect.toString(), 302);
}
