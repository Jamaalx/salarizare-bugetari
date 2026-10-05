import { NextResponse, type NextRequest } from "next/server";

/**
 * Subdomeniile vechi ale calculatorului (salarii.romaniatransparenta.eu, salarizare.zed-zen.com).
 *
 * Calculatorul stă acum pe site: romaniatransparenta.eu/registre/salarii/… (basePath în next.config.mjs). Pe
 * subdomenii, adresele vechi fără prefix („/", „/grila/cultura"):
 *  - cu SALARII_REDIRECT=1 → 301 spre adresa de pe site, cu aceeași cale și aceiași parametri;
 *  - altfel (implicit) → servite ca înainte (rescrise intern sub prefix), cu antetul propriu al aplicației.
 * Nu se redirecționează niciodată /api, /mcp, /oauth și /.well-known: conectorii MCP deja înregistrați (Claude,
 * ChatGPT) și descoperirea OAuth lucrează pe subdomeniu.
 *
 * Variabilele se citesc la fiecare cerere (middleware pe runtime-ul Node), deci comutarea cere doar o repornire.
 */
export const config = { runtime: "nodejs" };

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const lista = (v: string | undefined, implicit: string) =>
  (v ?? implicit).split(",").map((h) => h.trim().toLowerCase()).filter(Boolean);

/** căile care rămân pe subdomeniu chiar și după comutare */
const PASTRATE = /^\/(api|mcp|oauth|\.well-known)(\/|$)/;

export function middleware(req: NextRequest) {
  // calea fără prefix: „/registre/salarii/grila" și „/grila" sunt aceeași pagină
  const url = req.nextUrl;
  const brut = url.pathname;
  const cuPrefix = brut === BASE || brut.startsWith(`${BASE}/`);
  const cale = cuPrefix ? brut.slice(BASE.length) || "/" : brut;
  const subPrefix = () => NextResponse.rewrite(new URL(`${BASE}${cale === "/" ? "" : cale}${url.search}`, req.url));

  // serverul MCP, OAuth-ul și pagina /mcp: la adresele vechi pe orice gazdă, fără redirecționare
  if (PASTRATE.test(cale)) return cuPrefix ? NextResponse.next() : subPrefix();

  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "").split(",")[0].trim().split(":")[0].toLowerCase();
  const gazdeVechi = lista(process.env.SALARII_HOSTS, "salarii.romaniatransparenta.eu,salarizare.zed-zen.com");
  if (!gazdeVechi.includes(host)) return NextResponse.next();

  if (process.env.SALARII_REDIRECT === "1") {
    const site = (process.env.SALARII_SITE_URL ?? `https://romaniatransparenta.eu${BASE}`).replace(/\/+$/, "");
    return NextResponse.redirect(`${site}${cale}${url.search}`, 301);
  }

  // http → https (Cloudflare trimite schema cererii originale în CF-Visitor), ca înainte
  if (/"scheme":"http"/.test(req.headers.get("cf-visitor") ?? "")) {
    return NextResponse.redirect(`https://${host}${brut}${url.search}`, 301);
  }
  return cuPrefix ? NextResponse.next() : subPrefix();
}
