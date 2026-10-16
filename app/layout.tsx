import type { Metadata, Viewport } from "next";
import "./globals.css";
import { cale } from "@/lib/shell";
import { AntetSite, SubsolSite } from "@/components/ShellSite";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(`${SITE_URL}/`),
  // Titlul și descrierea urmează căutările reale din Search Console (16.10.2026): „calculator salarii invatamant 2026”,
  // „calculator salariu”, „… profesor”, „… sanatate”, „… medici” — poziția 8–9 cu CTR aproape 0 pe vechiul titlu.
  title: "Calculator salariu bugetari 2026: învățământ, sănătate",
  description:
    "Calculează gratuit salariul brut și net pe noua lege a salarizării: profesori, medici, asistenți, funcționari, militari. Toate cele 3 variante ale proiectului.",
  keywords: [
    "salarizare bugetari",
    "calculator salariu",
    "proiect lege salarizare 2026",
    "coeficienti salarizare",
    "MMFTSS",
    "salariu functionar public",
  ],
  openGraph: {
    title: "Calculator salariu bugetari 2026: învățământ, sănătate",
    description:
      "Salariul brut și net pe noua lege a salarizării, pentru profesori, medici, asistenți, funcționari și militari. Gratuit.",
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
