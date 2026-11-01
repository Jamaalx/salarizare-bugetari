import { NextRequest, NextResponse } from "next/server";
import { signJwt, verifyJwt, pkceVerify, oauthEnabled, oauthDisabledResponse, oauthRateLimited } from "@/lib/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "no-store",
};

export async function POST(req: NextRequest) {
  if (!oauthEnabled()) return oauthDisabledResponse();
  const limitat = oauthRateLimited(req, "token");
  if (limitat) return limitat;
  const ct = req.headers.get("content-type") || "";
  let params: URLSearchParams;
  if (ct.includes("application/x-www-form-urlencoded")) {
    params = new URLSearchParams(await req.text());
  } else if (ct.includes("application/json")) {
    const body: unknown = await req.json().catch(() => null);
    params = new URLSearchParams();
    // „null”, un număr sau un array ca body JSON aruncau în Object.entries → 500.
    const obj = body && typeof body === "object" && !Array.isArray(body) ? body : {};
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === "string") params.set(k, v);
    }
  } else {
    return NextResponse.json(
      {
        error: "invalid_request",
        error_description: "unsupported content-type",
      },
      { status: 400, headers: CORS }
    );
  }

  const grant_type = params.get("grant_type");
  if (grant_type !== "authorization_code") {
    return NextResponse.json(
      { error: "unsupported_grant_type" },
      { status: 400, headers: CORS }
    );
  }
  const code = params.get("code");
  const code_verifier = params.get("code_verifier");
  const redirect_uri = params.get("redirect_uri");

  if (!code) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "missing code" },
      { status: 400, headers: CORS }
    );
  }

  const payload = verifyJwt(code);
  if (!payload || payload.typ !== "code") {
    return NextResponse.json(
      { error: "invalid_grant", error_description: "code invalid or expired" },
      { status: 400, headers: CORS }
    );
  }

  // client_id e opțional în cerere (clienți publici), dar dacă e trimis
  // trebuie să fie cel căruia i s-a emis codul (RFC 6749 §4.1.3).
  const client_id = params.get("client_id");
  if (client_id && payload.cid !== client_id) {
    return NextResponse.json(
      { error: "invalid_grant", error_description: "client_id mismatch" },
      { status: 400, headers: CORS }
    );
  }

  if (payload.rdr && redirect_uri && payload.rdr !== redirect_uri) {
    return NextResponse.json(
      { error: "invalid_grant", error_description: "redirect_uri mismatch" },
      { status: 400, headers: CORS }
    );
  }

  // Codurile fără code_challenge nu mai sunt emise (authorize cere PKCE);
  // unul vechi, emis înainte de schimbare, expiră în 10 minute — îl refuzăm.
  if (typeof payload.cc !== "string" || !payload.cc) {
    return NextResponse.json(
      { error: "invalid_grant", error_description: "code emis fără PKCE" },
      { status: 400, headers: CORS }
    );
  }
  if (!code_verifier) {
    return NextResponse.json(
      {
        error: "invalid_grant",
        error_description: "missing code_verifier",
      },
      { status: 400, headers: CORS }
    );
  }
  if (!pkceVerify(code_verifier, payload.cc)) {
    return NextResponse.json(
      {
        error: "invalid_grant",
        error_description: "code_verifier mismatch",
      },
      { status: 400, headers: CORS }
    );
  }

  const ONE_YEAR = 60 * 60 * 24 * 365;
  const access_token = signJwt(
    { typ: "access", cid: payload.cid },
    ONE_YEAR
  );

  return NextResponse.json(
    {
      access_token,
      token_type: "Bearer",
      expires_in: ONE_YEAR,
      scope: "mcp",
    },
    { headers: CORS }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
