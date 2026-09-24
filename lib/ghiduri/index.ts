/**
 * Lista ghidurilor, cel mai nou primul. Un articol nou: fișier în lib/ghiduri/<slug>.ts care exportă
 * `ghid(): Ghid`, apoi o linie în FABRICI. Paginile, sitemap-ul, feed.xml și llms.txt se fac singure.
 */
import type { Ghid } from "./tip";
import { GRILE } from "../seo";
import { ghid as salariuAsistentMedical } from "./salariu-asistent-medical";
import { ghid as salariulDeBaza } from "./cum-se-calculeaza-salariul-de-baza";

const FABRICI: readonly (() => Ghid)[] = [
  salariuAsistentMedical,
  salariulDeBaza,
];

let cache: readonly Ghid[] | null = null;

/** toate ghidurile, validate, de la cel mai nou la cel mai vechi */
export function ghiduri(): readonly Ghid[] {
  if (cache) return cache;
  const lista = FABRICI.map((f) => f());
  const sluguri = new Set<string>();
  for (const g of lista) {
    const eroare = (m: string): never => {
      throw new Error(`ghidul ${g.slug}: ${m}`);
    };
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(g.slug)) eroare("slug invalid");
    if (sluguri.has(g.slug)) eroare("slug repetat");
    sluguri.add(g.slug);
    for (const d of [g.publicat, g.actualizat]) if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) eroare(`dată invalidă ${d}`);
    if (g.actualizat < g.publicat) eroare("actualizat înainte de publicat");
    const cuvinte = g.raspuns.split(/\s+/).filter(Boolean).length;
    if (cuvinte < 35 || cuvinte > 70) eroare(`răspunsul are ${cuvinte} de cuvinte (35–70)`);
    if (g.descriere.length < 100 || g.descriere.length > 175) eroare(`descrierea are ${g.descriere.length} de caractere (100–175)`);
    if (g.titluMeta.length > 70) eroare(`titlul meta are ${g.titluMeta.length} de caractere (max. 70)`);
    if (g.peScurt.length < 3 || g.peScurt.length > 6) eroare("„pe scurt” are nevoie de 3–6 puncte");
    if (g.faq.length < 3) eroare("cel puțin 3 întrebări frecvente");
    if (g.surse.length < 1 || g.surse.some((s) => !/^https?:\/\//.test(s.url))) eroare("fără surse sau sursă fără adresă");
    if (g.legaturi.length < 1) eroare("fără legături spre calculator sau grile");
    if (!/^## /m.test(g.corp)) eroare("fără titluri ## în text");
    for (const [, href] of g.corp.matchAll(/\]\(([^)\s]+)\)/g)) if (!href.startsWith("/") && !/^https?:\/\//.test(href)) eroare(`legătură invalidă ${href}`);
    if (/\b(NaN|undefined|null|Infinity)\b/.test(`${g.raspuns} ${g.corp} ${g.peScurt.join(" ")} ${g.faq.map((f) => f.a).join(" ")}`))
      eroare("text cu NaN/undefined/null: o cifră nu s-a calculat");
  }
  // legăturile interne trebuie să ducă la pagini care există
  const pagini = new Set(["/", "/grila", "/ghiduri", "/diplomatie", "/mcp", ...GRILE.map((x) => `/grila/${x.slug}`), ...lista.map((x) => `/ghiduri/${x.slug}`)]);
  for (const g of lista) {
    const interne = [...[...g.corp.matchAll(/\]\((\/[^)\s]*)\)/g)].map((m) => m[1]), ...g.legaturi.map(([h]) => h)];
    for (const h of interne) if (!pagini.has(h.replace(/#.*$/, ""))) throw new Error(`ghidul ${g.slug}: legătură internă spre o pagină care nu există: ${h}`);
  }
  cache = [...lista].sort((a, b) => b.publicat.localeCompare(a.publicat) || a.slug.localeCompare(b.slug));
  return cache;
}

export function ghidDupaSlug(slug: string): Ghid | null {
  return ghiduri().find((g) => g.slug === slug) ?? null;
}

export const cuvinte = (g: Ghid): number =>
  `${g.raspuns} ${g.corp} ${g.faq.map((f) => `${f.q} ${f.a}`).join(" ")}`.split(/\s+/).filter(Boolean).length;
