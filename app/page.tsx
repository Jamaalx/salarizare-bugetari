import { Calendar, FileCheck, ExternalLink } from "lucide-react";
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

      <footer className="border-t bg-slate-900 text-slate-300">
        <div className="mx-auto max-w-6xl px-4 py-10 text-sm space-y-3">
          <p className="text-slate-200 font-semibold">Disclaimer</p>
          <p className="text-slate-400 leading-relaxed">
            Acesta este un instrument neoficial, informativ. Calculele se bazează pe
            versiunea de proiect a legii din 25 mai 2026 (MMFTSS) și pe coeficienții
            publicați împreună cu proiectul. Valoarea de referință pentru 2027 este fixată
            la <strong className="text-white">4100 lei</strong> prin art. 47 alin. (2);
            pentru anii următori va fi stabilită prin HG. Nu garantăm corectitudinea
            calculelor — consultă fluturașul de salariu emis de angajator.
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
        </div>
      </footer>

      <ChatWidget />
    </main>
  );
}
