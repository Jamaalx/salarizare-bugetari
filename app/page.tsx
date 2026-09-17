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

export default function HomePage() {
  const implicita = VARIANTE.find((v) => v.id === VARIANTA_IMPLICITA)!;
  const functii = VARIANTE.map((v) => ({ id: v.id, eticheta: v.eticheta, n: numarFunctii(v.id) }));

  return (
    <main className="min-h-screen">
      <BannerNeadoptat />

      <header className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 text-white">
        <div className="absolute inset-0 opacity-10 pointer-events-none" aria-hidden>
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        <div className="relative mx-auto max-w-6xl px-4 py-5 md:py-8">
          <div className="inline-flex flex-wrap items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide uppercase backdrop-blur-sm">
            <Calendar className="w-3.5 h-3.5" />
            Proiect lege salarizare 2026 — 3 variante oficiale
            <span className="mx-1 text-white/60">·</span>
            25 mai · 17 iul · 20 aug
            <span className="mx-1 text-white/60">·</span>
            neadoptat
          </div>
          <h1 className="mt-3 text-2xl md:text-4xl font-bold tracking-tight leading-[1.1]">
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
      </header>

      <ModeSwitcher />

      <Variante />

      <Sources />

      <section className="border-t bg-gradient-to-br from-amber-50 via-white to-amber-50">
        <div className="mx-auto max-w-3xl px-4 py-10 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 mb-3">
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
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-400 hover:bg-amber-500 text-slate-900 font-semibold px-5 py-2.5 text-sm shadow-md shadow-amber-200 transition hover:scale-105"
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
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-900 underline underline-offset-4 hover:text-brand-700"
              >
                Face parte din România Transparentă
                <ExternalLink className="w-4 h-4" />
              </a>
            </>
          )}
        </div>
      </section>

      <footer className="border-t bg-slate-900 text-slate-300">
        <div className="mx-auto max-w-6xl px-4 py-10 text-sm space-y-3">
          <p className="text-slate-200 font-semibold">Disclaimer</p>
          <p className="text-slate-400 leading-relaxed">
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
          <p className="text-slate-400 leading-relaxed">
            Nu garantăm corectitudinea calculelor și nu ne asumăm răspunderea pentru
            deciziile luate pe baza lor — pentru sume oficiale consultă fluturașul de
            salariu emis de angajator. Nu colectăm date personale, nu folosim cookies
            de tracking, nu rulăm reclame.
          </p>
          <p className="text-slate-400">
            Sursa coeficienților:{" "}
            <a
              className="text-brand-300 hover:text-brand-200 underline-offset-2 hover:underline"
              href="https://mmuncii.gov.ro/legea-salarizarii/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Ministerul Muncii — Legea salarizării
            </a>{" "}
            (25 mai, 17 iulie) și{" "}
            <a
              className="text-brand-300 hover:text-brand-200 underline-offset-2 hover:underline"
              href="https://publisind.ro/legea-salarizarii-varianta-iii-20-august-2026/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Publisind
            </a>{" "}
            /{" "}
            <a
              className="text-brand-300 hover:text-brand-200 underline-offset-2 hover:underline"
              href="https://solidaritatea-sanitara.ro/proiectul-legii-salarizarii-varianta-20-08-2026/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Solidaritatea Sanitară
            </a>{" "}
            (20 august).
          </p>
          <p className="text-slate-500 text-xs pt-2 border-t border-slate-800 flex items-center justify-center flex-wrap gap-1">
            Construit cu
            <Heart className="w-3 h-3 inline text-rose-400 fill-rose-400" />
            pentru bugetarii din România · Open-source ·{" "}
            <a
              href="https://github.com/Jamaalx/salarizare-bugetari"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-300 hover:text-brand-200 underline-offset-2 hover:underline"
            >
              GitHub
            </a>
          </p>
          <p className="text-center text-[13px] tracking-[.02em] text-slate-300/70">
            Design, cod, funcționalități &amp; hosting:{" "}
            <a
              href="https://zed-zen.com"
              target="_blank"
              rel="noopener"
              title="ZEDZEN — web design, dezvoltare & hosting"
              className="font-bold text-slate-300 no-underline border-b border-current hover:text-white"
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
