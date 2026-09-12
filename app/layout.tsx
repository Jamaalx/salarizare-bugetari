import type { Metadata } from "next";
import "./globals.css";
import BaraPlatforma from "@/components/BaraPlatforma";

export const metadata: Metadata = {
  metadataBase: new URL("https://salarii.romaniatransparenta.eu"),
  alternates: { canonical: "/" },
  title: "Calculator Salariu Bugetari — România Transparentă",
  description:
    "Calculator interactiv pentru noul sistem de salarizare al personalului plătit din fonduri publice — cele trei variante ale proiectului MMFTSS (25 mai, 17 iulie, 20 august 2026). Estimează salariul brut și net pe baza coeficienților 1–8.",
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
  },
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
