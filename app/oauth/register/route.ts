import { NextRequest, NextResponse } from "next/server";
import { randomId, oauthEnabled, oauthDisabledResponse, oauthRateLimited, redirectUriPermis } from "@/lib/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!oauthEnabled()) return oauthDisabledResponse();
  const limitat = oauthRateLimited(req, "register");
  if (limitat) return limitat;
  let body: any = {};
  try {
    const parsed = await req.json();
    // „null” sau un array ca body aruncau la body.redirect_uris → 500.
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) body = parsed;
  } catch {}

  // RFC 7591 §3.2.2: redirect_uris nepermise → invalid_redirect_uri.
  const redirectUris: string[] = Array.isArray(body.redirect_uris)
    ? body.redirect_uris.filter((u: unknown): u is string => typeof u === "string")
    : [];
  if (redirectUris.length > 10) {
    return NextResponse.json(
      { error: "invalid_client_metadata", error_description: "prea multe redirect_uris (max 10)" },
      { status: 400, headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" } },
    );
  }
  const respinse = redirectUris.filter((u) => !redirectUriPermis(u));
  if (respinse.length > 0) {
    return NextResponse.json(
      {
        error: "invalid_redirect_uri",
        error_description: `redirect_uri nepermis: ${respinse.join(", ")}`,
      },
      { status: 400, headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" } },
    );
  }

  const client_id = `anon_${randomId(12)}`;

  return NextResponse.json(
    {
      client_id,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      redirect_uris: redirectUris,
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      scope: "mcp",
      client_name:
        typeof body.client_name === "string"
          ? body.client_name.slice(0, 200)
          : "Anonymous MCP Client",
    },
    {
      status: 201,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
