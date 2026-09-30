import { Calendar, FileCheck, ExternalLink, Heart, Coffee } from "lucide-react";

// Moștenire: îndemnul la donații („Buy me a coffee") și textul la persoana întâi.
// Calculatorul apare acum ca parte din România Transparentă; se reactivează la build cu
// NEXT_PUBLIC_LEGACY_PERSONAL=1.
const LEGACY_PERSONAL = process.env.NEXT_PUBLIC_LEGACY_PERSONAL === "1";
import ModeSwitcher from "@/components/ModeSwitcher";
import Sources from "@/components/Sources";
import ChatWidget from "@/components/ChatWidget";
import BannerNeadoptat from "@/components/BannerNeadoptat";
import Variante from "@/components/Variante";
import { VARIANTE, VARIANTA_IMPLICITA } from "@/lib/variants";
import { numarFunctii } from "@/lib/variants-data";
import type { Metadata } from "next";
import Link from "next/link";
import { GRILE, RT_ORGANIZATIE, SITE_URL, VARIANTE_TEXT, grilaDupaSlug, jsonLd } from "@/lib/seo";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function HomePage() {
  const implicita = VARIANTE.find((v) => v.id === VARIANTA_IMPLICITA)!;
  const functii = VARIANTE.map((v) => ({ id: v.id, eticheta: v.eticheta, n: numarFunctii(v.id) }));

  return (
    <main className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd({
          "@graph": [
            {
              "@type": "WebApplication",
              "@id": `${SITE_URL}/#aplicatie`,
              name: "Calculator Salariu Bugetari",
              url: `${SITE_URL}/`,
              applicationCategory: "FinanceApplication",
              operatingSystem: "Any",
              inLanguage: "ro",
              isAccessibleForFree: true,
              offers: { "@type": "Offer", price: "0", priceCurrency: "RON" },
              description: `Calculează salariul brut și net al personalului plătit din fonduri publice pe proiectul noii legi a salarizării, în variantele: ${VARIANTE_TEXT}. Proiect neadoptat.`,
              publisher: RT_ORGANIZATIE,
            },
            { "@type": "WebSite", "@id": `${SITE_URL}/#site`, name: "Calculator Salariu Bugetari", url: `${SITE_URL}/`, inLanguage: "ro", publisher: RT_ORGANIZATIE },
          ],
        })}
      />
      <BannerNeadoptat />

      <section className="rt-hero relative overflow-hidden bg-rt-navy text-white">
        <div className="relative mx-auto max-w-6xl px-4 py-8 md:py-14">
          <div className="inline-flex flex-wrap items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-[13px] font-medium tracking-[.14em] uppercase">
            <Calendar className="w-3.5 h-3.5" />
            Proiect lege salarizare 2026 — 3 variante oficiale
            <span className="mx-1 text-white/60">·</span>
            25 mai · 17 iul · 20 aug
            <span className="mx-1 text-white/60">·</span>
            neadoptat
          </div>
          <h1 className="mt-4 text-3xl md:text-5xl font-black tracking-[-0.015em] leading-[1.05]">
            Calculator Salariu Bugetari
          </h1>
          <p className="mt-2 max-w-2xl text-sm md:text-base text-white/90 leading-relaxed">
            Află în 1 minut cât ai avea salariul conform noii legi a salarizării personalului
            plătit din fonduri publice — pe oricare dintre cele trei variante publicate ale
            proiectului (implicit: {implicita.eticheta}, valoare de referință{" "}
            {implicita.valoareReferinta.toLocaleString("ro-RO")} lei).
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-white/85">
            <span className="inline-flex items-center gap-1.5">
              <FileCheck className="w-4 h-4" />
              {functii.map((f) => f.n.toLocaleString("ro")).join(" / ")} funcții indexate (pe variantă)
            </span>
            <a
              href="#variante"
              className="inline-flex items-center gap-1.5 underline-offset-2 hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              Ce s-a schimbat între variante
            </a>
            <a
              href="#sources"
              className="inline-flex items-center gap-1.5 underline-offset-2 hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              Documentele oficiale
            </a>
          </div>
        </div>
      </section>

      <ModeSwitcher />

      <Variante />

      <Sources />

      <section id="grile" className="border-t bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <h2 className="text-xl md:text-2xl font-bold text-slate-900">Grilele de salarizare, pe domenii</h2>
          <p className="mt-1 text-sm text-slate-600">
            Coeficienții și salariul de bază din varianta din {implicita.eticheta}, anexă cu anexă.{" "}
            <Link href="/grila" className="text-brand-700 underline underline-offset-2">Toate grilele</Link>
            {" · "}
            <Link href="/ghiduri" className="text-brand-700 underline underline-offset-2">Ghiduri: cum se calculează, pe funcții</Link>
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-sm">
            {GRILE.map((g) => (
              <li key={g.slug}>
                <Link href={`/grila/${g.slug}`} className="text-brand-700 underline-offset-2 hover:underline">
                  Anexa {g.anexa}: {grilaDupaSlug(g.slug)!.nume}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-white border-t border-rt-line">
        <div className="mx-auto max-w-3xl px-4 py-10 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-100 text-rt-navy mb-3">
            <Heart className="w-6 h-6" strokeWidth={2} />
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900">
            Gratuit, fără reclame, fără tracking
          </h2>
          {LEGACY_PERSONAL ? (
            <>
            <p className="mt-3 text-sm md:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
              Am construit acest calculator pentru cei ~1,3 milioane de bugetari din
              România care vor să înțeleagă cum îi afectează noua lege a salarizării —
              fără să trebuiască să citească zeci de articole și 9 anexe Excel, de trei ori.
              Proiect independent, open-source, neafiliat cu vreo instituție publică.
            </p>
            <p className="mt-3 text-xs text-slate-500">
              Dacă ți-a fost util și vrei să mă susții ca să-l țin online și actualizat:
            </p>
            <a
              href="https://buymeacoffee.com/alexmantello"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rt-btn rt-btn--primary rt-btn--sm"
            >
              <Coffee className="w-4 h-4" strokeWidth={2.25} />
              Buy me a coffee
            </a>
            </>
          ) : (
            <>
              <p className="mt-3 text-sm md:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
                Calculatorul e făcut pentru cei ~1,3 milioane de bugetari din România care vor să
                înțeleagă cum îi afectează noua lege a salarizării — fără să citească zeci de articole
                și 9 anexe Excel, de trei ori. Proiect independent, open-source, neafiliat cu vreo
                instituție publică.
              </p>
              <a
                href="https://romaniatransparenta.eu/despre/"
                className="rt-btn rt-btn--primary rt-btn--sm mt-5"
              >
                Face parte din România Transparentă
                <ExternalLink className="w-4 h-4" />
              </a>
            </>
          )}
        </div>
      </section>

      <footer className="rt-footer">
        <div className="mx-auto max-w-6xl px-6 py-10 md:px-10 md:py-14 text-sm space-y-3">
          <p className="text-white font-bold">Disclaimer</p>
          <p className="text-white/85 leading-relaxed">
            Acesta este un <strong className="text-white">instrument neoficial,
            informativ</strong>, dezvoltat independent și oferit{" "}
            <strong className="text-white">gratuit</strong> personalului din sectorul
            bugetar. Nu suntem afiliați cu Ministerul Muncii, cu Guvernul României sau
            cu vreo altă instituție publică. Calculele se bazează pe cele trei variante
            publicate ale proiectului de lege (25 mai, 17 iulie și 20 august 2026) și pe
            coeficienții publicați împreună cu fiecare — proiectul{" "}
            <strong className="text-white">nu este adoptat</strong>, iar conținutul lui se
            poate modifica până la promulgare. Valoarea de referință fixată prin proiect este{" "}
            {VARIANTE.map((v, i) => (
              <span key={v.id}>
                {i > 0 && (i === VARIANTE.length - 1 ? " și " : ", ")}
                <strong className="text-white">
                  {v.valoareReferinta.toLocaleString("ro-RO")} lei
                </strong>{" "}
                ({v.eticheta}, {v.articolValoareReferinta})
              </span>
            ))}
            ; pentru anii următori va fi stabilită prin Hotărâre de Guvern.
          </p>
          <p className="text-white/85 leading-relaxed">
            Nu garantăm corectitudinea calculelor și nu ne asumăm răspunderea pentru
            deciziile luate pe baza lor — pentru sume oficiale consultă fluturașul de
            salariu emis de angajator. Nu colectăm date personale, nu folosim cookies
            de tracking, nu rulăm reclame.
          </p>
          <p className="text-white/85">
            Sursa coeficienților:{" "}
            <a
              className="text-white underline underline-offset-2 hover:text-rt-yellow"
              href="https://mmuncii.gov.ro/legea-salarizarii/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Ministerul Muncii — Legea salarizării
            </a>{" "}
            (25 mai, 17 iulie) și{" "}
            <a
              className="text-white underline underline-offset-2 hover:text-rt-yellow"
              href="https://publisind.ro/legea-salarizarii-varianta-iii-20-august-2026/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Publisind
            </a>{" "}
            /{" "}
            <a
              className="text-white underline underline-offset-2 hover:text-rt-yellow"
              href="https://solidaritatea-sanitara.ro/proiectul-legii-salarizarii-varianta-20-08-2026/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Solidaritatea Sanitară
            </a>{" "}
            (20 august).
          </p>
          <p className="text-white/85 text-xs pt-2 border-t border-white/20 flex items-center justify-center flex-wrap gap-1">
            Construit cu
            <Heart className="w-3 h-3 inline text-rt-red fill-rt-red" />
            pentru bugetarii din România · Open-source ·{" "}
            <a
              href="https://github.com/Jamaalx/salarizare-bugetari"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white underline underline-offset-2 hover:text-rt-yellow"
            >
              GitHub
            </a>
          </p>
          <p className="text-center text-[13px] tracking-[.02em] text-white/85">
            Design, cod, funcționalități &amp; hosting:{" "}
            <a
              href="https://zed-zen.com"
              target="_blank"
              rel="noopener"
              title="ZEDZEN — web design, dezvoltare & hosting"
              className="font-bold text-white no-underline border-b border-current hover:text-rt-yellow"
            >
              ZEDZEN
            </a>
          </p>
        </div>
      </footer>

      <ChatWidget />
    </main>
  );
}
