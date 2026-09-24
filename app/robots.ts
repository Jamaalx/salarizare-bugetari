import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// Boții de căutare și asistenții AI sunt primiți explicit; API-ul (inclusiv /api/mcp) și OAuth rămân în afara indexului.
const BOTI_AI = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "CCBot"];
const INTERZIS = ["/api/", "/oauth/"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: INTERZIS },
      { userAgent: BOTI_AI, allow: "/", disallow: INTERZIS },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
