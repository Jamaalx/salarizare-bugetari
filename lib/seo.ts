/**
 * SEO: adresa publică, paginile de grilă pe anexe (slug ↔ anexă) și datele structurate.
 * Tot ce apare aici vine din datele variantelor (data/variants) — nicio cifră scrisă de mână.
 */
import { ANEXE, VARIANTE, VARIANTA_IMPLICITA, getVarianta, type Varianta } from "./variants";
import { getFunctii, type CoefEntry } from "./variants-data";
import { aplicaGradatie } from "./tax";

export const SITE_URL = "https://salarii.romaniatransparenta.eu";
export const OG_IMAGE = "https://romaniatransparenta.eu/og-image.png";
export const RT_ORGANIZATIE = {
  "@type": "Organization",
  "@id": "https://romaniatransparenta.eu/#organizatie",
  name: "România Transparentă",
  url: "https://romaniatransparenta.eu/",
} as const;

/** adresele paginilor de grilă: /grila/<slug> */
export const GRILE: { anexa: string; slug: string; titlu: string }[] = [
  { anexa: "I", slug: "invatamant-cercetare", titlu: "profesori, educatori și cercetători" },
  { anexa: "II", slug: "sanatate-asistenta-sociala", titlu: "medici, asistenți medicali și asistență socială" },
  { anexa: "III", slug: "cultura", titlu: "cultură (biblioteci, muzee, teatre)" },
  { anexa: "IV", slug: "diplomatie", titlu: "diplomație" },
  { anexa: "V", slug: "justitie", titlu: "justiție (judecători, procurori, grefieri)" },
  { anexa: "VI", slug: "aparare-ordine-publica", titlu: "militari, polițiști și penitenciare" },
  { anexa: "VII", slug: "institutii-venituri-proprii", titlu: "instituții finanțate din venituri proprii" },
  { anexa: "VIII", slug: "administratie", titlu: "administrație publică (funcționari, personal contractual)" },
  { anexa: "IX", slug: "demnitate-publica", titlu: "funcții de demnitate publică" },
];

export function grilaDupaSlug(slug: string) {
  const g = GRILE.find((x) => x.slug === slug);
  if (!g) return null;
  const a = ANEXE.find((x) => x.anexa === g.anexa)!;
  return { ...g, nume: a.nume, desc: a.desc };
}

/** salariul de bază la gradația 0 = coeficient × valoarea de referință, rotunjit în sus (art. 7 lit. i) */
export function salariuBaza(e: CoefEntry, v: Varianta): number {
  return aplicaGradatie(e.coeficient * v.valoareReferinta, 0);
}

export function randuriAnexa(anexa: string, id = VARIANTA_IMPLICITA): CoefEntry[] {
  return getFunctii(id).filter((e) => e.anexa === anexa && e.coeficient > 0);
}

export function intervalAnexa(anexa: string, id = VARIANTA_IMPLICITA) {
  const v = getVarianta(id);
  const r = randuriAnexa(anexa, id);
  if (!r.length) return null;
  const s = r.map((e) => salariuBaza(e, v));
  return { n: r.length, min: Math.min(...s), max: Math.max(...s), v };
}

export const lei = (n: number) => `${n.toLocaleString("ro-RO")} lei`;

/** „de" după numerale: 19 funcții, 20 de funcții, 149 de funcții, 101 funcții */
export const de = (n: number) => (n % 100 === 0 || n % 100 >= 20 ? " de" : "");

export function jsonLd(o: Record<string, unknown>): { __html: string } {
  return { __html: JSON.stringify({ "@context": "https://schema.org", ...o }).replace(/</g, "\\u003c") };
}

export function breadcrumbLd(items: [string, string][]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: `${SITE_URL}${path}` })),
  };
}

export const VARIANTE_TEXT = VARIANTE.map((v) => `${v.eticheta} (valoarea de referință ${v.valoareReferinta.toLocaleString("ro-RO")} lei)`).join(", ");
