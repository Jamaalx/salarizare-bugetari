"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useVarianta } from "@/lib/varianta-context";
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
  ORE_NORMA_REPER,
  gradatieDinVechime,
  gradatiiForAnexa,
  sporuriPentruAnexa,
  sporuriGrupate,
  clampNumber,
  COEFICIENTI_CONDUCERE_JUSTITIE,
  soldaGradByKey,
  soldaGradPentruFunctie,
  esteRandSoldaDeGrad,
  type GradatieInfo,
  type Spor,
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
  // treapta de populație (Anexa VIII administrație locală) — din iulie 2026
  subcapitol?: string;
  // Anexa IX (iulie/august): coeficienții eșalonați pe ani, "2027" … "2031"
  coeficientEsalonat?: Record<string, number>;
};

type Props = { initialData: { sheets: any[]; data: CoefEntry[] } };

// Eticheta scurtă a variantei curente („20 august 2026"), pentru texte inline.
function EtichetaVarianta() {
  const v = useVarianta();
  return <>{v.eticheta}</>;
}

// Text fără diacritice, litere mici, spații normalizate — pentru căutare.
const foldText = (s: string) =>
  s
    .toLowerCase()
    .replace(/[șş]/g, "s")
    .replace(/[țţ]/g, "t")
    .replace(/[ăâ]/g, "a")
    .replace(/î/g, "i")
    .replace(/\s+/g, " ")
    .trim();

// Butoanele rapide pentru valoarea de referință: cea din varianta curentă + alte repere.
const valoriRapide = (vr: number) =>
  [vr, ...[4000, 4100, 4300, 4500].filter((v) => v !== vr)].slice(0, 4);

const FAMILII = [
  { anexa: "I", nume: "Învățământ și cercetare", Icon: GraduationCap, desc: "Profesori, educatori, didactic auxiliar, cercetători (CS I/II/III), institute de cercetare" },
  { anexa: "II", nume: "Sănătate și asistență socială", Icon: Stethoscope, desc: "Medici, asistente, infirmieri, asistenți sociali" },
  { anexa: "III", nume: "Cultură", Icon: Drama, desc: "Biblioteci, muzee, teatre, presa publică" },
  { anexa: "IV", nume: "Diplomație", Icon: Globe, desc: "Personal MAE, ambasade, consulate" },
  { anexa: "V", nume: "Justiție", Icon: Scale, desc: "Judecători, procurori, grefieri, executori" },
  { anexa: "VI", nume: "Apărare, ordine publică", Icon: Shield, desc: "Militari, poliție, penitenciare, ISU" },
  { anexa: "VII", nume: "Instituții din venituri proprii", Icon: Microscope, desc: "Personal din instituții publice finanțate integral din venituri proprii. Cercetătorii (CS I/II/III) sunt la Învățământ și cercetare." },
  { anexa: "VIII", nume: "Administrație", Icon: Landmark, desc: "Funcționari publici, personal contractual primării/instituții" },
  { anexa: "IX", nume: "Funcții de demnitate publică", Icon: Crown, desc: "Aleși locali, miniștri, parlamentari" },
];

type WizardState = {
  step: number;
  anexa: string;
  functieIdx: number | null;
  aniVechime: number;
  gradatieManual: number | null;
  sporuri: Record<string, { activ: boolean; procent?: number; ore?: number; fractie?: number }>;
  // Ore normă/lună — numitorul tarifului orar pentru sporurile orare. 0 = necompletat.
  oreNorma: number;
  salariuActual: number;
  valRef: number;
  scutireImpozit: boolean;
  // null = folosește auto-detecția; true/false = override manual
  conducereOverride: boolean | null;
  persoaneInIntretinere: number;
  // Deducerea personală suplimentară — art. 77 alin. (10) Cod fiscal
  sub26Ani: boolean;
  copiiInvatamant: number;
  coefSuplimentConducere: number; // pentru Anexa V conducere (judecători/procurori)
  // Anexa VI Art. 3(5) — coef. suplim. risc apărare/ordine publică (max +0.40)
  coefSuplimRiscAparare: number;
  // Anexa VI — cheia soldei de grad (cap. I.2). null = dedus automat din funcție;
  // string = override manual al gradului militar/profesional deținut.
  soldaGradKey: string | null;
  // Anexa V — reducere -10% pentru specialiști PÎCCJ/DNA/DIICOT, polițiști judiciari
  reducerePiccj: boolean;
  // Anexa II — Direcție Sănătate Publică (DSP) — Art. 7(6) limitează sporurile
  // de condiții doar la lit. a, b, c, e (NU d "condiții grele" 5%)
  esteDsp: boolean;
  // Art. 32 alin. (2)-(4) — sporuri/stimulente actuale care se EXCLUD din
  // baza de comparație pentru calculul diferenței tranzitorii.
  // Suma totală în lei (UE + gestionare fonduri + premii + stimulente).
  salariuActualExcluderi: number;
};

const initialState = (valRef: number): WizardState => ({
  step: 0,
  anexa: "",
  functieIdx: null,
  aniVechime: 5,
  gradatieManual: null,
  sporuri: {},
  oreNorma: 0,
  salariuActual: 0,
  valRef,
  scutireImpozit: false,
  conducereOverride: null,
  persoaneInIntretinere: 0,
  sub26Ani: false,
  copiiInvatamant: 0,
  coefSuplimentConducere: 0,
  coefSuplimRiscAparare: 0,
  soldaGradKey: null,
  reducerePiccj: false,
  esteDsp: false,
  salariuActualExcluderi: 0,
});

// Detectie funcții de conducere — art. 13 (1) excepție: coeficientul lor include
// deja vechimea la nivel maxim, deci gradațiile nu se mai aplică deasupra.
// Include și termenii specifici justiție (Anexa V) și înalți funcționari publici.
const FUNCTII_CONDUCERE_RE =
  /\b(rector|prorector|decan|prodecan|director|[șs]ef\b|şefă\b|manager(?:ial)?|prefect|subprefect|primar|viceprimar|pre[șs]edinte|vicepre[șs]edinte|comandant|inspector\s+(?:general|[șs]ef|şef)|secretar\s+general|secretar[- ]?[șs]ef|secretar-?\s*şef|contabil-?[șs]ef|contabil-?\s*şef|subsecretar\s+de\s+stat|demnitar|guvernator|ambasador|judec[ăa]tor|procuror|magistrat[- ]?asistent|prim[- ]?grefier|grefier[- ]?[șs]ef|înalt[ăa]?\s+func[țt]ionar\s+public)\b/i;
// Coloana grad: doar "Grad I/II/III" sau "Grad Managerial" cu G mare → conducere.
// "grad I" cu g mic / "gradul I" sunt grade de execuție personal contractual.
const GRAD_CONDUCERE_RE = /^Grad\s+(I{1,3}|[Mm]anagerial)(\s*\((minim|maxim)\))?$/;

export default function Wizard({ initialData }: Props) {
  const all = initialData.data;
  const variant = useVarianta();
  const [s, setS] = useState<WizardState>(() => initialState(variant.valoareReferinta));

  const selected = s.functieIdx !== null ? all[s.functieIdx] : null;

  const coefIncludeVechime = !!(selected?.vechime && selected.vechime.trim().length > 0);
  const gradMarcatConducere = !!(selected?.grad && GRAD_CONDUCERE_RE.test(selected.grad.trim()));
  const numeMarcatConducere = !!selected && FUNCTII_CONDUCERE_RE.test(selected.functie);
  const esteAnexaIX = selected?.anexa === "IX";
  const esteConducereAuto = gradMarcatConducere || numeMarcatConducere || esteAnexaIX;
  const esteConducere = s.conducereOverride === null ? esteConducereAuto : s.conducereOverride;
  // Gradațiile de vechime în muncă (art. 13) se aplică PESTE coeficientul din
  // anexă, care e stabilit la gradația 0 (art. 13 alin. 2). Excepții (gradația
  // e deja inclusă): funcțiile de conducere/înalți funcționari publici, Anexa V
  // (indemnizația de încadrare include gradul, gradația și vechimea în funcție)
  // și Anexa IX (demnitate publică — indemnizație lunară).
  // ATENȚIE: câmpul `vechime` din grilă (ex. învățământ, sănătate) e vechimea în
  // ÎNVĂȚĂMÂNT/specialitate care selectează coeficientul — NU se confundă cu
  // vechimea în muncă din art. 13, care se aplică pe deasupra.
  const skipGradatii = esteConducere || s.anexa === "V";

  // Tabelul de gradații depinde de anexa selectată (Anexa VI = militari/poliție = la 3 ani).
  const tabelGradatii: GradatieInfo[] = gradatiiForAnexa(s.anexa);

  const gradatie = skipGradatii
    ? 0
    : s.gradatieManual !== null
    ? s.gradatieManual
    : gradatieDinVechime(s.aniVechime, tabelGradatii);

  // Anexa VI Art. 3(5) — la coeficientul de salarizare se adaugă max +0.40
  // pentru misiuni/activități cu grad de efort/pericol (afectează solda de
  // funcție, NU sporurile; intră în baza de calcul gradații).
  const aplicaCoefRiscAparare = selected?.anexa === "VI";
  const coefEfectiv = selected
    ? selected.coeficient + (aplicaCoefRiscAparare ? s.coefSuplimRiscAparare : 0)
    : 0;
  const salariuG0 = selected ? coefEfectiv * s.valRef : 0;
  const salariuDupaGradatii = selected ? aplicaGradatie(salariuG0, gradatie, tabelGradatii) : 0;
  // Anexa V — pentru specialiști PÎCCJ/DNA/DIICOT, polițiști judiciari
  // (Art. 20, 17 alin. 3-5) salariul de bază e redus cu 10%.
  const aplicaReducerePiccj = selected?.anexa === "V";
  const salariuBaza = selected
    ? (aplicaReducerePiccj && s.reducerePiccj
        ? Math.ceil(salariuDupaGradatii * 0.9)
        : salariuDupaGradatii)
    : 0;

  // Filtrăm sporurile aplicabile pe anexa selectată (ex: medicii nu primesc +100% weekend
  // ci doar +10% tarif majorat; demnitarii primesc doar sporul UE).
  // Anexa II Art. 7(6): DSP (Direcție Sănătate Publică) poate primi doar
  // sporurile lit. a, b, c, e — NU lit. d (condiții grele 5%).
  const aplicaDsp = selected?.anexa === "II";
  const sporuriAplicabile: Spor[] = selected
    ? sporuriPentruAnexa(selected.anexa).filter(
        (sp) => !(aplicaDsp && s.esteDsp && sp.id === "conditii-grele-sanatate"),
      )
    : SPORURI_STANDARD;

  const sporuriState = sporuriAplicabile.map((sp) => ({
    spor: sp,
    activ: !!s.sporuri[sp.id]?.activ,
    procentCustom: s.sporuri[sp.id]?.procent,
    ore: s.sporuri[sp.id]?.ore,
    fractieTimp: s.sporuri[sp.id]?.fractie,
  }));

  // Coef supliment conducere se aplică doar pentru Anexa V conducere
  // (judecători/procurori cu funcții de conducere — Anexa V art. 8).
  const aplicaCoefSupliment = selected?.anexa === "V" && esteConducere;

  // Anexa VI — solda de grad. Gradul se deduce automat din funcție, dar poate fi
  // schimbat manual (soldaGradKey). Pentru celelalte anexe, coef = 0.
  const aplicaSoldaGrad = selected?.anexa === "VI";
  const soldaGradKeyEfectiv = aplicaSoldaGrad
    ? s.soldaGradKey ?? soldaGradPentruFunctie(selected!.functie)
    : null;
  const soldaGradEntry = soldaGradByKey(soldaGradKeyEfectiv, variant.soldeGrad);
  const soldaGradCoef = aplicaSoldaGrad && soldaGradEntry ? soldaGradEntry.coef : 0;
  const soldaGradLei = soldaGradCoef * s.valRef;

  const tax = selected
    ? calcBrut({
        salariuBaza,
        sporuri: sporuriState,
        valoareReferinta: s.valRef,
        oreNormaLunara: s.oreNorma,
        scutireImpozit: s.scutireImpozit,
        persoaneInIntretinere: s.persoaneInIntretinere,
        sub26Ani: s.sub26Ani,
        copiiInvatamant: s.copiiInvatamant,
        coefSuplimentConducere: aplicaCoefSupliment ? s.coefSuplimentConducere : 0,
        soldaGradCoef,
      })
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
  const reset = () => setS(initialState(variant.valoareReferinta));
  const goTo = (idx: number) => setS((p) => ({ ...p, step: idx }));

  const sectionRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    // La schimbarea pasului, aducem conținutul wizard-ului în vizor (sub banner),
    // ca utilizatorul să nu fie nevoit să scroleze peste header de fiecare dată.
    if (typeof window === "undefined") return;
    const el = sectionRef.current;
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 12;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }
  }, [current?.id]);

  return (
    <section ref={sectionRef} className="mx-auto max-w-3xl px-4 py-6 md:py-8">
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
            tabelGradatii={tabelGradatii}
            onAni={(n) => setS((p) => ({ ...p, aniVechime: n, gradatieManual: null }))}
          />
        )}
        {current?.id === "sporuri" && (
          <StepSporuri
            sporuri={s.sporuri}
            sporuriAplicabile={sporuriAplicabile}
            anexa={s.anexa}
            anexaNume={FAMILII.find((x) => x.anexa === s.anexa)?.nume ?? ""}
            toggle={(id) =>
              setS((p) => {
                const target = sporuriAplicabile.find((x) => x.id === id);
                const willActivate = !p.sporuri[id]?.activ;
                const nextSporuri = { ...p.sporuri, [id]: { ...p.sporuri[id], activ: willActivate } };
                // Dacă activăm un spor cu groupExclusiv, dezactivăm celelalte din același grup
                if (willActivate && target?.groupExclusiv) {
                  for (const sp of sporuriAplicabile) {
                    if (sp.id !== id && sp.groupExclusiv === target.groupExclusiv && nextSporuri[sp.id]?.activ) {
                      nextSporuri[sp.id] = { ...nextSporuri[sp.id], activ: false };
                    }
                  }
                }
                return { ...p, sporuri: nextSporuri };
              })
            }
            setProcent={(id, n) =>
              setS((p) => ({
                ...p,
                sporuri: { ...p.sporuri, [id]: { ...p.sporuri[id], activ: p.sporuri[id]?.activ ?? false, procent: n } },
              }))
            }
            setOre={(id, n) =>
              setS((p) => ({
                ...p,
                sporuri: { ...p.sporuri, [id]: { ...p.sporuri[id], activ: p.sporuri[id]?.activ ?? false, ore: n } },
              }))
            }
            setFractie={(id, n) =>
              setS((p) => ({
                ...p,
                sporuri: { ...p.sporuri, [id]: { ...p.sporuri[id], activ: p.sporuri[id]?.activ ?? false, fractie: n } },
              }))
            }
            oreNorma={s.oreNorma}
            setOreNorma={(n) => setS((p) => ({ ...p, oreNorma: n }))}
          />
        )}
        {current?.id === "actual" && (
          <StepActual
            valRef={s.valRef}
            setValRef={(n) => setS((p) => ({ ...p, valRef: n }))}
            salariuActual={s.salariuActual}
            setSalariuActual={(n) => setS((p) => ({ ...p, salariuActual: n }))}
            scutireImpozit={s.scutireImpozit}
            setScutireImpozit={(b) => setS((p) => ({ ...p, scutireImpozit: b }))}
            persoaneInIntretinere={s.persoaneInIntretinere}
            setPersoaneInIntretinere={(n) => setS((p) => ({ ...p, persoaneInIntretinere: n }))}
            sub26Ani={s.sub26Ani}
            setSub26Ani={(b) => setS((p) => ({ ...p, sub26Ani: b }))}
            copiiInvatamant={s.copiiInvatamant}
            setCopiiInvatamant={(n) => setS((p) => ({ ...p, copiiInvatamant: n }))}
            aplicaCoefSupliment={aplicaCoefSupliment}
            coefSuplimentConducere={s.coefSuplimentConducere}
            setCoefSuplimentConducere={(n) => setS((p) => ({ ...p, coefSuplimentConducere: n }))}
            aplicaCoefRiscAparare={aplicaCoefRiscAparare}
            coefSuplimRiscAparare={s.coefSuplimRiscAparare}
            setCoefSuplimRiscAparare={(n) => setS((p) => ({ ...p, coefSuplimRiscAparare: n }))}
            aplicaSoldaGrad={aplicaSoldaGrad}
            soldaGradKeyEfectiv={soldaGradKeyEfectiv}
            soldaGradAuto={s.soldaGradKey === null}
            soldaGradLei={soldaGradLei}
            setSoldaGradKey={(k) => setS((p) => ({ ...p, soldaGradKey: k }))}
            aplicaReducerePiccj={aplicaReducerePiccj}
            reducerePiccj={s.reducerePiccj}
            setReducerePiccj={(b) => setS((p) => ({ ...p, reducerePiccj: b }))}
            aplicaDsp={aplicaDsp}
            esteDsp={s.esteDsp}
            setEsteDsp={(b) => setS((p) => ({ ...p, esteDsp: b }))}
            salariuActualExcluderi={s.salariuActualExcluderi}
            setSalariuActualExcluderi={(n) =>
              setS((p) => ({ ...p, salariuActualExcluderi: n }))
            }
            esteConducereAuto={esteConducereAuto}
            esteConducere={esteConducere}
            conducereOverride={s.conducereOverride}
            setConducereOverride={(b) => setS((p) => ({ ...p, conducereOverride: b }))}
            coefIncludeVechime={coefIncludeVechime}
          />
        )}
        {current?.id === "rezultat" && selected && tax && (
          <StepRezultat
            functie={selected}
            valRef={s.valRef}
            gradatie={gradatie}
            tabelGradatii={tabelGradatii}
            skipGradatii={skipGradatii}
            coefIncludeVechime={coefIncludeVechime}
            esteConducere={esteConducere}
            scutireImpozit={s.scutireImpozit}
            salariuG0={salariuG0}
            salariuBaza={salariuBaza}
            soldaGrad={tax.soldaGrad}
            soldaGradLabel={soldaGradEntry?.label ?? null}
            tax={tax}
            salariuActual={s.salariuActual}
            salariuActualExcluderi={s.salariuActualExcluderi}
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
        (varianta din <EtichetaVarianta />).
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
  const variant = useVarianta();
  const filtered = useMemo(() => {
    let list = all;
    if (anexa) list = list.filter((e) => e.anexa === anexa);
    // Anexa VI: rândurile cap. I.2 (soldele de grad, coef ≤ 1.0 / 1.1) NU sunt funcții —
    // se aleg separat ca grad militar. Le scoatem din lista de funcții.
    list = list.filter((e) => !esteRandSoldaDeGrad(e, variant.soldeGrad));
    // Toate cuvintele căutate trebuie să apară (în nume, grad, capitol sau treaptă),
    // fără diacritice — „medic primar" găsește și „Medic *1)" + grad „primar".
    const tokens = foldText(query).split(" ").filter(Boolean);
    if (tokens.length) {
      list = list.filter((e) => {
        const h = foldText([e.functie, e.grad, e.capitol, e.subcapitol ?? ""].join(" "));
        return tokens.every((t) => h.includes(t));
      });
    }
    return list.slice(0, 150);
  }, [all, anexa, query, variant]);

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
                            e.subcapitol,
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
  tabelGradatii,
  onAni,
}: {
  aniVechime: number;
  currentGradatie: number;
  tabelGradatii: GradatieInfo[];
  onAni: (n: number) => void;
}) {
  const esteRegimAparare = tabelGradatii.length === 8; // GRADATII_APARARE
  const gradatieSafe = tabelGradatii[currentGradatie] ?? tabelGradatii[0];
  return (
    <div>
      <StepHeader
        nr={3}
        title="Câți ani de vechime în muncă ai?"
        desc="Toată vechimea în muncă (inclusiv sectorul privat — art. 13 alin. 6). E diferită de vechimea în învățământ/specialitate din grilă (aceea a stabilit deja coeficientul); gradația se adaugă peste coeficient, fiindcă grila e la gradația 0."
        IconFn={Award}
      />
      <div className="flex items-center justify-center gap-4 py-6">
        <input
          type="number"
          min={0}
          max={50}
          value={aniVechime}
          onChange={(e) => onAni(clampNumber(Number(e.target.value), 0, 60))}
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
          {gradatieSafe.numeRange}
        </div>
      </div>
      {esteRegimAparare && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          <Info className="shrink-0 w-4 h-4 text-emerald-600 mt-0.5" />
          <span>
            Regim Anexa VI (apărare, ordine publică, siguranță națională) —
            gradațiile sunt la 3 ani, fiecare +3% (Art. 4 alin. 3 Anexa VI).
          </span>
        </div>
      )}
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
              {tabelGradatii.map((g) => (
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
  sporuriAplicabile,
  anexa,
  anexaNume,
  toggle,
  setProcent,
  setOre,
  setFractie,
  oreNorma,
  setOreNorma,
}: {
  sporuri: Record<string, { activ: boolean; procent?: number; ore?: number; fractie?: number }>;
  sporuriAplicabile: Spor[];
  anexa: string;
  anexaNume: string;
  toggle: (id: string) => void;
  setProcent: (id: string, n: number) => void;
  setOre: (id: string, n: number) => void;
  setFractie: (id: string, n: number) => void;
  oreNorma: number;
  setOreNorma: (n: number) => void;
}) {
  // Grupez sporuri pe "generale" (Cap. IV — aplicabile pe ≥5 anexe sau fără
  // restricție) vs "specifice" (restrânse la 1-4 anexe — reglementări proprii).
  const generale = sporuriAplicabile.filter(
    (s) => !s.aplicabilAnexe || s.aplicabilAnexe.length >= 5,
  );
  const specifice = sporuriAplicabile.filter(
    (s) => s.aplicabilAnexe && s.aplicabilAnexe.length < 5,
  );

  // Există vreun spor orar activ? Atunci avem nevoie de „ore normă/lună".
  const areOrarActiv = sporuriAplicabile.some(
    (sp) => sp.inputKind === "orar" && sporuri[sp.id]?.activ,
  );

  return (
    <div>
      <StepHeader
        nr={4}
        title="Beneficiezi de sporuri?"
        desc="Bifează doar cele care ți se aplică efectiv. Plafonul de 20% (art. 21) se aplică agregat pe ordonatorul principal de credite, nu individual — îți semnalăm doar dacă suma ta personală îl depășește."
        IconFn={TrendingUp}
      />

      {areOrarActiv && (
        <div className={"mb-5 rounded-2xl border-2 p-4 " + (oreNorma > 0 ? "border-brand-300 bg-brand-50/60" : "border-amber-300 bg-amber-50")}>
          <label className="block">
            <span className="text-sm font-semibold text-slate-800">
              Ore normă / lună (programul lunar de lucru)
            </span>
            <span className="block text-xs text-slate-500 mt-0.5 leading-snug">
              Numitorul tarifului orar (tarif orar = salariu de bază ÷ ore normă). Completează numărul exact de ore al lunii respective — îl găsești pe fluturaș. Reper orientativ: ~{ORE_NORMA_REPER} h/lună la normă întreagă.
            </span>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={400}
                value={oreNorma || ""}
                placeholder="ex: 168"
                onChange={(e) => setOreNorma(clampNumber(Number(e.target.value), 0, 400))}
                className="w-24 rounded border border-slate-300 px-2 py-1 text-sm tabular-nums"
              />
              <span className="text-xs text-slate-600">ore / lună</span>
            </div>
          </label>
          {oreNorma <= 0 && (
            <p className="mt-2 text-xs font-medium text-amber-800">
              ⚠ Completează orele de normă ca sporurile orare bifate să fie calculate.
            </p>
          )}
        </div>
      )}

      {generale.length > 0 && (
        <SubSectionSporuri
          title="Sporuri generale (Cap. IV)"
          subtitle="Aplicabile transversal — CFP, fonduri UE, ore noapte/suplimentare, handicap, premii performanță, etc."
          sporuri={sporuri}
          list={generale}
          toggle={toggle}
          setProcent={setProcent}
          setOre={setOre}
          setFractie={setFractie}
        />
      )}

      {specifice.length > 0 && (
        <SubSectionSporuri
          title={`Sporuri specifice Anexei ${anexa}${anexaNume ? ` — ${anexaNume}` : ""}`}
          subtitle="Reglementări proprii sectorului tău — vezi descrierea fiecăruia pentru articolul aplicabil."
          sporuri={sporuri}
          list={specifice}
          toggle={toggle}
          setProcent={setProcent}
          setOre={setOre}
          setFractie={setFractie}
        />
      )}

      <div className="mt-4 flex items-start gap-2 text-xs text-slate-500">
        <Info className="shrink-0 w-4 h-4 text-brand-500 mt-0.5" strokeWidth={2} />
        <p>Dacă nu ai niciun spor, mergi direct mai departe.</p>
      </div>
    </div>
  );
}

function SubSectionSporuri({
  title,
  subtitle,
  sporuri,
  list,
  toggle,
  setProcent,
  setOre,
  setFractie,
}: {
  title: string;
  subtitle: string;
  sporuri: Record<string, { activ: boolean; procent?: number; ore?: number; fractie?: number }>;
  list: Spor[];
  toggle: (id: string) => void;
  setProcent: (id: string, n: number) => void;
  setOre: (id: string, n: number) => void;
  setFractie: (id: string, n: number) => void;
}) {
  return (
    <div className="mb-6">
      <div className="mb-3">
        <h3 className="text-xs font-bold tracking-wider text-brand-700 uppercase">{title}</h3>
        <p className="text-xs text-slate-500 mt-0.5 leading-snug">{subtitle}</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {list.map((spor) => {
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
                  {activ && spor.inputKind === "orar" && (
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <input
                        type="number"
                        min={0}
                        max={400}
                        value={st?.ore ?? ""}
                        placeholder="0"
                        onChange={(e) =>
                          setOre(spor.id, clampNumber(Number(e.target.value), 0, 400))
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="w-20 rounded border border-slate-300 px-2 py-1 text-sm tabular-nums"
                      />
                      <span className="text-xs text-slate-600">{spor.unitateOre ?? "ore / lună"}</span>
                      <span className="text-[11px] text-slate-400">× {spor.valoare}% din tariful orar</span>
                    </div>
                  )}
                  {activ && spor.inputKind === "selectie" && (
                    <div className="mt-2 flex items-center gap-2">
                      <select
                        value={st?.procent ?? spor.valoare}
                        onChange={(e) => setProcent(spor.id, Number(e.target.value))}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      >
                        {spor.optiuni?.map((o) => (
                          <option key={o.valoare} value={o.valoare}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {activ && spor.inputKind === "proportional" && (
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={st?.fractie ?? 100}
                        onChange={(e) =>
                          setFractie(spor.id, clampNumber(Number(e.target.value), 0, 100))
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="w-16 rounded border border-slate-300 px-2 py-1 text-sm tabular-nums"
                      />
                      <span className="text-xs text-slate-600">% din timp lucrat în condiții</span>
                      <span className="text-[11px] text-slate-400">→ {spor.valoare}% × fracțiune</span>
                    </div>
                  )}
                  {activ && spor.tip === "procent" && !spor.inputKind && (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={spor.valoare}
                        value={st?.procent ?? spor.valoare}
                        onChange={(e) =>
                          setProcent(spor.id, clampNumber(Number(e.target.value), 0, 100))
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="w-16 rounded border border-slate-300 px-2 py-1 text-sm tabular-nums"
                      />
                      <span className="text-xs text-slate-600">% din baza</span>
                    </div>
                  )}
                  {activ && spor.tip === "lei" && (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={5000}
                        step={50}
                        value={st?.procent ?? spor.valoare}
                        onChange={(e) =>
                          setProcent(spor.id, clampNumber(Number(e.target.value), 0, 5000))
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="w-20 rounded border border-slate-300 px-2 py-1 text-sm tabular-nums"
                      />
                      <span className="text-xs text-slate-600">lei / lună</span>
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
    </div>
  );
}

function StepActual({
  valRef,
  setValRef,
  salariuActual,
  setSalariuActual,
  scutireImpozit,
  setScutireImpozit,
  persoaneInIntretinere,
  setPersoaneInIntretinere,
  sub26Ani,
  setSub26Ani,
  copiiInvatamant,
  setCopiiInvatamant,
  aplicaCoefSupliment,
  coefSuplimentConducere,
  setCoefSuplimentConducere,
  aplicaCoefRiscAparare,
  coefSuplimRiscAparare,
  setCoefSuplimRiscAparare,
  aplicaSoldaGrad,
  soldaGradKeyEfectiv,
  soldaGradAuto,
  soldaGradLei,
  setSoldaGradKey,
  aplicaReducerePiccj,
  reducerePiccj,
  setReducerePiccj,
  aplicaDsp,
  esteDsp,
  setEsteDsp,
  salariuActualExcluderi,
  setSalariuActualExcluderi,
  esteConducereAuto,
  esteConducere,
  conducereOverride,
  setConducereOverride,
  coefIncludeVechime,
}: {
  valRef: number;
  setValRef: (n: number) => void;
  salariuActual: number;
  setSalariuActual: (n: number) => void;
  scutireImpozit: boolean;
  setScutireImpozit: (b: boolean) => void;
  persoaneInIntretinere: number;
  setPersoaneInIntretinere: (n: number) => void;
  sub26Ani: boolean;
  setSub26Ani: (b: boolean) => void;
  copiiInvatamant: number;
  setCopiiInvatamant: (n: number) => void;
  aplicaCoefSupliment: boolean;
  coefSuplimentConducere: number;
  setCoefSuplimentConducere: (n: number) => void;
  aplicaCoefRiscAparare: boolean;
  coefSuplimRiscAparare: number;
  setCoefSuplimRiscAparare: (n: number) => void;
  aplicaSoldaGrad: boolean;
  soldaGradKeyEfectiv: string | null;
  soldaGradAuto: boolean;
  soldaGradLei: number;
  setSoldaGradKey: (k: string | null) => void;
  aplicaReducerePiccj: boolean;
  reducerePiccj: boolean;
  setReducerePiccj: (b: boolean) => void;
  aplicaDsp: boolean;
  esteDsp: boolean;
  setEsteDsp: (b: boolean) => void;
  salariuActualExcluderi: number;
  setSalariuActualExcluderi: (n: number) => void;
  esteConducereAuto: boolean;
  esteConducere: boolean;
  conducereOverride: boolean | null;
  setConducereOverride: (b: boolean | null) => void;
  coefIncludeVechime: boolean;
}) {
  const variant = useVarianta();
  return (
    <div>
      <StepHeader
        nr={5}
        title="Ultimii pași (opționali)"
        desc="Ne ajută să-ți arătăm diferența față de salariul actual și să aplicăm corect fiscalitatea."
        IconFn={Banknote}
      />
      <div className="space-y-4">
        <label
          className={
            "block rounded-2xl border-2 p-5 cursor-pointer transition " +
            (scutireImpozit
              ? "border-emerald-500 bg-emerald-50"
              : "border-slate-200 hover:border-emerald-300 bg-white")
          }
        >
          <div className="flex items-start gap-3">
            <div
              className={
                "shrink-0 mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded border-2 transition " +
                (scutireImpozit
                  ? "bg-emerald-600 border-emerald-600 text-white"
                  : "border-slate-300 bg-white")
              }
            >
              {scutireImpozit && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
            </div>
            <input
              type="checkbox"
              checked={scutireImpozit}
              onChange={(e) => setScutireImpozit(e.target.checked)}
              className="sr-only"
            />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-slate-900 text-sm">
                Scutire de impozit pe venit
              </div>
              <div className="text-xs text-slate-600 mt-1 leading-snug">
                Bifează dacă te încadrezi în art. 60 din Codul fiscal: persoană cu{" "}
                <strong>handicap grav sau accentuat</strong>, personal{" "}
                <strong>cercetare-dezvoltare</strong> sau <strong>programator IT</strong>.
                Impozitul pe veniturile salariale devine 0%; CAS și CASS rămân.
              </div>
            </div>
          </div>
        </label>

        {esteConducereAuto && !coefIncludeVechime && (
          <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5">
            <div className="flex items-start gap-2 mb-3">
              <Info className="shrink-0 w-5 h-5 text-amber-600 mt-0.5" />
              <div className="text-sm text-amber-900">
                Am detectat această poziție ca <strong>funcție de conducere</strong> —
                conform art. 13 (1), coeficientul include deja vechimea, deci{" "}
                gradațiile <strong>nu se aplică</strong> peste salariul de bază.
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setConducereOverride(null)}
                className={
                  "text-xs px-3 py-1.5 rounded-lg border-2 transition " +
                  (conducereOverride === null
                    ? "bg-amber-600 text-white border-amber-600"
                    : "bg-white border-amber-200 text-amber-900 hover:border-amber-400")
                }
              >
                Auto (conducere)
              </button>
              <button
                onClick={() => setConducereOverride(false)}
                className={
                  "text-xs px-3 py-1.5 rounded-lg border-2 transition " +
                  (conducereOverride === false
                    ? "bg-amber-600 text-white border-amber-600"
                    : "bg-white border-amber-200 text-amber-900 hover:border-amber-400")
                }
              >
                Nu, e funcție de execuție → aplică gradații
              </button>
            </div>
          </div>
        )}

        {!esteConducereAuto && !coefIncludeVechime && (
          <details className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
            <summary className="cursor-pointer text-slate-700 select-none">
              Ești pe funcție de conducere și nu am detectat-o?
            </summary>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-600">Tratează ca:</span>
              <button
                onClick={() => setConducereOverride(null)}
                className={
                  "text-xs px-3 py-1.5 rounded-lg border-2 transition " +
                  (conducereOverride === null
                    ? "bg-slate-700 text-white border-slate-700"
                    : "bg-white border-slate-200 text-slate-700 hover:border-slate-400")
                }
              >
                Auto (execuție)
              </button>
              <button
                onClick={() => setConducereOverride(true)}
                className={
                  "text-xs px-3 py-1.5 rounded-lg border-2 transition " +
                  (conducereOverride === true
                    ? "bg-slate-700 text-white border-slate-700"
                    : "bg-white border-slate-200 text-slate-700 hover:border-slate-400")
                }
              >
                Da, conducere → nu aplica gradații
              </button>
            </div>
          </details>
        )}

        <div className="rounded-2xl border border-slate-200 p-5">
          <label className="block">
            <span className="text-sm font-semibold text-slate-800 block">
              Persoane în întreținere
            </span>
            <span className="block text-xs text-slate-500 mt-0.5">
              Pentru deducerea personală (Cod fiscal). Lasă 0 dacă nu ai persoane în întreținere.
            </span>
            <div className="mt-3 flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={10}
                value={persoaneInIntretinere}
                onChange={(e) => setPersoaneInIntretinere(clampNumber(Number(e.target.value), 0, 10))}
                className="w-24 rounded-xl border border-slate-300 px-3 py-2.5 text-lg tabular-nums focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
              <span className="text-sm text-slate-600">persoane</span>
            </div>
          </label>
          <span className="block text-xs text-slate-500 mt-2">
            Deducerea de bază (art. 77 alin. 4 Cod fiscal) se acordă doar pentru un venit brut de până
            la salariul minim + 2.000 lei; peste, doar deducerile de mai jos.
          </span>
          <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={sub26Ani}
              onChange={(e) => setSub26Ani(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            Am până la 26 de ani (deducere suplimentară 15% din salariul minim, art. 77 alin. 10 lit. a)
          </label>
          <label className="mt-3 block">
            <span className="text-sm text-slate-700">
              Copii până la 18 ani înscriși la școală/grădiniță (100 lei/copil, art. 77 alin. 10 lit. b) — o
              singură dată, la unul dintre părinți
            </span>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={20}
                value={copiiInvatamant}
                onChange={(e) => setCopiiInvatamant(clampNumber(Number(e.target.value), 0, 20))}
                className="w-24 rounded-xl border border-slate-300 px-3 py-2 tabular-nums focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
              <span className="text-sm text-slate-600">copii</span>
            </div>
          </label>
        </div>

        {aplicaCoefSupliment && (
          <div className="rounded-2xl border-2 border-indigo-300 bg-indigo-50 p-5">
            <label className="block">
              <span className="text-sm font-semibold text-indigo-900 block">
                Funcția de conducere (Anexa V Art. 8)
              </span>
              <span className="block text-xs text-indigo-800 mt-0.5">
                Pentru judecători/procurori cu funcții de conducere, la indemnizația
                maximă se adaugă <strong>coef × valoarea de referință</strong>. Alege funcția exactă:
              </span>
              <select
                value={coefSuplimentConducere || ""}
                onChange={(e) => setCoefSuplimentConducere(Number(e.target.value) || 0)}
                className="mt-3 w-full rounded-xl border border-indigo-300 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">— nu sunt conducere / nu se aplică —</option>
                <optgroup label="ÎCCJ și Parchetul de pe lângă ÎCCJ (DNA / DIICOT)">
                  {COEFICIENTI_CONDUCERE_JUSTITIE.filter((c) => c.categorie === "ICCJ").map((c) => (
                    <option key={c.id} value={c.coef}>
                      {c.coef.toFixed(2)} — {c.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Curți de apel, tribunale, judecătorii">
                  {COEFICIENTI_CONDUCERE_JUSTITIE.filter((c) => c.categorie === "Curti").map((c) => (
                    <option key={c.id} value={c.coef}>
                      {c.coef.toFixed(2)} — {c.label}
                    </option>
                  ))}
                </optgroup>
              </select>
              {coefSuplimentConducere > 0 && (
                <p className="mt-2 text-xs text-indigo-700">
                  Coef. ales: <strong className="tabular-nums">{coefSuplimentConducere}</strong> × val. ref. = adaos la indemnizația de încadrare.
                </p>
              )}
            </label>
          </div>
        )}

        {aplicaSoldaGrad && (
          <div className="rounded-2xl border-2 border-sky-300 bg-sky-50 p-5">
            <label className="block">
              <span className="text-sm font-semibold text-sky-900 block">
                Gradul militar / profesional deținut — solda de grad (Anexa VI cap. I.2)
              </span>
              <span className="block text-xs text-sky-800 mt-0.5">
                Solda lunară = <strong>solda de funcție</strong> (de mai sus) +{" "}
                <strong>solda de grad</strong>, conform art. 2 alin. (2). Gradul e dedus
                automat din funcția aleasă; schimbă-l dacă gradul tău efectiv diferă.
                Solda de grad NU primește gradații de vechime (art. 4 alin. 3).
              </span>
              <select
                value={soldaGradKeyEfectiv ?? ""}
                onChange={(e) => setSoldaGradKey(e.target.value || null)}
                className="mt-3 w-full rounded-xl border border-sky-300 px-3 py-2.5 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
              >
                {variant.soldeGrad.map((g) => (
                  <option key={g.key} value={g.key}>
                    {g.coef.toFixed(3)} — {g.label}
                  </option>
                ))}
              </select>
              <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                <span className="text-sky-700">
                  {soldaGradAuto ? "Dedus automat din funcție." : "Grad ales manual."}
                </span>
                {!soldaGradAuto && (
                  <button
                    type="button"
                    onClick={() => setSoldaGradKey(null)}
                    className="font-medium text-sky-700 underline hover:text-sky-900"
                  >
                    Revino la auto
                  </button>
                )}
              </div>
              {soldaGradLei > 0 && (
                <p className="mt-2 text-xs text-sky-700">
                  Solda de grad ={" "}
                  <strong className="tabular-nums">
                    {Math.round(soldaGradLei).toLocaleString("ro-RO")} lei
                  </strong>{" "}
                  (se adaugă la solda de funcție în brut).
                </p>
              )}
            </label>
          </div>
        )}

        {aplicaCoefRiscAparare && (
          <div className="rounded-2xl border-2 border-rose-300 bg-rose-50 p-5">
            <label className="block">
              <span className="text-sm font-semibold text-rose-900 block">
                Coeficient suplimentar risc / pericol (Anexa VI Art. 3 alin. 5)
              </span>
              <span className="block text-xs text-rose-800 mt-0.5">
                Pentru militari, polițiști și polițiști de penitenciare. Se adaugă la
                coeficientul de salarizare (max <strong>+0.40</strong>) pentru criterii ca:
                misiuni operative, poliție judiciară, structuri NATO/UE/OSCE/ONU,
                anticorupție internă, cifru de stat, condiții speciale (cai/câini etc.).
                Stabilit prin ordin al ordonatorului principal de credite.
              </span>
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={0.4}
                  step={0.05}
                  value={coefSuplimRiscAparare}
                  onChange={(e) => setCoefSuplimRiscAparare(clampNumber(Number(e.target.value), 0, 0.4))}
                  className="w-24 rounded-xl border border-rose-300 px-3 py-2.5 text-lg tabular-nums focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-100"
                />
                <span className="text-sm text-rose-700">+ la coef. salarizare (max 0.40)</span>
              </div>
              {coefSuplimRiscAparare > 0 && (
                <p className="mt-2 text-xs text-rose-700">
                  Solda de funcție crește cu{" "}
                  <strong className="tabular-nums">{coefSuplimRiscAparare}</strong> × val. ref. înainte de gradații.
                </p>
              )}
            </label>
          </div>
        )}

        {aplicaReducerePiccj && (
          <label
            className={
              "block rounded-2xl border-2 p-5 cursor-pointer transition " +
              (reducerePiccj
                ? "border-orange-500 bg-orange-50"
                : "border-slate-200 hover:border-orange-300 bg-white")
            }
          >
            <div className="flex items-start gap-3">
              <div
                className={
                  "shrink-0 mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded border-2 transition " +
                  (reducerePiccj
                    ? "bg-orange-600 border-orange-600 text-white"
                    : "border-slate-300 bg-white")
                }
              >
                {reducerePiccj && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
              </div>
              <input
                type="checkbox"
                checked={reducerePiccj}
                onChange={(e) => setReducerePiccj(e.target.checked)}
                className="sr-only"
              />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-900 text-sm">
                  Reducere -10% (specialiști PÎCCJ / DNA / DIICOT / polițiști judiciari)
                </div>
                <div className="text-xs text-slate-600 mt-1 leading-snug">
                  Anexa V Art. 20 / Art. 17 alin. (3)-(5) — pentru specialiștii din cadrul
                  PÎCCJ, DNA, DIICOT și pentru ofițerii de poliție judiciară, salariul
                  de bază se calculează cu reducere de 10% față de funcțiile asimilate.
                </div>
              </div>
            </div>
          </label>
        )}

        {aplicaDsp && (
          <label
            className={
              "block rounded-2xl border-2 p-5 cursor-pointer transition " +
              (esteDsp
                ? "border-teal-500 bg-teal-50"
                : "border-slate-200 hover:border-teal-300 bg-white")
            }
          >
            <div className="flex items-start gap-3">
              <div
                className={
                  "shrink-0 mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded border-2 transition " +
                  (esteDsp
                    ? "bg-teal-600 border-teal-600 text-white"
                    : "border-slate-300 bg-white")
                }
              >
                {esteDsp && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
              </div>
              <input
                type="checkbox"
                checked={esteDsp}
                onChange={(e) => setEsteDsp(e.target.checked)}
                className="sr-only"
              />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-900 text-sm">
                  Lucrez la Direcția de Sănătate Publică (DSP)
                </div>
                <div className="text-xs text-slate-600 mt-1 leading-snug">
                  Anexa II Art. 7 alin. (6) — personalul DSP poate beneficia DOAR de
                  sporurile condiții lit. a (neonatologie), b (nivel I), c (nivel II)
                  și e (radiații). Sporul lit. d (condiții grele 5%) NU se aplică.
                </div>
              </div>
            </div>
          </label>
        )}

        <div className="rounded-2xl border border-slate-200 p-5 bg-slate-50">
          <label className="block">
            <span className="text-sm font-semibold text-slate-800 block">
              Salariul tău BRUT actual TOTAL ({variant.referintaDiferentaTranzitorie})
            </span>
            <span className="block text-xs text-slate-500 mt-0.5">
              Opțional — pentru calcul diferență tranzitorie ({variant.articolDiferentaTranzitorie}). Introdu valoarea
              TOTALĂ brută (cu toate sporurile/premiile/stimulentele). Excluderile le bifezi
              mai jos.
            </span>
            <div className="mt-3 flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={salariuActual || ""}
                onChange={(e) => setSalariuActual(clampNumber(Number(e.target.value), 0, 1_000_000))}
                placeholder="ex: 7500"
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-lg tabular-nums focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
              <span className="text-sm text-slate-600">lei</span>
            </div>
          </label>
          {salariuActual > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <label className="block">
                <span className="text-sm font-semibold text-amber-800 block">
                  Sporuri/premii actuale EXCLUSE din baza de comparație ({variant.articolDiferentaTranzitorie} alin. 2-4)
                </span>
                <span className="block text-xs text-slate-600 mt-0.5 leading-snug">
                  Suma TOTALĂ lunară a sporurilor care, conform legii, NU intră în baza de
                  comparație pentru calculul diferenței tranzitorii:
                </span>
                <ul className="mt-2 text-xs text-slate-600 list-disc list-inside space-y-0.5 leading-snug">
                  <li>spor pentru proiecte cu fonduri europene (art. 15)</li>
                  <li>spor gestionare fonduri externe (art. 16, Lg.490/2004)</li>
                  <li>premii de performanță (art. 22)</li>
                  <li>stimulente acordate pentru gestionarea financiară a fondurilor UE</li>
                  <li>compensații de risc misiuni externe (apărare)</li>
                </ul>
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={salariuActual}
                    value={salariuActualExcluderi || ""}
                    onChange={(e) =>
                      setSalariuActualExcluderi(
                        clampNumber(Number(e.target.value), 0, salariuActual),
                      )
                    }
                    placeholder="0"
                    className="w-full rounded-xl border border-amber-300 px-4 py-2.5 text-lg tabular-nums focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100"
                  />
                  <span className="text-sm text-amber-700">lei</span>
                </div>
                {salariuActualExcluderi > 0 && (
                  <p className="mt-2 text-xs text-amber-700">
                    Baza de comparație: <strong className="tabular-nums">{(salariuActual - salariuActualExcluderi).toLocaleString("ro-RO")} lei</strong>
                    {" "}(salariu actual − excluderi).
                  </p>
                )}
              </label>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 p-5">
          <label className="block">
            <span className="text-sm font-semibold text-slate-800 block">
              Valoarea de referință
            </span>
            <span className="block text-xs text-slate-500 mt-0.5">
              Pentru <strong>{variant.perioadaValoareReferinta}</strong> este fixată prin
              lege la{" "}
              <strong>{variant.valoareReferinta.toLocaleString("ro-RO")} lei</strong> (
              {variant.articolValoareReferinta}, varianta din {variant.eticheta}). Din 2028
              va fi stabilită anual prin HG. Modifică dacă vrei să simulezi alte valori.
            </span>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <input
                type="number"
                min={0}
                value={valRef}
                onChange={(e) => setValRef(clampNumber(Number(e.target.value), 0, 100_000))}
                className="w-32 rounded-xl border border-slate-300 px-3 py-2.5 text-lg tabular-nums focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
              <span className="text-sm text-slate-600">lei</span>
              <div className="ml-auto flex gap-1">
                {valoriRapide(variant.valoareReferinta).map((v) => (
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
  tabelGradatii,
  skipGradatii,
  coefIncludeVechime,
  esteConducere,
  scutireImpozit,
  salariuG0,
  salariuBaza,
  soldaGrad,
  soldaGradLabel,
  tax,
  salariuActual,
  salariuActualExcluderi,
  onReset,
}: {
  functie: CoefEntry;
  valRef: number;
  gradatie: number;
  tabelGradatii: GradatieInfo[];
  skipGradatii: boolean;
  coefIncludeVechime: boolean;
  esteConducere: boolean;
  scutireImpozit: boolean;
  salariuG0: number;
  salariuBaza: number;
  soldaGrad: number;
  soldaGradLabel: string | null;
  tax: ReturnType<typeof calcBrut>;
  salariuActual: number;
  salariuActualExcluderi: number;
  onReset: () => void;
}) {
  const fmt = (n: number) => n.toLocaleString("ro-RO", { maximumFractionDigits: 0 });
  // Pentru militari (Anexa VI), salariul de bază afișat = solda de funcție + solda de grad.
  const variant = useVarianta();
  const areSoldaGrad = soldaGrad > 0;
  const bazaTotala = Math.round(salariuBaza) + soldaGrad;
  // Art. 32 alin. (2)-(4): baza de comparație exclude sporurile UE, gestionare fonduri,
  // premii, stimulente. Diferența tranzitorie se calculează pe baza acestei valori reduse.
  const bazaComparatie = Math.max(0, salariuActual - salariuActualExcluderi);
  const diferentaTranzitorie = Math.max(0, bazaComparatie - tax.salariuBrut);
  const cresterePotentiala = tax.salariuBrut - bazaComparatie;

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
          label={areSoldaGrad ? "Salariu de bază (soldă lunară)" : "Salariu de bază"}
          value={`${fmt(areSoldaGrad ? bazaTotala : salariuBaza)} lei`}
          sub={
            areSoldaGrad
              ? `soldă funcție ${fmt(salariuBaza)} + soldă grad ${fmt(soldaGrad)} lei`
              : skipGradatii
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
            {functie.anexa === "V"
              ? `Anexa V (justiție) — indemnizația de încadrare include deja gradul, gradația și vechimea în funcție (art. 13 alin. 1), deci gradațiile nu se mai adaugă.`
              : functie.anexa === "IX"
              ? `Anexa IX (demnitate publică) — se acordă indemnizație lunară, fără gradații de vechime.`
              : `Funcție de conducere — gradația este inclusă în coeficient la nivel maxim conform art. 13 alin. (1).`}
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
            Comparație cu salariul actual ({variant.articolDiferentaTranzitorie})
          </h3>
          <div className="grid sm:grid-cols-2 gap-2 text-sm text-slate-600 mb-3">
            <div>
              Brut actual total ({variant.referintaDiferentaTranzitorie}):{" "}
              <strong className="tabular-nums text-slate-900">{fmt(salariuActual)} lei</strong>
            </div>
            <div>
              Brut nou (calculat):{" "}
              <strong className="tabular-nums text-slate-900">{fmt(tax.salariuBrut)} lei</strong>
            </div>
            {salariuActualExcluderi > 0 && (
              <>
                <div>
                  − Excluderi (UE / fonduri / premii):{" "}
                  <strong className="tabular-nums text-amber-700">−{fmt(salariuActualExcluderi)} lei</strong>
                </div>
                <div>
                  = Bază comparație {variant.articolDiferentaTranzitorie}:{" "}
                  <strong className="tabular-nums text-slate-900">{fmt(bazaComparatie)} lei</strong>
                </div>
              </>
            )}
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
              Drept individual până la egalizare — {variant.articolDiferentaTranzitorie}.
              {variant.limitaDiferentaTranzitorie
                ? ` Acordat lunar, cel târziu până la ${variant.limitaDiferentaTranzitorie}.`
                : " Se reduce pe măsura creșterilor salariale ulterioare, până la stingere (fără dată-limită în această variantă)."}
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
          {areSoldaGrad ? (
            <>
              <LineItem label="= Soldă de funcție" value={`${fmt(salariuBaza)} lei`} bold />
              <LineItem
                label={`+ Soldă de grad${soldaGradLabel ? ` (${soldaGradLabel.split(";")[0]})` : ""}`}
                value={`+${fmt(soldaGrad)} lei`}
                positive
              />
              <LineItem label="= Salariu de bază (soldă lunară)" value={`${fmt(bazaTotala)} lei`} bold />
            </>
          ) : (
            <LineItem label="= Salariu de bază" value={`${fmt(salariuBaza)} lei`} bold />
          )}
          {tax.sporuriProcent > 0 && (
            <LineItem
              label="+ Sporuri în plafon"
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
          {tax.deductibil > 0 && (
            <LineItem
              label={`+ Deducere personală (${tax.deductibil} lei)`}
              value="aplicată"
              positive
            />
          )}
          <LineItem
            label={
              scutireImpozit
                ? "− Impozit pe venit (scutire art. 60 Cod fiscal)"
                : "− Impozit 10% pe venit"
            }
            value={
              scutireImpozit ? "0 lei" : `−${fmt(tax.impozit)} lei`
            }
            negative={!scutireImpozit}
            positive={scutireImpozit}
          />
          <LineItem label="= Salariu NET" value={`${fmt(tax.salariuNet)} lei`} bold />
        </div>
      </details>

      {tax.sporuriDepasescPlafon && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="shrink-0 w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <strong>Atenție:</strong> suma sporurilor tale „în plafon" depășește 20% din
            salariul de bază individual. Art. 21 alin. (2) impune limita de 20% ca medie
            pe ordonatorul principal de credite (instituție), nu pe persoană — angajatorul
            tău trebuie să se încadreze pe TOTAL angajați; tu individual poți depăși, dar
            instituția trebuie să compenseze. Calculul tău rămâne neschimbat.
          </div>
        </div>
      )}

      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
        <Info className="shrink-0 w-4 h-4 text-slate-500 mt-0.5" />
        <div>
          <strong>Nu sunt incluse în calcul:</strong> indemnizația de hrană (~347 lei/lună),
          voucherele de vacanță (1.450 lei/an) și alte drepturi reglementate prin acte
          separate de proiectul MMFTSS. Aceste sume se adaugă peste salariul net afișat
          aici, fără să fie supuse impozitului pe venit.
        </div>
      </div>

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
        Estimare orientativă. Proiectul de lege nu este adoptat; calculele se bazează pe
        varianta {variant.numar} a proiectului ({variant.eticheta}), cu valoarea de
        referință de {variant.valoareReferinta.toLocaleString("ro-RO")} lei.
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
