/**
 * Calculatorul pus pe alte site-uri (widget): adresele, parametrii și codul de copiat.
 * Specificația: docs/WIDGET-EMBED.md. Fișier fără importuri, ca testele (node:test) să-l citească direct.
 *
 * Politica Google de link spam interzice linkurile „keyword-rich, hidden or low-quality" din widgeturi
 * (developers.google.com/search/docs/essentials/spam-policies). De aceea:
 *  - linkul de atribuire are textul brandului, exact ATRIBUIRE_TEXT, fără cuvinte cheie;
 *  - linkul e vizibil, sub widget, în codul pe care îl copiază gazda (nu ascuns în iframe sau în script);
 *  - gazda poate adăuga rel="nofollow" din generator; REL_IMPLICIT e decizia de pornire.
 */

/** adresa publică a calculatorului; aceeași ca SITE_URL din lib/seo.ts */
export const WIDGET_SITE = "https://romaniatransparenta.eu/registre/salarii";
/** calea rutei embed (fără prefixul basePath) */
export const CALE_EMBED = "/embed";
/** scriptul care inserează iframe-ul și îi potrivește înălțimea */
export const CALE_SCRIPT = "/embed.js";
/** pagina publică „Pune calculatorul pe site-ul tău" */
export const CALE_PAGINA = "/widget";

/** textul exact al linkului de atribuire: brandul, nimic altceva */
export const ATRIBUIRE_TEXT = "Calculator salarii — România Transparentă";
/** ținta linkului de atribuire: prima pagină a calculatorului, cu sursa marcată pentru statistici */
export const ATRIBUIRE_URL = `${WIDGET_SITE}/?utm_source=widget&utm_medium=embed`;
/** rel-ul implicit al linkului din codul copiat; "" = link de brand obișnuit, "nofollow" = fără transfer */
export const REL_IMPLICIT: Rel = "";

/** tipul mesajului postMessage cu înălțimea conținutului */
export const MESAJ_INALTIME = "rt-salarii:inaltime";

export const MODURI = ["ghidat", "expert"] as const;
export type Mod = (typeof MODURI)[number];
export type Rel = "" | "nofollow";

export const INALTIME_MIN = 480;
export const INALTIME_MAX = 4000;
export const INALTIME_IMPLICITA = 900;

export type OptiuniWidget = {
  /** id-ul variantei proiectului (data ISO); gol = varianta implicită a calculatorului */
  varianta?: string;
  mod?: Mod;
  /** înălțimea inițială a iframe-ului, în px; scriptul o ajustează după conținut */
  inaltime?: number;
  rel?: Rel;
};

const ID_VARIANTA = /^\d{4}-\d{2}-\d{2}$/;

/** parametrii rutei embed, din query string; orice valoare necunoscută cade pe implicit */
export function parametriEmbed(q: URLSearchParams | string): { varianta: string | null; mod: Mod } {
  const p = typeof q === "string" ? new URLSearchParams(q) : q;
  const v = p.get("varianta");
  const m = p.get("mod");
  return {
    varianta: v && ID_VARIANTA.test(v) ? v : null,
    mod: (MODURI as readonly string[]).includes(m ?? "") ? (m as Mod) : "ghidat",
  };
}

export function limitareInaltime(h: unknown): number {
  const n = typeof h === "number" ? h : Number(h);
  if (!Number.isFinite(n)) return INALTIME_IMPLICITA;
  return Math.round(Math.min(INALTIME_MAX, Math.max(INALTIME_MIN, n)));
}

/** adresa iframe-ului, cu parametrii aleși */
export function urlEmbed(o: OptiuniWidget = {}, site = WIDGET_SITE): string {
  const q = new URLSearchParams();
  if (o.varianta && ID_VARIANTA.test(o.varianta)) q.set("varianta", o.varianta);
  if (o.mod && o.mod !== "ghidat") q.set("mod", o.mod);
  const s = q.toString();
  return `${site}${CALE_EMBED}${s ? `?${s}` : ""}`;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** paragraful de atribuire de sub widget: vizibil, cu textul brandului */
export function atribuireHtml(rel: Rel = REL_IMPLICIT): string {
  const r = ["noopener", rel].filter(Boolean).join(" ");
  return `<p style="margin:6px 0 0;font:13px/1.4 system-ui,sans-serif">` +
    `<a href="${esc(ATRIBUIRE_URL)}" target="_blank" rel="${r}">${esc(ATRIBUIRE_TEXT)}</a></p>`;
}

/** codul cu iframe simplu: merge pe orice site, fără JavaScript; înălțimea rămâne fixă */
export function codIframe(o: OptiuniWidget = {}, site = WIDGET_SITE): string {
  const h = limitareInaltime(o.inaltime ?? INALTIME_IMPLICITA);
  return `<iframe src="${esc(urlEmbed(o, site))}" title="${esc(ATRIBUIRE_TEXT)}" ` +
    `width="100%" height="${h}" style="border:0;width:100%;max-width:960px" loading="lazy" ` +
    `referrerpolicy="strict-origin-when-cross-origin"></iframe>\n` + atribuireHtml(o.rel ?? REL_IMPLICIT);
}

/** codul cu script: scriptul pune iframe-ul în <div> și îi potrivește înălțimea după conținut */
export function codScript(o: OptiuniWidget = {}, site = WIDGET_SITE): string {
  const attrs = [`data-rt-salarii`];
  if (o.varianta && ID_VARIANTA.test(o.varianta)) attrs.push(`data-varianta="${esc(o.varianta)}"`);
  if (o.mod && o.mod !== "ghidat") attrs.push(`data-mod="${esc(o.mod)}"`);
  if (o.inaltime) attrs.push(`data-inaltime="${limitareInaltime(o.inaltime)}"`);
  return `<div ${attrs.join(" ")}></div>\n` + atribuireHtml(o.rel ?? REL_IMPLICIT) + "\n" +
    `<script src="${esc(site + CALE_SCRIPT)}" async></script>`;
}

/**
 * Linkul pe care butonul „Trimite linkul" îl dă mai departe: în widget, prima pagină a calculatorului
 * (ruta embed nu e pentru citit singură și are noindex); altfel, adresa curentă.
 */
export function linkPartajare(loc: { href: string; pathname: string; search: string }, site = WIDGET_SITE): string {
  if (!/\/embed\/?$/.test(loc.pathname)) return loc.href;
  const { varianta } = parametriEmbed(loc.search);
  return `${site}/${varianta ? `?varianta=${varianta}` : ""}`;
}
