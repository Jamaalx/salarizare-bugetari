import { createHmac, createHash, randomBytes, timingSafeEqual } from "crypto";

/**
 * Secretul HMAC pentru codurile și token-urile OAuth. FĂRĂ valoare de rezervă:
 * un secret public (cum era înainte, în cod) permitea oricui să-și semneze
 * singur token-uri. Dacă OAUTH_SIGNING_SECRET lipsește sau e prea scurt,
 * OAuth e dezactivat: /oauth/* răspund 503 cu mesaj clar, metadatele nu mai
 * anunță un server de autorizare, iar /api/mcp rămâne public (anonim), ca
 * înainte — clienții existenți funcționează în continuare.
 */
const MIN_SECRET_LENGTH = 32;
function signingSecret(): string | null {
  const s = process.env.OAUTH_SIGNING_SECRET?.trim();
  return s && s.length >= MIN_SECRET_LENGTH ? s : null;
}

export function oauthEnabled(): boolean {
  return signingSecret() !== null;
}

export const OAUTH_DISABLED_MESSAGE =
  "OAuth este dezactivat pe acest server: OAUTH_SIGNING_SECRET lipsește sau are sub 32 de caractere. " +
  "Serverul MCP (/api/mcp) funcționează fără autentificare.";

/** Răspunsul standard al rutelor /oauth/* când OAuth e dezactivat. */
export function oauthDisabledResponse(): Response {
  return Response.json(
    { error: "temporarily_unavailable", error_description: OAUTH_DISABLED_MESSAGE },
    { status: 503, headers: { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" } },
  );
}

function requireSecret(): string {
  const s = signingSecret();
  if (!s) throw new Error(OAUTH_DISABLED_MESSAGE);
  return s;
}

/**
 * redirect_uri permise la /oauth/authorize și /oauth/register. Înainte era
 * acceptat orice URL https — combinat cu aprobarea automată, orice site primea
 * un cod valid (open redirect). Lista:
 *  - conectorul Claude (claude.ai / claude.com) și cel ChatGPT, URL exacte;
 *  - clienți locali (Claude Desktop/Code, MCP Inspector): http://localhost și
 *    http://127.0.0.1 pe orice port/cale — un site străin nu poate primi acolo;
 *  - OAUTH_REDIRECT_ALLOWLIST (opțional): URL-uri exacte suplimentare,
 *    separate prin virgulă.
 */
const REDIRECT_URIS_PERMISE = [
  "https://claude.ai/api/mcp/auth_callback",
  "https://claude.com/api/mcp/auth_callback",
  "https://chatgpt.com/connector_platform_oauth_redirect",
];

export function redirectUriPermis(uri: string): boolean {
  let u: URL;
  try {
    u = new URL(uri);
  } catch {
    return false;
  }
  if (u.username || u.password || u.hash) return false;
  if (u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1")) return true;
  if (u.protocol !== "https:") return false;
  const extra = (process.env.OAUTH_REDIRECT_ALLOWLIST ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const normal = `${u.origin}${u.pathname}`;
  return [...REDIRECT_URIS_PERMISE, ...extra].some((x) => x === uri || x === normal);
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function fromB64url(input: string): Buffer {
  return Buffer.from(input, "base64url");
}

export function signJwt(
  payload: Record<string, unknown>,
  lifetimeSec: number
): string {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + lifetimeSec };
  const h = b64url(JSON.stringify(header));
  const p = b64url(JSON.stringify(body));
  const sig = b64url(createHmac("sha256", requireSecret()).update(`${h}.${p}`).digest());
  return `${h}.${p}.${sig}`;
}

export function verifyJwt(token: string): Record<string, unknown> | null {
  const secret = signingSecret();
  if (!secret) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [h, p, s] = parts;
    const expected = createHmac("sha256", secret).update(`${h}.${p}`).digest();
    const got = fromB64url(s);
    if (expected.length !== got.length) return null;
    if (!timingSafeEqual(expected, got)) return null;
    const payload = JSON.parse(fromB64url(p).toString("utf-8"));
    if (
      typeof payload.exp === "number" &&
      payload.exp < Math.floor(Date.now() / 1000)
    )
      return null;
    return payload;
  } catch {
    return null;
  }
}

export function pkceVerify(verifier: string, challenge: string): boolean {
  const computed = b64url(createHash("sha256").update(verifier).digest());
  return computed === challenge;
}

export function randomId(bytes = 12): string {
  return b64url(randomBytes(bytes));
}

export function baseUrl(req: Request): string {
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    "salarii.romaniatransparenta.eu";
  return `${proto}://${host}`;
}
