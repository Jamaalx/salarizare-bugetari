import type { Metadata, Viewport } from "next";
import "./globals.css";
import { cale } from "@/lib/shell";
import { AntetSite, SubsolSite } from "@/components/ShellSite";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(`${SITE_URL}/`),
  title: "Calculator Salariu Bugetari 2026 — noua lege a salarizării",
  description:
    "Calculează salariul brut și net pe noua lege a salarizării bugetarilor, în cele trei variante ale proiectului MMFTSS (25 mai, 17 iulie, 20 august 2026).",
  keywords: [
    "salarizare bugetari",
    "calculator salariu",
    "proiect lege salarizare 2026",
    "coeficienti salarizare",
    "MMFTSS",
    "salariu functionar public",
  ],
  openGraph: {
    title: "Calculator Salariu Bugetari — România Transparentă",
    description:
      "Estimează cum se va modifica salariul tău cu noul proiect de lege a salarizării.",
    siteName: "România Transparentă",
    url: `${SITE_URL}/`,
    locale: "ro_RO",
    type: "website",
    images: [{ url: "https://romaniatransparenta.eu/og-image.png", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: cale("/favicon.ico"), sizes: "48x48" },
      { url: cale("/favicon.svg"), type: "image/svg+xml" },
    ],
    apple: cale("/apple-touch-icon.png"),
  },
  manifest: cale("/site.webmanifest"),
};

export const viewport: Viewport = { themeColor: "#0A2257" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <body>
        {/* antetul și subsolul site-ului România Transparentă, puse de nginx prin SSI (vezi lib/shell.ts) */}
        <AntetSite />
        {children}
        <SubsolSite />
      </body>
    </html>
  );
}
