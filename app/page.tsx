import { Calendar, FileCheck, ExternalLink, Heart, Coffee } from "lucide-react";
import ModeSwitcher from "@/components/ModeSwitcher";
import Sources from "@/components/Sources";
import ChatWidget from "@/components/ChatWidget";

const FUNCTII_INDEXATE = 2627;

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <header className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 text-white">
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
        <div className="relative mx-auto max-w-6xl px-4 py-10 md:py-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide uppercase backdrop-blur-sm">
            <Calendar className="w-3.5 h-3.5" />
            Proiect lege MMFTSS — 25 mai 2026
            <span className="mx-1 text-white/60">·</span>
            Intră în vigoare 1 ianuarie 2027
          </div>
          <h1 className="mt-5 text-3xl md:text-5xl font-bold tracking-tight leading-[1.1]">
            Calculator Salariu Bugetari
          </h1>
          <p className="mt-4 max-w-2xl text-base md:text-lg text-white/90 leading-relaxed">
            Află în 1 minut cât vei avea salariul tău conform noii legi a salarizării
            personalului plătit din fonduri publice.
          </p>
          <div className="mt-6 flex flex-wrap gap-4 text-sm text-white/85">
            <span className="inline-flex items-center gap-1.5">
              <FileCheck className="w-4 h-4" />
              {FUNCTII_INDEXATE.toLocaleString("ro")} funcții indexate
            </span>
            <a
              href="#sources"
              className="inline-flex items-center gap-1.5 underline-offset-2 hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              Documentele oficiale ale legii
            </a>
          </div>
        </div>
      </header>

      <ModeSwitcher />

      <Sources />

      <section className="border-t bg-gradient-to-br from-amber-50 via-white to-amber-50">
        <div className="mx-auto max-w-3xl px-4 py-10 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 mb-3">
            <Heart className="w-6 h-6" strokeWidth={2} />
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900">
            Gratuit, fără reclame, fără tracking
          </h2>
          <p className="mt-3 text-sm md:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Am construit acest calculator pentru cei ~1,3 milioane de bugetari din
            România care vor să înțeleagă cum îi afectează noua lege a salarizării —
            fără să trebuiască să citească 47 de articole și 9 anexe Excel. Proiect
            independent, open-source, neafiliat cu vreo instituție publică.
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
            cu vreo altă instituție publică. Calculele se bazează pe versiunea de
            proiect a legii din 25 mai 2026 (MMFTSS) și pe coeficienții publicați
            împreună cu proiectul — proiectul nu este adoptat încă, iar conținutul lui
            se poate modifica până la promulgare. Valoarea de referință pentru 2027
            este fixată la <strong className="text-white">4100 lei</strong> prin art.
            47 alin. (2); pentru anii următori va fi stabilită prin Hotărâre de
            Guvern.
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
              href="https://mmuncii.ro/j33/index.php/ro/transparenta/proiecte-in-dezbatere"
              target="_blank"
              rel="noopener noreferrer"
            >
              Ministerul Muncii — proiecte în dezbatere
            </a>
            .
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
        </div>
      </footer>

      <ChatWidget />
    </main>
  );
}
