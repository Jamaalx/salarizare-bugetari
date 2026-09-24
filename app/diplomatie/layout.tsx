import type { Metadata } from "next";
import { OG_IMAGE, SITE_URL } from "@/lib/seo";

const title = "Calculator salariu misiune permanentă în străinătate (diplomație)";
const description =
  "Calculează salariul în valută al personalului din misiunile diplomatice și oficiile consulare ale României, pe funcție și baza de calcul a țării, conform proiectului legii salarizării 2026.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/diplomatie" },
  openGraph: { title, description, url: `${SITE_URL}/diplomatie`, siteName: "România Transparentă", locale: "ro_RO", type: "website", images: [{ url: OG_IMAGE, width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
