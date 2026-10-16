import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import GeneratorWidget from "@/components/GeneratorWidget";
import { RT_ORGANIZATIE, SITE_URL, breadcrumbLd, jsonLd } from "@/lib/seo";
import { ATRIBUIRE_TEXT } from "@/lib/widget";

export const metadata: Metadata = {
  title: "Pune calculatorul de salarii pe site-ul tău",
  description:
    "Cod gratuit de copiat: calculatorul de salarii pentru bugetari (toate cele 3 variante ale proiectului) pe site-ul sindicatului, școlii sau al asociației tale.",
  alternates: { canonical: "/widget" },
};

export default function WidgetPage() {
  return (
    <main className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd({
          "@graph": [
            {
              "@type": "WebPage",
              "@id": `${SITE_URL}/widget#pagina`,
              name: "Pune calculatorul de salarii pe site-ul tău",
              url: `${SITE_URL}/widget`,
              inLanguage: "ro",
              publisher: RT_ORGANIZATIE,
            },
            breadcrumbLd([
              ["Calculator salariu bugetari", "/"],
              ["Pune calculatorul pe site-ul tău", "/widget"],
            ]),
          ],
        })}
      />
      <section className="bg-rt-navy text-white">
        <div className="mx-auto max-w-5xl px-4 py-8 md:py-12">
          <nav aria-label="Firul paginii" className="mb-4 text-sm">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link href="/" className="font-medium text-white underline underline-offset-[3px] hover:text-rt-yellow">
                  Salarii
                </Link>
              </li>
              <li className="flex items-center gap-1.5 text-white/90">
                <ChevronRight className="w-4 h-4 opacity-70" aria-hidden="true" />
                <span aria-current="page">Pune calculatorul pe site-ul tău</span>
              </li>
            </ol>
          </nav>
          <h1 className="text-3xl md:text-4xl font-black tracking-[-0.015em]">Pune calculatorul pe site-ul tău</h1>
          <p className="mt-3 max-w-2xl text-sm md:text-base text-white/90 leading-relaxed">
            Sindicat, școală, spital, primărie sau asociație: membrii tăi pot calcula salariul pe noua lege direct pe
            site-ul vostru, pe oricare dintre cele trei variante publicate ale proiectului. Gratuit, fără reclame, fără
            cookie-uri și fără cont. Când apare o variantă nouă, widgetul se actualizează singur.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10">
        <h2 className="text-xl font-bold text-slate-900">1. Alege și copiază codul</h2>
        <p className="mt-1 mb-5 text-sm text-slate-600">
          Lipește codul în pagina ta, într-un bloc HTML (WordPress: blocul „HTML personalizat”). Varianta cu script își
          potrivește singură înălțimea; varianta cu iframe merge și unde JavaScript-ul extern nu e permis.
        </p>
        <GeneratorWidget />
      </section>

      <section className="border-t bg-white">
        <div className="mx-auto max-w-3xl px-4 py-10 text-sm text-slate-700 leading-relaxed space-y-4">
          <h2 className="text-xl font-bold text-slate-900">2. Condiții de folosire</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              Folosirea e gratuită, pe orice site, inclusiv comercial. Nu cerem înregistrare și nu ne trimiți nimic.
            </li>
            <li>
              Păstrează vizibil linkul de sub widget, cu textul „{ATRIBUIRE_TEXT}”. Nu-l ascunde, nu-i schimba textul
              în cuvinte cheie și nu-l muta în altă parte a paginii. Poți adăuga <code>rel=&quot;nofollow&quot;</code> dacă
              politica site-ului tău o cere.
            </li>
            <li>
              Calculatorul e neoficial și informativ: proiectul de lege nu este adoptat, iar sumele nu înlocuiesc
              fluturașul de salariu. Nu-l prezenta ca instrument al instituției tale sau al vreunui minister.
            </li>
            <li>
              Widgetul nu pune cookie-uri și nu colectează date despre vizitatorii tăi. Serverul nostru vede, ca la orice
              pagină, adresa site-ului din care e încărcat (antetul Referer), fără calea paginii.
            </li>
            <li>
              Putem schimba aspectul widgetului sau îl putem opri dacă e folosit înșelător. Datele și codul sunt open
              source; formulele sunt descrise pe{" "}
              <Link href="/ghiduri" className="text-brand-700 underline underline-offset-2">
                paginile de ghiduri
              </Link>
              .
            </li>
          </ul>
          <h2 className="pt-4 text-xl font-bold text-slate-900">Întrebări</h2>
          <p>
            <strong>Ce variantă arată?</strong> Implicit, ultima publicată; o poți fixa pe una anume din generator.
            Vizitatorul poate schimba varianta și modul din widget.
          </p>
          <p>
            <strong>Pot schimba culorile?</strong> Nu deocamdată; widgetul folosește culorile România Transparentă, ca
            sursa să fie recunoscută.
          </p>
          <p>
            <strong>Unde scriu dacă ceva nu merge?</strong> La{" "}
            <a href="mailto:contact@romaniatransparenta.eu" className="text-brand-700 underline underline-offset-2">
              contact@romaniatransparenta.eu
            </a>
            , cu adresa paginii unde ai pus widgetul.
          </p>
          <p className="pt-2 text-xs text-slate-500">România Transparentă</p>
        </div>
      </section>
    </main>
  );
}
