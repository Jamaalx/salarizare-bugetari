"use client";

import { useMemo, useState } from "react";
import { useVarianta } from "@/lib/varianta-context";
import {
  calcBrut,
  aplicaGradatie,
  GRADATII,
  SPORURI_STANDARD,
  ORE_NORMA_REPER,
  gradatieDinVechime,
  sporuriPentruAnexa,
  clampNumber,
  soldaGradByKey,
  soldaGradPentruFunctie,
  esteRandSoldaDeGrad,
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
  subcapitol?: string;
  coeficientEsalonat?: Record<string, number>;
};

type Props = {
  initialData: { sheets: any[]; data: CoefEntry[] };
};

// Text fără diacritice, litere mici — pentru căutare.
const foldText = (s: string) =>
  s
    .toLowerCase()
    .replace(/[șş]/g, "s")
    .replace(/[țţ]/g, "t")
    .replace(/[ăâ]/g, "a")
    .replace(/î/g, "i")
    .replace(/\s+/g, " ")
    .trim();

export default function Calculator({ initialData }: Props) {
  const all = initialData.data;
  const variant = useVarianta();

  // Corecturi de denumire vs `anexaNume` din date: Anexa VII e „instituții din
  // venituri proprii" (nu „Cercetare"); cercetătorii (CS I/II/III) sunt în Anexa I.
  const ANEXA_NUME_FIX: Record<string, string> = {
    I: "Învățământ și cercetare",
    VII: "Instituții din venituri proprii",
  };

  // grouped: by anexa → list
  const anexe = useMemo(() => {
    const set = new Map<string, string>();
    for (const e of all) {
      if (e.anexa && !set.has(e.anexa)) set.set(e.anexa, ANEXA_NUME_FIX[e.anexa] ?? e.anexaNume);
    }
    return Array.from(set.entries()).sort();
  }, [all]);

  const [anexa, setAnexa] = useState<string>("");
  const [search, setSearch] = useState("");
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const [valRef, setValRef] = useState<number>(variant.valoareReferinta);
  const [aniVechime, setAniVechime] = useState<number>(10);
  const [gradatieManual, setGradatieManual] = useState<number | null>(null);

  // sporuri state
  const [sporuriState, setSporuriState] = useState(() =>
    SPORURI_STANDARD.map((s) => ({
      spor: s,
      activ: false,
      procentCustom: undefined as number | undefined,
      ore: undefined as number | undefined,
      fractieTimp: undefined as number | undefined,
    }))
  );

  // ore normă/lună — numitorul tarifului orar pentru sporurile orare
  const [oreNorma, setOreNorma] = useState<number>(0);

  // Anexa VI — solda de grad (cap. I.2). null = dedus automat din funcție.
  const [soldaGradKey, setSoldaGradKey] = useState<string | null>(null);

  // salariu actual pentru diferența tranzitorie
  const [salariuActual, setSalariuActual] = useState<number>(0);

  // Filter dataset
  const filtered = useMemo(() => {
    let list = all;
    if (anexa) list = list.filter((e) => e.anexa === anexa);
    // Anexa VI: soldele de grad (cap. I.2) nu sunt funcții — se aleg separat.
    list = list.filter((e) => !esteRandSoldaDeGrad(e, variant.soldeGrad));
    // Toate cuvintele căutate trebuie să apară, fără diacritice.
    const tokens = foldText(search).split(" ").filter(Boolean);
    if (tokens.length) {
      list = list.filter((e) => {
        const h = foldText([e.functie, e.grad, e.capitol, e.subcapitol ?? "", e.cod].join(" "));
        return tokens.every((t) => h.includes(t));
      });
    }
    return list.slice(0, 200);
  }, [all, anexa, search, variant]);

  const selected = selectedIdx !== null ? all[selectedIdx] : null;

  // Pentru funcții al căror coeficient include deja vechimea
  // (învățământ universitar, personal sanitar etc. — `vechime` non-vid)
  // SAU funcții de conducere (coeficient include gradația max)
  const coefIncludeVechime = !!(selected && selected.vechime && selected.vechime.trim().length > 0);
  const esteConducere = !!(selected && selected.grad && /grad\s*(i|ii|iii|managerial)/i.test(selected.grad));
  // Gradațiile art. 13 se aplică peste coeficientul din anexă (stabilit la
  // gradația 0). Excepții unde gradația e deja inclusă: conducere, Anexa V
  // (indemnizație de încadrare) și Anexa IX (demnitate publică). Câmpul
  // `vechime` din grilă (vechime în învățământ/specialitate) NU mai blochează
  // gradațiile — el doar selectează coeficientul de bază.
  const skipGradatii = esteConducere || selected?.anexa === "V" || selected?.anexa === "IX";

  // calcul salariu de bază
  const gradatie = skipGradatii
    ? 0
    : gradatieManual !== null
    ? gradatieManual
    : gradatieDinVechime(aniVechime);
  const salariuG0 = selected ? selected.coeficient * valRef : 0;
  const salariuBaza = selected ? aplicaGradatie(salariuG0, gradatie) : 0;
  const salariuBazaRot = Math.round(salariuBaza);

  // Sporurile aplicabile pe anexa funcției selectate (ex: medicii NU primesc
  // +100% weekend, ci +10% tarif majorat). Fără funcție selectată → niciunul.
  const sporuriVizibile = useMemo(() => {
    if (!selected) return [];
    const ids = new Set(sporuriPentruAnexa(selected.anexa).map((s) => s.id));
    return sporuriState.filter((s) => ids.has(s.spor.id));
  }, [selected, sporuriState]);

  // Există vreun spor orar activ printre cele vizibile?
  const areOrarActiv = sporuriVizibile.some(
    (s) => s.spor.inputKind === "orar" && s.activ,
  );

  // Solda de grad (Anexa VI) — dedusă automat din funcție, cu override manual.
  const aplicaSoldaGrad = selected?.anexa === "VI";
  const soldaGradKeyEfectiv = aplicaSoldaGrad
    ? soldaGradKey ?? soldaGradPentruFunctie(selected!.functie)
    : null;
  const soldaGradEntry = soldaGradByKey(soldaGradKeyEfectiv, variant.soldeGrad);
  const soldaGradCoef = aplicaSoldaGrad && soldaGradEntry ? soldaGradEntry.coef : 0;

  const taxResult = useMemo(() => {
    if (!selected) return null;
    return calcBrut({
      salariuBaza: salariuBazaRot,
      sporuri: sporuriVizibile,
      valoareReferinta: valRef,
      oreNormaLunara: oreNorma,
      soldaGradCoef,
    });
  }, [selected, salariuBazaRot, sporuriVizibile, valRef, oreNorma, soldaGradCoef]);

  const toggleSpor = (id: string) => {
    setSporuriState((prev) =>
      prev.map((s) => (s.spor.id === id ? { ...s, activ: !s.activ } : s))
    );
  };
  const updateProcent = (id: string, p: number) => {
    setSporuriState((prev) =>
      prev.map((s) => (s.spor.id === id ? { ...s, procentCustom: p } : s))
    );
  };
  const updateOre = (id: string, n: number) => {
    setSporuriState((prev) =>
      prev.map((s) => (s.spor.id === id ? { ...s, ore: n } : s))
    );
  };
  const updateFractie = (id: string, n: number) => {
    setSporuriState((prev) =>
      prev.map((s) => (s.spor.id === id ? { ...s, fractieTimp: n } : s))
    );
  };

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 md:py-12 space-y-8">
      {/* Pasul 1: Parametri generali */}
      <div className="grid md:grid-cols-2 gap-6">
        <Panel
          title="1. Valoarea de referință"
          hint={`${variant.valoareReferinta} lei pentru ${variant.perioadaValoareReferinta}`}
        >
          <div className="flex items-center gap-3">
            <input
              type="number"
              className="w-32 rounded-md border border-slate-300 px-3 py-2 text-lg font-medium focus:border-brand-500 focus:ring focus:ring-brand-100"
              value={valRef}
              onChange={(e) => setValRef(clampNumber(Number(e.target.value), 0, 100_000))}
              min={0}
            />
            <span className="text-sm text-slate-600">lei</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Valoarea pentru <strong>{variant.perioadaValoareReferinta}</strong> este fixată
            prin {variant.articolValoareReferinta} din proiect (varianta din{" "}
            {variant.eticheta}): <strong>{variant.valoareReferinta} lei</strong>. Din 2028 încolo
            va fi stabilită anual prin HG (art. 9 alin. 3).
          </p>
        </Panel>

        <Panel title="2. Vechimea în muncă" hint="Determină gradația 0–5">
          <div className="flex items-center gap-3">
            <input
              type="number"
              className="w-24 rounded-md border border-slate-300 px-3 py-2 text-lg font-medium"
              value={aniVechime}
              onChange={(e) => {
                setAniVechime(clampNumber(Number(e.target.value), 0, 60));
                setGradatieManual(null);
              }}
              min={0}
              max={50}
            />
            <span className="text-sm text-slate-600">ani</span>
            <span className="ml-auto inline-flex items-center gap-2 rounded-full bg-brand-100 px-3 py-1 text-sm font-medium text-brand-700">
              Gradația {gradatie} ({GRADATII[gradatie].numeRange})
            </span>
          </div>
          <div className="mt-3 grid grid-cols-6 gap-1 text-xs">
            {GRADATII.map((g) => (
              <button
                key={g.nivel}
                onClick={() => setGradatieManual(g.nivel)}
                className={
                  "rounded border px-2 py-1 transition " +
                  (gradatie === g.nivel
                    ? "border-brand-500 bg-brand-50 text-brand-700 font-semibold"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50")
                }
                title={`+${g.cota}% peste gradația anterioară`}
              >
                {g.nivel}
              </button>
            ))}
          </div>
        </Panel>
      </div>

      {/* Pasul 3: Selectează funcția */}
      <Panel
        title="3. Selectează funcția ta"
        hint={`${all.length.toLocaleString("ro")} funcții disponibile din anexele I–IX`}
      >
        <div className="grid md:grid-cols-[260px_1fr] gap-3">
          <select
            value={anexa}
            onChange={(e) => {
              setAnexa(e.target.value);
              setSelectedIdx(null);
            }}
            className="rounded-md border border-slate-300 px-3 py-2"
          >
            <option value="">Toate familiile ocupaționale</option>
            {anexe.map(([k, v]) => (
              <option key={k} value={k}>
                Anexa {k} — {v}
              </option>
            ))}
          </select>
          <input
            type="search"
            placeholder="Caută după funcție (ex: profesor, medic, inspector, primar...)"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIdx(null);
            }}
            className="rounded-md border border-slate-300 px-3 py-2"
          />
        </div>

        <div className="mt-4 max-h-[420px] overflow-y-auto rounded-md border border-slate-200 bg-white">
          {filtered.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">
              Niciun rezultat. Schimbă filtrele sau cuvântul cheie.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filtered.map((e) => {
                const idx = all.indexOf(e);
                const isSel = selectedIdx === idx;
                return (
                  <li key={`${e.sheet}-${e.cod}-${e.coeficient}-${idx}`}>
                    <button
                      onClick={() => setSelectedIdx(idx)}
                      className={
                        "w-full text-left px-3 py-2.5 text-sm transition " +
                        (isSel
                          ? "bg-brand-50"
                          : "hover:bg-slate-50")
                      }
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={
                            "shrink-0 rounded px-2 py-0.5 text-xs font-mono " +
                            (isSel
                              ? "bg-brand-600 text-white"
                              : "bg-slate-100 text-slate-600")
                          }
                          title="coeficient"
                        >
                          {e.coeficient.toFixed(4)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-800">
                            {e.functie}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {[
                              `Anexa ${e.anexa} · ${e.capitol}`,
                              e.studii && `Studii: ${e.studii}`,
                              e.grad,
                              e.vechime,
                              e.subcapitol,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </div>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {filtered.length === 200 && (
          <p className="mt-2 text-xs text-slate-500">
            Se afișează primele 200 rezultate. Restrânge căutarea pentru mai multă
            precizie.
          </p>
        )}
      </Panel>

      {/* Pasul 4: Sporuri */}
      <Panel
        title="4. Sporuri și alte drepturi"
        hint="Bifează ce ți se aplică. Plafon 20% pentru sporuri din plafon."
      >
        {!selected ? (
          <p className="text-sm text-slate-500">
            Selectează întâi o funcție — sporurile afișate depind de anexa ei.
          </p>
        ) : (
          <>
            {areOrarActiv && (
              <div className={"mb-4 rounded-lg border p-3 " + (oreNorma > 0 ? "border-brand-300 bg-brand-50/60" : "border-amber-300 bg-amber-50")}>
                <label className="block text-sm font-medium text-slate-800">
                  Ore normă / lună (programul lunar de lucru)
                </label>
                <p className="text-xs text-slate-500 mt-0.5">
                  Numitorul tarifului orar (tarif orar = salariu de bază ÷ ore normă). Completează numărul exact al lunii de pe fluturaș. Reper: ~{ORE_NORMA_REPER} h/lună.
                </p>
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
                {oreNorma <= 0 && (
                  <p className="mt-2 text-xs font-medium text-amber-800">
                    ⚠ Completează orele de normă ca sporurile orare bifate să fie calculate.
                  </p>
                )}
              </div>
            )}
            <div className="grid md:grid-cols-2 gap-3">
              {sporuriVizibile.map(({ spor, activ, procentCustom, ore, fractieTimp }) => (
                <label
                  key={spor.id}
                  className={
                    "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition " +
                    (activ
                      ? "border-brand-500 bg-brand-50"
                      : "border-slate-200 bg-white hover:bg-slate-50")
                  }
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-brand-600"
                    checked={activ}
                    onChange={() => toggleSpor(spor.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800">{spor.nume}</div>
                    {spor.descriere && (
                      <div className="text-xs text-slate-500 mt-0.5">{spor.descriere}</div>
                    )}
                    {activ && spor.inputKind === "orar" && (
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <input
                          type="number"
                          min={0}
                          max={400}
                          value={ore ?? ""}
                          placeholder="0"
                          onChange={(e) =>
                            updateOre(spor.id, clampNumber(Number(e.target.value), 0, 400))
                          }
                          className="w-20 rounded border border-slate-300 px-2 py-1 text-sm tabular-nums"
                        />
                        <span className="text-xs text-slate-600">{spor.unitateOre ?? "ore / lună"}</span>
                        <span className="text-[11px] text-slate-400">× {spor.valoare}% din tariful orar</span>
                      </div>
                    )}
                    {activ && spor.inputKind === "selectie" && (
                      <div className="mt-2 flex items-center gap-2">
                        <select
                          value={procentCustom ?? spor.valoare}
                          onChange={(e) => updateProcent(spor.id, Number(e.target.value))}
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
                          value={fractieTimp ?? 100}
                          onChange={(e) =>
                            updateFractie(spor.id, clampNumber(Number(e.target.value), 0, 100))
                          }
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
                          step={1}
                          value={procentCustom ?? spor.valoare}
                          onChange={(e) =>
                            updateProcent(spor.id, clampNumber(Number(e.target.value), 0, 100))
                          }
                          className="w-20 rounded border border-slate-300 px-2 py-1 text-sm"
                        />
                        <span className="text-xs text-slate-600">% din salariul de bază</span>
                      </div>
                    )}
                    <div className="mt-1 text-[11px] uppercase tracking-wide text-slate-400">
                      {spor.inclusInPlafon20 ? "în plafonul 20%" : "exceptat de la plafon"}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </>
        )}
      </Panel>

      {/* Solda de grad — Anexa VI (militari/poliție/penitenciare) */}
      {selected && aplicaSoldaGrad && (
        <Panel
          title="Gradul militar / profesional — solda de grad"
          hint="Anexa VI cap. I.2"
        >
          <p className="text-sm text-slate-600 mb-3">
            Solda lunară = solda de funcție + <strong>solda de grad</strong> (art. 2
            alin. 2). Gradul e dedus din funcție; schimbă-l dacă gradul efectiv diferă.
            Solda de grad nu primește gradații (art. 4 alin. 3).
          </p>
          <select
            value={soldaGradKeyEfectiv ?? ""}
            onChange={(e) => setSoldaGradKey(e.target.value || null)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          >
            {variant.soldeGrad.map((g) => (
              <option key={g.key} value={g.key}>
                {g.coef.toFixed(3)} — {g.label}
              </option>
            ))}
          </select>
          <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-500">
            <span>
              {soldaGradKey === null ? "Dedus automat din funcție." : "Grad ales manual."}
              {soldaGradEntry &&
                ` Solda de grad = ${Math.round(
                  soldaGradEntry.coef * valRef,
                ).toLocaleString("ro-RO")} lei.`}
            </span>
            {soldaGradKey !== null && (
              <button
                type="button"
                onClick={() => setSoldaGradKey(null)}
                className="font-medium text-brand-600 underline hover:text-brand-800"
              >
                Revino la auto
              </button>
            )}
          </div>
        </Panel>
      )}

      {/* Notificare gradații skip */}
      {selected && skipGradatii && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>ℹ️ Gradațiile de vechime nu se aplică pentru această funcție.</strong>{" "}
          {selected.anexa === "V"
            ? "Anexa V (justiție) — indemnizația de încadrare include deja gradul, gradația și vechimea în funcție (art. 13 alin. 1)."
            : selected.anexa === "IX"
            ? "Anexa IX (demnitate publică) — se acordă indemnizație lunară, fără gradații de vechime."
            : `Funcție de conducere (${selected.grad || "gradația inclusă"}) — gradația este inclusă în coeficient conform art. 13 alin. (1).`}
        </div>
      )}

      {/* Rezultat */}
      {selected && taxResult ? (
        <ResultPanel
          functie={selected}
          coef={selected.coeficient}
          valRef={valRef}
          gradatie={gradatie}
          skipGradatii={skipGradatii}
          salariuG0={salariuG0}
          salariuBaza={salariuBazaRot}
          soldaGrad={taxResult.soldaGrad}
          soldaGradLabel={soldaGradEntry?.label ?? null}
          taxResult={taxResult}
          salariuActual={salariuActual}
          setSalariuActual={setSalariuActual}
        />
      ) : (
        <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
          ⬆️ Selectează o funcție de mai sus pentru a vedea calculul
        </div>
      )}
    </section>
  );
}

function Panel({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-baseline justify-between gap-4 mb-3">
        <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
        {hint && <span className="text-xs text-slate-500">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function ResultPanel({
  functie,
  coef,
  valRef,
  gradatie,
  skipGradatii,
  salariuG0,
  salariuBaza,
  soldaGrad,
  soldaGradLabel,
  taxResult,
  salariuActual,
  setSalariuActual,
}: {
  functie: CoefEntry;
  coef: number;
  valRef: number;
  gradatie: number;
  skipGradatii: boolean;
  salariuG0: number;
  salariuBaza: number;
  soldaGrad: number;
  soldaGradLabel: string | null;
  taxResult: ReturnType<typeof calcBrut>;
  salariuActual: number;
  setSalariuActual: (n: number) => void;
}) {
  const fmt = (n: number) => n.toLocaleString("ro-RO", { maximumFractionDigits: 0 });

  const variant = useVarianta();
  const areSoldaGrad = soldaGrad > 0;
  const bazaTotala = salariuBaza + soldaGrad;
  const diferentaTranzitorie = Math.max(0, salariuActual - taxResult.salariuBrut);

  return (
    <div className="rounded-xl border-2 border-brand-500 bg-white shadow-lg overflow-hidden">
      <div className="bg-brand-600 text-white px-5 py-4">
        <p className="text-xs uppercase tracking-wider text-white/80">Rezultat estimat</p>
        <h2 className="text-xl font-bold mt-1">{functie.functie}</h2>
        <p className="text-sm text-white/85 mt-0.5">
          Anexa {functie.anexa} · {functie.capitol}
          {functie.studii && ` · Studii ${functie.studii}`}
          {functie.grad && ` · ${functie.grad}`}
          {functie.vechime && ` · ${functie.vechime}`}
          {functie.subcapitol && ` · ${functie.subcapitol}`}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-slate-200">
        <BigStat
          label={areSoldaGrad ? "Salariu de bază (soldă lunară)" : "Salariu de bază"}
          value={fmt(areSoldaGrad ? bazaTotala : salariuBaza) + " lei"}
          sub={
            areSoldaGrad
              ? `soldă funcție ${fmt(salariuBaza)} + soldă grad ${fmt(soldaGrad)} lei`
              : skipGradatii
              ? `coef ${coef.toFixed(4)} × ${fmt(valRef)} lei (gradația inclusă în coef)`
              : `coef ${coef.toFixed(4)} × ${fmt(valRef)} lei × gradația ${gradatie}`
          }
        />
        <BigStat
          label="Salariu BRUT (cu sporuri)"
          value={fmt(taxResult.salariuBrut) + " lei"}
          sub={
            taxResult.sporuriDepasescPlafon
              ? "⚠ sporurile depășesc plafonul 20% — au fost capate"
              : "include sporurile bifate"
          }
        />
        <BigStat
          label="Salariu NET (pe card)"
          value={fmt(taxResult.salariuNet) + " lei"}
          sub="CAS 25% + CASS 10% + impozit 10%"
          highlight
        />
      </div>

      <details className="px-5 py-4 border-t border-slate-200" open>
        <summary className="cursor-pointer text-sm font-medium text-slate-700">
          Breakdown detaliat
        </summary>
        <div className="mt-3 grid md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <LineItem
            label={skipGradatii ? "Coeficient × valoare referință" : "Coeficient × valoare referință (gradația 0)"}
            value={`${fmt(Math.round(salariuG0))} lei`}
          />
          {!skipGradatii && (
            <LineItem
              label={`Aplicare gradații până la nivel ${gradatie}`}
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
          <LineItem
            label="+ Sporuri (incluse în plafon 20%)"
            value={`+${fmt(taxResult.sporuriProcent)} lei`}
            positive
          />
          <LineItem
            label="+ Sporuri exceptate de plafon"
            value={`+${fmt(taxResult.sporuriExceptate)} lei`}
            positive
          />
          <LineItem label="= Salariu BRUT" value={`${fmt(taxResult.salariuBrut)} lei`} bold />
          <LineItem label="− CAS 25% (pensie)" value={`−${fmt(taxResult.cas)} lei`} negative />
          <LineItem label="− CASS 10% (sănătate)" value={`−${fmt(taxResult.cass)} lei`} negative />
          <LineItem
            label="− Impozit pe venit 10%"
            value={`−${fmt(taxResult.impozit)} lei`}
            negative
          />
          <LineItem label="= Salariu NET" value={`${fmt(taxResult.salariuNet)} lei`} bold />
        </div>
      </details>

      <div className="border-t border-slate-200 bg-slate-50 px-5 py-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">
          Diferența salarială tranzitorie ({variant.articolDiferentaTranzitorie})
        </h3>
        <p className="text-xs text-slate-600 mb-3">
          Dacă salariul brut din {variant.referintaDiferentaTranzitorie} este mai mare decât cel calculat aici, primești
          diferența ca drept individual până la egalizare.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-sm text-slate-700">
            Salariul brut actual ({variant.referintaDiferentaTranzitorie}):
            <input
              type="number"
              className="ml-2 w-32 rounded border border-slate-300 px-2 py-1"
              value={salariuActual || ""}
              onChange={(e) => setSalariuActual(clampNumber(Number(e.target.value), 0, 1_000_000))}
              placeholder="lei"
            />
          </label>
          {salariuActual > 0 && (
            <div className="text-sm">
              {diferentaTranzitorie > 0 ? (
                <span className="text-emerald-700 font-medium">
                  Primești diferență tranzitorie: +{fmt(diferentaTranzitorie)} lei/lună
                </span>
              ) : salariuActual < taxResult.salariuBrut ? (
                <span className="text-brand-700 font-medium">
                  Creștere brută: +{fmt(taxResult.salariuBrut - salariuActual)} lei/lună
                </span>
              ) : (
                <span className="text-slate-600">
                  Salariu identic (fără modificare)
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BigStat({
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
    <div className={"px-5 py-5 " + (highlight ? "bg-emerald-50" : "")}>
      <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
      <p
        className={
          "mt-1 text-2xl md:text-3xl font-bold " +
          (highlight ? "text-emerald-700" : "text-slate-900")
        }
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
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
        (bold ? "border-t border-slate-200 pt-2 font-semibold text-slate-900" : "text-slate-700")
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
