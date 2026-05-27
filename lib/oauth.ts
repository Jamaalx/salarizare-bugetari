import { createHmac, createHash, randomBytes, timingSafeEqual } from "crypto";

const SECRET =
  process.env.OAUTH_SIGNING_SECRET ||
  "anonymous-mcp-dev-only-fallback-secret-replace-via-env";

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
  const sig = b64url(createHmac("sha256", SECRET).update(`${h}.${p}`).digest());
  return `${h}.${p}.${sig}`;
}

export function verifyJwt(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [h, p, s] = parts;
    const expected = createHmac("sha256", SECRET).update(`${h}.${p}`).digest();
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
    "salarizare.zed-zen.com";
  return `${proto}://${host}`;
}
