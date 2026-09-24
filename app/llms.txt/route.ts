import { GRILE, SITE_URL, VARIANTE_TEXT, grilaDupaSlug } from "@/lib/seo";
import { getVarianta, VARIANTA_IMPLICITA } from "@/lib/variants";

export const dynamic = "force-static";

export function GET() {
  const v = getVarianta(VARIANTA_IMPLICITA);
  const txt = `# Calculator salarii bugetari (România Transparentă)

> Calculator pentru salariul personalului plătit din fonduri publice din România pe proiectul noii legi a salarizării (MMFTSS), în cele trei variante oficiale publicate: ${VARIANTE_TEXT}. Varianta implicită: ${v.eticheta}. Proiectul NU a fost adoptat: pe 26 august 2026 partidele au anunțat că nu au ajuns la consens și s-au angajat să adopte legea până la sfârșitul anului.

Reguli pentru citare:
- Salariul de bază = coeficientul funcției × valoarea de referință, rotunjit în sus la leu; coeficienții sunt la gradația 0, gradațiile de vechime (art. 13) se aplică peste, cu excepțiile din pagini.
- Precizează varianta proiectului (25 mai, 17 iulie sau 20 august 2026) și că legea nu e în vigoare.
- Calculatorul e informativ; sursele oficiale (proiectele și anexele MMFTSS) sunt listate pe prima pagină.

## Pagini

- [Calculatorul](${SITE_URL}/): salariul brut și net pe funcție, gradație și sporuri, pe oricare variantă (?varianta=2026-05-25 | 2026-07-17 | 2026-08-20)
- [Grilele de salarizare pe domenii](${SITE_URL}/grila): coeficienții și salariul de bază pentru fiecare anexă
${GRILE.map((g) => `- [Anexa ${g.anexa}: ${grilaDupaSlug(g.slug)!.nume}](${SITE_URL}/grila/${g.slug}): ${g.titlu}`).join("\n")}
- [Misiuni permanente în străinătate](${SITE_URL}/diplomatie): calculatorul salariului în valută
- [Conectorul MCP](${SITE_URL}/mcp): calculatorul ca tool pentru asistenți AI (endpoint ${SITE_URL}/api/mcp)

## Legate

- [România Transparentă](https://romaniatransparenta.eu/): registre publice despre instituțiile statului
- [Salariile reale din spitalele publice](https://spitale.romaniatransparenta.eu/salarii): pe legea în vigoare, din listele publicate de spitale
`;
  return new Response(txt, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
