import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Calculator Salariu Bugetari — Proiect Lege 2026",
  description:
    "Calculator interactiv pentru noul sistem de salarizare al personalului plătit din fonduri publice (proiect MMFTSS, 25 mai 2026). Estimează salariul brut și net pe baza coeficienților 1–8.",
  keywords: [
    "salarizare bugetari",
    "calculator salariu",
    "proiect lege salarizare 2026",
    "coeficienti salarizare",
    "MMFTSS",
    "salariu functionar public",
  ],
  openGraph: {
    title: "Calculator Salariu Bugetari — Proiect Lege 2026",
    description:
      "Estimează cum se va modifica salariul tău cu noul proiect de lege a salarizării.",
    locale: "ro_RO",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <body>{children}</body>
    </html>
  );
}
