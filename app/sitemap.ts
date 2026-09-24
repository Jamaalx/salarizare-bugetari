import type { MetadataRoute } from "next";
import { GRILE, SITE_URL } from "@/lib/seo";
import { VARIANTE } from "@/lib/variants";

/** data ultimei variante publicate: se schimbă doar când apare o variantă nouă, nu la fiecare deploy */
const ULTIMA = VARIANTE.map((v) => v.data).sort().at(-1)!;

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, lastModified: ULTIMA, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/grila`, lastModified: ULTIMA, changeFrequency: "monthly", priority: 0.8 },
    ...GRILE.map((g) => ({ url: `${SITE_URL}/grila/${g.slug}`, lastModified: ULTIMA, changeFrequency: "monthly" as const, priority: 0.8 })),
    { url: `${SITE_URL}/diplomatie`, lastModified: ULTIMA, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/mcp`, lastModified: ULTIMA, changeFrequency: "monthly", priority: 0.3 },
  ];
}
