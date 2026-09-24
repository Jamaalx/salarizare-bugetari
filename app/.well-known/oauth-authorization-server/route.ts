import { NextRequest, NextResponse } from "next/server";
import { baseUrl, oauthEnabled, OAUTH_DISABLED_MESSAGE } from "@/lib/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // OAuth dezactivat (fără OAUTH_SIGNING_SECRET): nu anunțăm un server de
  // autorizare care n-ar funcționa — clienții MCP folosesc /api/mcp anonim.
  if (!oauthEnabled()) {
    return NextResponse.json(
      { error: "not_found", error_description: OAUTH_DISABLED_MESSAGE },
      { status: 404, headers: { "Access-Control-Allow-Origin": "*" } },
    );
  }
  const base = baseUrl(req);
  return NextResponse.json(
    {
      issuer: base,
      authorization_endpoint: `${base}/oauth/authorize`,
      token_endpoint: `${base}/oauth/token`,
      registration_endpoint: `${base}/oauth/register`,
      scopes_supported: ["mcp"],
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
    },
    { headers: { "Access-Control-Allow-Origin": "*" } }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
