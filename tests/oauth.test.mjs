// Teste pentru lib/oauth.ts (OAuth-ul serverului MCP): redirect_uri permise, semnarea și
// verificarea token-urilor (expirare, epocă, secret), PKCE S256 și adresa publică (Host falsificat).
// Rulare: npm test. lib/oauth.ts importă „./rate-limit” fără extensie, ca în Next; hook-ul de mai jos
// adaugă „.ts” doar pentru importurile relative din lib/.
import { test } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { createHmac } from "node:crypto";

register(
  "data:text/javascript," +
    encodeURIComponent(`
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
export async function resolve(spec, ctx, next) {
  if (/^\\.\\.?\\//.test(spec) && !/\\.[cm]?[jt]s$/.test(spec) && ctx.parentURL?.includes("/lib/")) {
    const u = new URL(spec + ".ts", ctx.parentURL);
    if (existsSync(fileURLToPath(u))) return next(u.href, ctx);
  }
  return next(spec, ctx);
}`),
);

const SECRET = "s".repeat(40);
process.env.OAUTH_SIGNING_SECRET = SECRET;
delete process.env.OAUTH_TOKEN_EPOCH;
delete process.env.OAUTH_REDIRECT_ALLOWLIST;

const { redirectUriPermis, signJwt, verifyJwt, pkceVerify, oauthEnabled, baseUrl, tokenEpoch } =
  await import("../lib/oauth.ts");

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const semneaza = (header, body, secret = SECRET) => {
  const h = b64(header);
  const p = b64(body);
  return `${h}.${p}.${createHmac("sha256", secret).update(`${h}.${p}`).digest("base64url")}`;
};
const acum = () => Math.floor(Date.now() / 1000);

test("redirect_uri: doar conectorii cunoscuți și clienții locali", () => {
  assert.equal(redirectUriPermis("https://claude.ai/api/mcp/auth_callback"), true);
  assert.equal(redirectUriPermis("https://chatgpt.com/connector_platform_oauth_redirect"), true);
  assert.equal(redirectUriPermis("http://localhost:6274/oauth/callback"), true);
  assert.equal(redirectUriPermis("http://127.0.0.1:33418/callback"), true);

  assert.equal(redirectUriPermis("https://evil.example/api/mcp/auth_callback"), false);
  assert.equal(redirectUriPermis("http://claude.ai/api/mcp/auth_callback"), false);
  assert.equal(redirectUriPermis("https://claude.ai/api/mcp/alta_cale"), false);
  assert.equal(redirectUriPermis("https://claude.ai.evil.example/api/mcp/auth_callback"), false);
  assert.equal(redirectUriPermis("https://user:pw@claude.ai/api/mcp/auth_callback"), false);
  assert.equal(redirectUriPermis("https://claude.ai/api/mcp/auth_callback#x"), false);
  assert.equal(redirectUriPermis("http://localhost.evil.example/cb"), false);
  assert.equal(redirectUriPermis("javascript:alert(1)"), false);
  assert.equal(redirectUriPermis("nu e url"), false);
});

test("redirect_uri: OAUTH_REDIRECT_ALLOWLIST adaugă URL-uri exacte", () => {
  process.env.OAUTH_REDIRECT_ALLOWLIST = "https://client.example/cb, https://altul.example/x";
  try {
    assert.equal(redirectUriPermis("https://client.example/cb"), true);
    assert.equal(redirectUriPermis("https://client.example/cb2"), false);
  } finally {
    delete process.env.OAUTH_REDIRECT_ALLOWLIST;
  }
});

test("token: semnat de noi trece, cu typ, cid, epocă și exp", () => {
  const t = signJwt({ typ: "access", cid: "c1" }, 3600);
  const p = verifyJwt(t);
  assert.equal(p.typ, "access");
  assert.equal(p.cid, "c1");
  assert.equal(p.ep, tokenEpoch());
  assert.ok(p.exp > acum() && p.exp <= acum() + 3600);
});

test("token: semnătură greșită, payload schimbat sau alt secret → null", () => {
  const t = signJwt({ typ: "access", cid: "c1" }, 3600);
  const [h, , s] = t.split(".");
  assert.equal(verifyJwt(`${h}.${b64({ typ: "access", cid: "atacator", ep: 1, exp: acum() + 60 })}.${s}`), null);
  assert.equal(verifyJwt(t.slice(0, -2) + (t.endsWith("AA") ? "BB" : "AA")), null);
  assert.equal(verifyJwt(semneaza({ alg: "HS256" }, { typ: "access", cid: "c", ep: 1, exp: acum() + 60 }, "alt-secret".repeat(4))), null);
  assert.equal(verifyJwt("a.b"), null);
  assert.equal(verifyJwt(""), null);
});

test("token: expirat sau fără exp → null", () => {
  assert.equal(verifyJwt(semneaza({ alg: "HS256" }, { typ: "access", cid: "c", ep: 1, exp: acum() - 1 })), null);
  assert.equal(verifyJwt(semneaza({ alg: "HS256" }, { typ: "access", cid: "c", ep: 1 })), null);
  assert.equal(verifyJwt(semneaza({ alg: "HS256" }, { typ: "access", cid: "c", ep: 1, exp: String(acum() + 60) })), null);
});

test("token: epoca crescută retrage token-urile vechi; cele fără epocă sunt refuzate", () => {
  const vechi = signJwt({ typ: "refresh", cid: "c1" }, 3600);
  assert.equal(verifyJwt(semneaza({ alg: "HS256" }, { typ: "access", cid: "c", exp: acum() + 60 })), null);
  process.env.OAUTH_TOKEN_EPOCH = "2";
  try {
    assert.equal(verifyJwt(vechi), null);
    assert.ok(verifyJwt(signJwt({ typ: "refresh", cid: "c1" }, 3600)));
  } finally {
    delete process.env.OAUTH_TOKEN_EPOCH;
  }
});

test("secret lipsă sau sub 32 de caractere: OAuth oprit, nimic nu se verifică", () => {
  const t = signJwt({ typ: "access", cid: "c1" }, 3600);
  for (const v of [undefined, "scurt", "x".repeat(31)]) {
    if (v === undefined) delete process.env.OAUTH_SIGNING_SECRET;
    else process.env.OAUTH_SIGNING_SECRET = v;
    try {
      assert.equal(oauthEnabled(), false);
      assert.equal(verifyJwt(t), null);
      assert.throws(() => signJwt({ typ: "access" }, 60));
    } finally {
      process.env.OAUTH_SIGNING_SECRET = SECRET;
    }
  }
});

test("PKCE S256: vectorul din RFC 7636 (anexa B)", () => {
  const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
  assert.equal(pkceVerify(verifier, "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"), true);
  assert.equal(pkceVerify(verifier + "x", "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"), false);
  // metoda „plain” nu e acceptată: verifier == challenge nu trece
  assert.equal(pkceVerify(verifier, verifier), false);
});

test("adresa publică: Host falsificat nu ajunge în metadate (producție)", () => {
  const env0 = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  delete process.env.PUBLIC_HOSTS;
  delete process.env.PUBLIC_BASE_URL;
  try {
    const r = (h) => new Request("http://x/", { headers: h });
    assert.equal(baseUrl(r({ host: "salarizare.zed-zen.com" })), "https://salarizare.zed-zen.com");
    assert.equal(baseUrl(r({ host: "evil.example" })), "https://salarii.romaniatransparenta.eu");
    assert.equal(baseUrl(r({ host: "salarizare.zed-zen.com", "x-forwarded-host": "evil.example" })), "https://salarii.romaniatransparenta.eu");
  } finally {
    process.env.NODE_ENV = env0;
  }
});
