import { SITE_URL } from "@/lib/seo";
import { ghiduri } from "@/lib/ghiduri";

export const dynamic = "force-static";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const rfc = (d: string) => new Date(`${d}T08:00:00Z`).toUTCString();

/** RSS 2.0 cu toate ghidurile */
export function GET() {
  const G = ghiduri();
  const ultima = G.map((g) => g.actualizat).sort().at(-1) ?? "2026-09-24";
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Ghiduri despre salarizarea bugetarilor — România Transparentă</title>
  <link>${SITE_URL}/ghiduri</link>
  <atom:link href="${SITE_URL}/ghiduri/feed.xml" rel="self" type="application/rss+xml"/>
  <description>Ghiduri pe datele proiectului noii legi a salarizării.</description>
  <language>ro</language>
  <lastBuildDate>${rfc(ultima)}</lastBuildDate>
${G.map(
  (g) => `  <item>
    <title>${esc(g.titlu)}</title>
    <link>${SITE_URL}/ghiduri/${g.slug}</link>
    <guid isPermaLink="true">${SITE_URL}/ghiduri/${g.slug}</guid>
    <pubDate>${rfc(g.publicat)}</pubDate>
    <category>${esc(g.categorie)}</category>
    <description>${esc(g.raspuns)}</description>
  </item>`,
).join("\n")}
</channel>
</rss>
`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
