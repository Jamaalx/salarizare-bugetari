import type { Metadata } from "next";
import "./globals.css";
import BaraPlatforma from "@/components/BaraPlatforma";

export const metadata: Metadata = {
  metadataBase: new URL("https://salarii.romaniatransparenta.eu"),
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
    url: "https://salarii.romaniatransparenta.eu",
    locale: "ro_RO",
    type: "website",
    images: [{ url: "https://romaniatransparenta.eu/og-image.png", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <body>
        <BaraPlatforma />
        {children}
      </body>
    </html>
  );
}
