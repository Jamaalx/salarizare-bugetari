import { NextRequest, NextResponse } from "next/server";
import { randomId, oauthEnabled, oauthDisabledResponse, redirectUriPermis } from "@/lib/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!oauthEnabled()) return oauthDisabledResponse();
  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  // RFC 7591 §3.2.2: redirect_uris nepermise → invalid_redirect_uri.
  const redirectUris: string[] = Array.isArray(body.redirect_uris)
    ? body.redirect_uris.filter((u: unknown): u is string => typeof u === "string")
    : [];
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
      grant_types: ["authorization_code"],
      response_types: ["code"],
      scope: "mcp",
      client_name:
        typeof body.client_name === "string"
          ? body.client_name
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
