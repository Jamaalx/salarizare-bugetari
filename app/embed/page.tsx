import type { Metadata } from "next";
import EmbedCalculator from "@/components/EmbedCalculator";
import { ATRIBUIRE_TEXT } from "@/lib/widget";

/**
 * Ruta pentru iframe-ul de pe alte site-uri (docs/WIDGET-EMBED.md). Nu e o pagină de citit singură: noindex
 * (și X-Robots-Tag din next.config.mjs), canonical spre prima pagină a calculatorului. Antetul și subsolul
 * site-ului nu se pun aici (components/ShellSite.tsx).
 */
export const metadata: Metadata = {
  title: ATRIBUIRE_TEXT,
  robots: { index: false, follow: true },
  alternates: { canonical: "/" },
};

export default function EmbedPage() {
  return <EmbedCalculator />;
}
