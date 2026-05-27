"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Wallet,
  GraduationCap,
  Stethoscope,
  Drama,
  Globe,
  Scale,
  Shield,
  Microscope,
  Landmark,
  Crown,
  Search,
  RefreshCw,
  Share2,
  AlertTriangle,
  Info,
  Lightbulb,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  Calculator as CalculatorIcon,
  TrendingUp,
  TrendingDown,
  Equal,
  Award,
  Briefcase,
  Banknote,
} from "lucide-react";
import {
  calcBrut,
  aplicaGradatie,
  GRADATII,
  SPORURI_STANDARD,
  VALOARE_REFERINTA_DEFAULT,
  gradatieDinVechime,
} from "@/lib/tax";

type CoefEntry = {
  anexa: string;
  anexaNume: string;
  capitol: string;
  sheet: string;
  functie: string;
  studii: string;
  grad: string;
  vechime: string;
  coeficient: number;
  cod: string;
  nrCrt: number | null;
};

type Props = { initialData: { sheets: any[]; data: CoefEntry[] } };

const FAMILII = [
  { anexa: "I", nume: "Învățământ", Icon: GraduationCap, desc: "Profesori, educatori, învățători, didactic auxiliar" },
  { anexa: "II", nume: "Sănătate și asistență socială", Icon: Stethoscope, desc: "Medici, asistente, infirmieri, asistenți sociali" },
  { anexa: "III", nume: "Cultură", Icon: Drama, desc: "Biblioteci, muzee, teatre, presa publică" },
  { anexa: "IV", nume: "Diplomație", Icon: Globe, desc: "Personal MAE, ambasade, consulate" },
  { anexa: "V", nume: "Justiție", Icon: Scale, desc: "Judecători, procurori, grefieri, executori" },
  { anexa: "VI", nume: "Apărare, ordine publică", Icon: Shield, desc: "Militari, poliție, penitenciare, ISU" },
  { anexa: "VII", nume: "Cercetare", Icon: Microscope, desc: "Cercetători, dezvoltare tehnologică" },
  { anexa: "VIII", nume: "Administrație", Icon: Landmark, desc: "Funcționari publici, personal contractual primării/instituții" },
  { anexa: "IX", nume: "Funcții de demnitate publică", Icon: Crown, desc: "Aleși locali, miniștri, parlamentari" },
];

type WizardState = {
  step: number;
  anexa: string;
  functieIdx: number | null;
  aniVechime: number;
  gradatieManual: number | null;
  sporuri: Record<string, { activ: boolean; procent?: number }>;
  salariuActual: number;
  valRef: number;
};

const INITIAL: WizardState = {
  step: 0,
  anexa: "",
  functieIdx: null,
  aniVechime: 5,
  gradatieManual: null,
  sporuri: {},
  salariuActual: 0,
  valRef: VALOARE_REFERINTA_DEFAULT,
};

export default function Wizard({ initialData }: Props) {
  const all = initialData.data;
  const [s, setS] = useState<WizardState>(INITIAL);

  const selected = s.functieIdx !== null ? all[s.functieIdx] : null;

  const coefIncludeVechime = !!(selected?.vechime && selected.vechime.trim().length > 0);
  const esteConducere = !!(selected?.grad && /grad\s*(i|ii|iii|managerial)/i.test(selected.grad));
  const skipGradatii = coefIncludeVechime || esteConducere;

  const gradatie = skipGradatii
    ? 0
    : s.gradatieManual !== null
    ? s.gradatieManual
    : gradatieDinVechime(s.aniVechime);

  const salariuG0 = selected ? selected.coeficient * s.valRef : 0;
  const salariuBaza = selected ? Math.round(aplicaGradatie(salariuG0, gradatie)) : 0;

  const sporuriState = SPORURI_STANDARD.map((sp) => ({
    spor: sp,
    activ: !!s.sporuri[sp.id]?.activ,
    procentCustom: s.sporuri[sp.id]?.procent,
  }));

  const tax = selected
    ? calcBrut({ salariuBaza, sporuri: sporuriState, valoareReferinta: s.valRef })
    : null;

  const steps: { id: string; title: string; show: boolean }[] = [
    { id: "intro", title: "Start", show: true },
    { id: "familia", title: "Sector", show: true },
    { id: "functie", title: "Funcția", show: !!s.anexa },
    { id: "vechime", title: "Vechime", show: !!selected && !skipGradatii },
    { id: "sporuri", title: "Sporuri", show: !!selected },
    { id: "actual", title: "Comparație", show: !!selected },
    { id: "rezultat", title: "Rezultat", show: !!selected },
  ];
  const visibleSteps = steps.filter((x) => x.show);
  const currentIdx = Math.min(s.step, visibleSteps.length - 1);
  const current = visibleSteps[currentIdx];

  const next = () => setS((p) => ({ ...p, step: Math.min(p.step + 1, visibleSteps.length - 1) }));
  const prev = () => setS((p) => ({ ...p, step: Math.max(0, p.step - 1) }));
  const reset = () => setS(INITIAL);
  const goTo = (idx: number) => setS((p) => ({ ...p, step: idx }));

  useEffect(() => {
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, [current?.id]);

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 md:py-12">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between gap-1.5 mb-2">
          {visibleSteps.map((st, i) => (
            <button
              key={st.id}
              onClick={() => i <= currentIdx && goTo(i)}
              disabled={i > currentIdx}
              className={
                "flex-1 group flex flex-col items-center gap-2 " +
                (i <= currentIdx ? "cursor-pointer" : "cursor-not-allowed")
              }
            >
              <div
                className={
                  "h-1.5 w-full rounded-full transition " +
                  (i < currentIdx
                    ? "bg-brand-500"
                    : i === currentIdx
                    ? "bg-brand-300"
                    : "bg-slate-200")
                }
              />
              <span
                className={
                  "text-[10px] md:text-xs font-semibold tracking-wider uppercase hidden sm:inline " +
                  (i === currentIdx
                    ? "text-brand-700"
                    : i < currentIdx
                    ? "text-slate-500"
                    : "text-slate-300")
                }
              >
                {st.title}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="rounded-3xl bg-white shadow-xl ring-1 ring-slate-200/60 p-6 md:p-10 min-h-[440px]">
        {current?.id === "intro" && <StepIntro onNext={next} />}
        {current?.id === "familia" && (
          <StepFamilia
            anexa={s.anexa}
            onPick={(a) => setS((p) => ({ ...p, anexa: a, functieIdx: null, step: p.step + 1 }))}
          />
        )}
        {current?.id === "functie" && (
          <StepFunctie
            all={all}
            anexa={s.anexa}
            functieIdx={s.functieIdx}
            onPick={(idx) => setS((p) => ({ ...p, functieIdx: idx }))}
            onNext={next}
          />
        )}
        {current?.id === "vechime" && (
          <StepVechime
            aniVechime={s.aniVechime}
            currentGradatie={gradatie}
            onAni={(n) => setS((p) => ({ ...p, aniVechime: n, gradatieManual: null }))}
          />
        )}
        {current?.id === "sporuri" && (
          <StepSporuri
            sporuri={s.sporuri}
            toggle={(id) =>
              setS((p) => ({
                ...p,
                sporuri: { ...p.sporuri, [id]: { ...p.sporuri[id], activ: !p.sporuri[id]?.activ } },
              }))
            }
            setProcent={(id, n) =>
              setS((p) => ({
                ...p,
                sporuri: { ...p.sporuri, [id]: { activ: p.sporuri[id]?.activ ?? false, procent: n } },
              }))
            }
          />
        )}
        {current?.id === "actual" && (
          <StepActual
            valRef={s.valRef}
            setValRef={(n) => setS((p) => ({ ...p, valRef: n }))}
            salariuActual={s.salariuActual}
            setSalariuActual={(n) => setS((p) => ({ ...p, salariuActual: n }))}
          />
        )}
        {current?.id === "rezultat" && selected && tax && (
          <StepRezultat
            functie={selected}
            valRef={s.valRef}
            gradatie={gradatie}
            skipGradatii={skipGradatii}
            coefIncludeVechime={coefIncludeVechime}
            esteConducere={esteConducere}
            salariuG0={salariuG0}
            salariuBaza={salariuBaza}
            tax={tax}
            salariuActual={s.salariuActual}
            onReset={reset}
          />
        )}

        {current?.id !== "intro" && current?.id !== "rezultat" && (
          <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
            <button
              onClick={prev}
              disabled={currentIdx === 0}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4" /> Înapoi
            </button>
            <button
              onClick={next}
              disabled={
                (current?.id === "familia" && !s.anexa) ||
                (current?.id === "functie" && s.functieIdx === null)
              }
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 text-white px-5 py-2.5 text-sm font-semibold hover:bg-brand-700 transition disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
            >
              {currentIdx === visibleSteps.length - 1
                ? "Vezi rezultatul"
                : current?.id === "actual"
                ? "Calculează"
                : "Continuă"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

/* ============================================================
   STEPS
   ============================================================ */

function StepIntro({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center py-6 md:py-10">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-brand-100 text-brand-700 mb-5">
        <CalculatorIcon className="w-10 h-10" strokeWidth={1.5} />
      </div>
      <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
        Vrei să afli cum se va modifica salariul tău?
      </h2>
      <p className="mt-4 text-slate-600 max-w-lg mx-auto leading-relaxed">
        Te voi întreba câteva lucruri simple — sectorul în care lucrezi, funcția pe care
        o ocupi, vechimea ta și sporurile pe care le primești. La final îți spun salariul
        estimat în baza{" "}
        <span className="font-semibold text-slate-800">noului proiect de lege</span>{" "}
        (MMFTSS, 25 mai 2026).
      </p>
      <p className="mt-3 text-xs text-slate-500 max-w-md mx-auto">
        Durează ~1 minut. Datele nu se trimit nicăieri — calculul se face în browser-ul tău.
      </p>
      <button
        onClick={onNext}
        className="mt-8 inline-flex items-center gap-2 rounded-xl bg-brand-600 text-white px-8 py-3.5 text-base font-semibold hover:bg-brand-700 shadow-lg shadow-brand-200 transition"
      >
        Începe calculul
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
}

function StepFamilia({
  anexa,
  onPick,
}: {
  anexa: string;
  onPick: (a: string) => void;
}) {
  return (
    <div>
      <StepHeader
        nr={1}
        title="În ce sector lucrezi?"
        desc="Alege familia ocupațională care îți descrie activitatea."
      />
      <div className="grid sm:grid-cols-2 gap-3">
        {FAMILII.map(({ anexa: a, nume, Icon, desc }) => {
          const isSel = anexa === a;
          return (
            <button
              key={a}
              onClick={() => onPick(a)}
              className={
                "text-left rounded-2xl border-2 p-4 transition hover:shadow-md group " +
                (isSel
                  ? "border-brand-500 bg-brand-50 shadow-md"
                  : "border-slate-200 hover:border-brand-300 bg-white")
              }
            >
              <div className="flex items-start gap-3">
                <div
                  className={
                    "shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-xl transition " +
                    (isSel
                      ? "bg-brand-600 text-white"
                      : "bg-slate-100 text-slate-600 group-hover:bg-brand-100 group-hover:text-brand-600")
                  }
                >
                  <Icon className="w-5 h-5" strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900 leading-tight">{nume}</div>
                  <div className="text-xs text-slate-500 mt-1 leading-snug">{desc}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepFunctie({
  all,
  anexa,
  functieIdx,
  onPick,
  onNext,
}: {
  all: CoefEntry[];
  anexa: string;
  functieIdx: number | null;
  onPick: (idx: number) => void;
  onNext: () => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    let list = all;
    if (anexa) list = list.filter((e) => e.anexa === anexa);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (e) =>
          e.functie.toLowerCase().includes(q) ||
          e.capitol.toLowerCase().includes(q)
      );
    }
    return list.slice(0, 150);
  }, [all, anexa, query]);

  const fam = FAMILII.find((f) => f.anexa === anexa);

  return (
    <div>
      <StepHeader
        nr={2}
        title="Ce funcție ocupi?"
        desc={
          fam
            ? `Caută în ${fam.nume}. ${filtered.length === 150 ? "150+ funcții disponibile." : filtered.length + " funcții disponibile."}`
            : "Caută funcția ta."
        }
        IconFn={Briefcase}
      />
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          autoFocus
          type="search"
          placeholder="Caută... ex: profesor, medic, inspector, secretar"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-xl border-2 border-slate-200 pl-12 pr-4 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100 transition"
        />
      </div>
      <div className="mt-3 max-h-[360px] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50">
        {filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">
            Nu am găsit nimic. Încearcă alte cuvinte cheie sau revino la pasul anterior.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200 bg-white">
            {filtered.map((e) => {
              const idx = all.indexOf(e);
              const isSel = functieIdx === idx;
              return (
                <li key={`${e.sheet}-${e.cod}-${e.coeficient}-${idx}`}>
                  <button
                    onClick={() => {
                      onPick(idx);
                      setTimeout(onNext, 320);
                    }}
                    className={
                      "w-full text-left px-4 py-3 transition group " +
                      (isSel ? "bg-brand-50" : "hover:bg-slate-50")
                    }
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={
                          "shrink-0 inline-flex items-center justify-center min-w-[60px] rounded-lg px-2 py-1.5 text-sm font-mono font-bold tabular-nums transition " +
                          (isSel
                            ? "bg-brand-600 text-white"
                            : "bg-slate-100 text-slate-600 group-hover:bg-brand-100 group-hover:text-brand-700")
                        }
                      >
                        {e.coeficient.toFixed(3)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-900 text-sm">
                          {e.functie}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {[
                            e.studii && `Studii ${e.studii}`,
                            e.grad,
                            e.vechime,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      </div>
                      {isSel && <Check className="shrink-0 w-5 h-5 text-brand-600" />}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="mt-3 flex items-start gap-2 text-xs text-slate-500">
        <Lightbulb className="shrink-0 w-4 h-4 text-amber-500 mt-0.5" strokeWidth={2} />
        <p>
          Pentru funcții cu grade (Grad I, Grad II) sau vechime specifică (ex.
          „peste 25 ani") alege varianta exactă care ți se potrivește — coeficientul
          diferă.
        </p>
      </div>
    </div>
  );
}

function StepVechime({
  aniVechime,
  currentGradatie,
  onAni,
}: {
  aniVechime: number;
  currentGradatie: number;
  onAni: (n: number) => void;
}) {
  return (
    <div>
      <StepHeader
        nr={3}
        title="Câți ani de vechime în muncă ai?"
        desc="Se ia în calcul toată vechimea (inclusiv perioade din sectorul privat — art. 13 alin. 6)."
        IconFn={Award}
      />
      <div className="flex items-center justify-center gap-4 py-6">
        <input
          type="number"
          min={0}
          max={50}
          value={aniVechime}
          onChange={(e) => onAni(Math.max(0, Number(e.target.value) || 0))}
          className="w-32 rounded-2xl border-2 border-slate-200 px-4 py-4 text-4xl font-bold text-center focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100 tabular-nums transition"
        />
        <span className="text-xl text-slate-600">ani</span>
      </div>
      <div className="rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100 border border-brand-200 p-5 text-center">
        <div className="text-xs uppercase tracking-wider text-brand-700/80 font-semibold mb-1">
          Gradație rezultată
        </div>
        <div className="text-3xl font-bold text-brand-900">
          Gradația {currentGradatie}
        </div>
        <div className="text-sm text-brand-700 mt-1">
          {GRADATII[currentGradatie].numeRange}
        </div>
      </div>
      <details className="mt-5">
        <summary className="cursor-pointer text-sm text-slate-600 hover:text-slate-900 select-none">
          Vezi tabelul complet al gradațiilor
        </summary>
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left p-3 font-semibold">Gradație</th>
                <th className="text-left p-3 font-semibold">Vechime</th>
                <th className="text-right p-3 font-semibold">Majorare</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {GRADATII.map((g) => (
                <tr
                  key={g.nivel}
                  className={
                    g.nivel === currentGradatie ? "bg-brand-50 font-medium" : ""
                  }
                >
                  <td className="p-3">{g.nivel}</td>
                  <td className="p-3">{g.numeRange}</td>
                  <td className="p-3 text-right tabular-nums text-emerald-700">
                    {g.cota === 0 ? "—" : `+${g.cota}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

function StepSporuri({
  sporuri,
  toggle,
  setProcent,
}: {
  sporuri: Record<string, { activ: boolean; procent?: number }>;
  toggle: (id: string) => void;
  setProcent: (id: string, n: number) => void;
}) {
  return (
    <div>
      <StepHeader
        nr={4}
        title="Beneficiezi de sporuri?"
        desc="Bifează doar cele care ți se aplică efectiv. Sporurile incluse în plafonul de 20% se cumulează până la maxim 20% din salariul de bază."
        IconFn={TrendingUp}
      />
      <div className="grid sm:grid-cols-2 gap-3">
        {SPORURI_STANDARD.map((spor) => {
          const st = sporuri[spor.id];
          const activ = !!st?.activ;
          return (
            <label
              key={spor.id}
              className={
                "rounded-2xl border-2 p-4 cursor-pointer transition " +
                (activ
                  ? "border-brand-500 bg-brand-50"
                  : "border-slate-200 hover:border-brand-300 bg-white")
              }
            >
              <div className="flex items-start gap-3">
                <div
                  className={
                    "shrink-0 mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded border-2 transition " +
                    (activ
                      ? "bg-brand-600 border-brand-600 text-white"
                      : "border-slate-300 bg-white")
                  }
                >
                  {activ && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                </div>
                <input
                  type="checkbox"
                  checked={activ}
                  onChange={() => toggle(spor.id)}
                  className="sr-only"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 text-sm leading-tight">{spor.nume}</div>
                  {spor.descriere && (
                    <div className="text-xs text-slate-500 mt-1 leading-snug">{spor.descriere}</div>
                  )}
                  {activ && spor.tip === "procent" && (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={spor.valoare}
                        value={st?.procent ?? spor.valoare}
                        onChange={(e) =>
                          setProcent(spor.id, Math.max(0, Number(e.target.value)))
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="w-16 rounded border border-slate-300 px-2 py-1 text-sm tabular-nums"
                      />
                      <span className="text-xs text-slate-600">% din baza</span>
                    </div>
                  )}
                  <div className="mt-1.5 text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                    {spor.inclusInPlafon20 ? "în plafonul 20%" : "exceptat de la plafon"}
                  </div>
                </div>
              </div>
            </label>
          );
        })}
      </div>
      <div className="mt-4 flex items-start gap-2 text-xs text-slate-500">
        <Info className="shrink-0 w-4 h-4 text-brand-500 mt-0.5" strokeWidth={2} />
        <p>Dacă nu ai niciun spor, mergi direct mai departe.</p>
      </div>
    </div>
  );
}

function StepActual({
  valRef,
  setValRef,
  salariuActual,
  setSalariuActual,
}: {
  valRef: number;
  setValRef: (n: number) => void;
  salariuActual: number;
  setSalariuActual: (n: number) => void;
}) {
  return (
    <div>
      <StepHeader
        nr={5}
        title="Ultimii pași (opționali)"
        desc="Ne ajută să-ți arătăm diferența față de salariul actual."
        IconFn={Banknote}
      />
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 p-5 bg-slate-50">
          <label className="block">
            <span className="text-sm font-semibold text-slate-800 block">
              Salariul tău BRUT actual (decembrie 2026)
            </span>
            <span className="block text-xs text-slate-500 mt-0.5">
              Opțional — pentru calcul diferență tranzitorie (art. 32).
            </span>
            <div className="mt-3 flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={salariuActual || ""}
                onChange={(e) => setSalariuActual(Math.max(0, Number(e.target.value) || 0))}
                placeholder="ex: 7500"
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-lg tabular-nums focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
              <span className="text-sm text-slate-600">lei</span>
            </div>
          </label>
        </div>

        <div className="rounded-2xl border border-slate-200 p-5">
          <label className="block">
            <span className="text-sm font-semibold text-slate-800 block">
              Valoarea de referință
            </span>
            <span className="block text-xs text-slate-500 mt-0.5">
              Pentru <strong>2027</strong> este fixată prin lege la{" "}
              <strong>{VALOARE_REFERINTA_DEFAULT} lei</strong> (art. 47 alin. 2). Din
              2028 va fi stabilită anual prin HG. Modifică dacă vrei să simulezi alte
              valori.
            </span>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <input
                type="number"
                min={0}
                value={valRef}
                onChange={(e) => setValRef(Math.max(0, Number(e.target.value) || 0))}
                className="w-32 rounded-xl border border-slate-300 px-3 py-2.5 text-lg tabular-nums focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
              <span className="text-sm text-slate-600">lei</span>
              <div className="ml-auto flex gap-1">
                {[4100, 4300, 4500, 4800].map((v) => (
                  <button
                    key={v}
                    onClick={() => setValRef(v)}
                    className={
                      "text-xs px-2.5 py-1.5 rounded-lg border transition tabular-nums " +
                      (valRef === v
                        ? "bg-brand-600 text-white border-brand-600"
                        : "bg-white text-slate-600 border-slate-200 hover:border-brand-300")
                    }
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}

function StepRezultat({
  functie,
  valRef,
  gradatie,
  skipGradatii,
  coefIncludeVechime,
  esteConducere,
  salariuG0,
  salariuBaza,
  tax,
  salariuActual,
  onReset,
}: {
  functie: CoefEntry;
  valRef: number;
  gradatie: number;
  skipGradatii: boolean;
  coefIncludeVechime: boolean;
  esteConducere: boolean;
  salariuG0: number;
  salariuBaza: number;
  tax: ReturnType<typeof calcBrut>;
  salariuActual: number;
  onReset: () => void;
}) {
  const fmt = (n: number) => n.toLocaleString("ro-RO", { maximumFractionDigits: 0 });
  const diferentaTranzitorie = Math.max(0, salariuActual - tax.salariuBrut);
  const cresterePotentiala = tax.salariuBrut - salariuActual;

  const [copyState, setCopyState] = useState<"idle" | "ok" | "err">("idle");
  useEffect(() => {
    if (copyState === "idle") return;
    const t = setTimeout(() => setCopyState("idle"), 2000);
    return () => clearTimeout(t);
  }, [copyState]);

  return (
    <div className="space-y-5">
      <header className="mb-2">
        <div className="text-xs font-bold tracking-wider text-brand-600 uppercase mb-1">
          Rezultatul tău
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight">
          {functie.functie}
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Anexa {functie.anexa} · {functie.capitol}
          {functie.studii && ` · Studii ${functie.studii}`}
          {functie.grad && ` · ${functie.grad}`}
          {functie.vechime && ` · ${functie.vechime}`}
        </p>
      </header>

      <div className="grid sm:grid-cols-3 gap-3">
        <BigCard
          label="Salariu de bază"
          value={`${fmt(salariuBaza)} lei`}
          sub={
            skipGradatii
              ? `coef ${functie.coeficient.toFixed(3)} × ${fmt(valRef)} lei`
              : `coef ${functie.coeficient.toFixed(3)} × ${fmt(valRef)} × gr. ${gradatie}`
          }
        />
        <BigCard
          label="Salariu BRUT"
          value={`${fmt(tax.salariuBrut)} lei`}
          sub="cu sporurile bifate"
        />
        <BigCard
          label="Salariu NET (în mână)"
          value={`${fmt(tax.salariuNet)} lei`}
          sub="după CAS / CASS / impozit"
          highlight
        />
      </div>

      {skipGradatii && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Info className="shrink-0 w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            {coefIncludeVechime
              ? `Coeficientul include deja vechimea ("${functie.vechime}"), deci gradațiile nu se mai aplică.`
              : `Pentru funcțiile de conducere (${functie.grad}), gradația este inclusă în coeficient la nivel maxim — art. 10.`}
          </div>
        </div>
      )}

      {salariuActual > 0 && (
        <div
          className={
            "rounded-2xl border-2 px-5 py-4 " +
            (diferentaTranzitorie > 0
              ? "bg-amber-50 border-amber-300"
              : cresterePotentiala > 0
              ? "bg-emerald-50 border-emerald-300"
              : "bg-slate-50 border-slate-300")
          }
        >
          <h3 className="text-sm font-semibold text-slate-700 mb-2">
            Comparație cu salariul actual
          </h3>
          <div className="grid sm:grid-cols-2 gap-2 text-sm text-slate-600 mb-3">
            <div>
              Brut actual (dec. 2026):{" "}
              <strong className="tabular-nums text-slate-900">{fmt(salariuActual)} lei</strong>
            </div>
            <div>
              Brut nou (calculat):{" "}
              <strong className="tabular-nums text-slate-900">{fmt(tax.salariuBrut)} lei</strong>
            </div>
          </div>
          <div className="text-lg font-bold flex items-center gap-2">
            {diferentaTranzitorie > 0 ? (
              <>
                <TrendingDown className="w-5 h-5 text-amber-700" />
                <span className="text-amber-800">
                  Primești diferență tranzitorie: +{fmt(diferentaTranzitorie)} lei/lună
                </span>
              </>
            ) : cresterePotentiala > 0 ? (
              <>
                <TrendingUp className="w-5 h-5 text-emerald-700" />
                <span className="text-emerald-800">
                  Creștere brută: +{fmt(cresterePotentiala)} lei/lună
                </span>
              </>
            ) : (
              <>
                <Equal className="w-5 h-5 text-slate-600" />
                <span className="text-slate-700">Salariu identic</span>
              </>
            )}
          </div>
          {diferentaTranzitorie > 0 && (
            <p className="mt-2 text-xs text-amber-800/80">
              Drept individual până la egalizare — art. 32. Acordat lunar până la 31 decembrie 2031.
            </p>
          )}
        </div>
      )}

      <details className="rounded-2xl border border-slate-200 bg-white p-5" open>
        <summary className="cursor-pointer text-sm font-semibold text-slate-800 select-none">
          Vezi cum am calculat
        </summary>
        <div className="mt-4 grid sm:grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
          <LineItem
            label={
              skipGradatii
                ? "Coeficient × valoare referință"
                : "Coeficient × val. ref. (gradația 0)"
            }
            value={`${fmt(Math.round(salariuG0))} lei`}
          />
          {!skipGradatii && gradatie > 0 && (
            <LineItem
              label={`+ Gradații (nivel ${gradatie})`}
              value={`+${fmt(salariuBaza - Math.round(salariuG0))} lei`}
              positive
            />
          )}
          <LineItem label="= Salariu de bază" value={`${fmt(salariuBaza)} lei`} bold />
          {tax.sporuriProcent > 0 && (
            <LineItem
              label="+ Sporuri în plafon (≤20%)"
              value={`+${fmt(tax.sporuriProcent)} lei`}
              positive
            />
          )}
          {tax.sporuriExceptate > 0 && (
            <LineItem
              label="+ Sporuri exceptate"
              value={`+${fmt(tax.sporuriExceptate)} lei`}
              positive
            />
          )}
          <LineItem label="= Salariu BRUT" value={`${fmt(tax.salariuBrut)} lei`} bold />
          <LineItem label="− CAS 25% (pensie)" value={`−${fmt(tax.cas)} lei`} negative />
          <LineItem label="− CASS 10% (sănătate)" value={`−${fmt(tax.cass)} lei`} negative />
          <LineItem
            label="− Impozit 10% pe venit"
            value={`−${fmt(tax.impozit)} lei`}
            negative
          />
          <LineItem label="= Salariu NET" value={`${fmt(tax.salariuNet)} lei`} bold />
        </div>
      </details>

      {tax.sporuriDepasescPlafon && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          <AlertTriangle className="shrink-0 w-5 h-5 text-rose-600 mt-0.5" />
          <div>
            Suma sporurilor „în plafon" depășește 20% din salariul de bază. Conform art.
            21 alin. (2), au fost capate la 20% în calcul.
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          onClick={onReset}
          className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
        >
          <RefreshCw className="w-4 h-4" /> Calculează pentru alt rol
        </button>
        <div className="relative">
          <button
            onClick={() => {
              if (typeof window !== "undefined" && navigator.share) {
                navigator
                  .share({
                    title: "Calculator Salariu Bugetari",
                    text: `Salariu net estimat: ${fmt(tax.salariuNet)} lei pentru ${functie.functie}`,
                    url: window.location.href,
                  })
                  .catch(() => {});
              } else if (typeof window !== "undefined") {
                navigator.clipboard
                  .writeText(window.location.href)
                  .then(() => setCopyState("ok"))
                  .catch(() => setCopyState("err"));
              }
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 text-white px-5 py-2.5 text-sm font-semibold hover:bg-brand-700 transition shadow-sm"
          >
            <Share2 className="w-4 h-4" /> Trimite linkul către un coleg
          </button>
          {copyState !== "idle" && (
            <div
              role="status"
              className={`absolute left-1/2 -translate-x-1/2 -top-10 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold shadow-md ${
                copyState === "ok"
                  ? "bg-emerald-600 text-white"
                  : "bg-rose-600 text-white"
              }`}
            >
              {copyState === "ok"
                ? "Link copiat!"
                : "Nu am putut copia — copiază manual din bara de adrese."}
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-500 pt-3 border-t border-slate-100 leading-relaxed">
        Estimare orientativă. Valoarea de referință reală nu e încă stabilită prin HG;
        calculele se bazează pe versiunea de proiect a legii din 25 mai 2026 (MMFTSS).
        Verifică fluturașul de salariu emis de angajator pentru valorile exacte.
      </p>
    </div>
  );
}

/* ============================================================
   BUILDING BLOCKS
   ============================================================ */

function StepHeader({
  nr,
  title,
  desc,
  IconFn,
}: {
  nr: number;
  title: string;
  desc: string;
  IconFn?: typeof Wallet;
}) {
  return (
    <header className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-bold tracking-wider text-brand-600 uppercase">
          Pasul {nr}
        </span>
        {IconFn && <IconFn className="w-4 h-4 text-brand-600" strokeWidth={2} />}
      </div>
      <h2 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight tracking-tight">
        {title}
      </h2>
      <p className="mt-2 text-slate-600 text-sm md:text-base leading-relaxed">{desc}</p>
    </header>
  );
}

function BigCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        "rounded-2xl border-2 p-4 " +
        (highlight
          ? "bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-300"
          : "bg-white border-slate-200")
      }
    >
      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
        {label}
      </p>
      <p
        className={
          "mt-1 text-2xl md:text-3xl font-bold tabular-nums " +
          (highlight ? "text-emerald-700" : "text-slate-900")
        }
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-[11px] text-slate-500">{sub}</p>}
    </div>
  );
}

function LineItem({
  label,
  value,
  bold,
  positive,
  negative,
}: {
  label: string;
  value: string;
  bold?: boolean;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div
      className={
        "flex items-baseline justify-between gap-3 py-1 " +
        (bold
          ? "border-t border-slate-200 pt-2 font-semibold text-slate-900"
          : "text-slate-700")
      }
    >
      <span>{label}</span>
      <span
        className={
          "tabular-nums " +
          (positive ? "text-emerald-700" : negative ? "text-rose-700" : "")
        }
      >
        {value}
      </span>
    </div>
  );
}
