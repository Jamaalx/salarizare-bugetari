"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Globe,
  Calculator as CalcIcon,
  AlertTriangle,
  Info,
  Briefcase,
} from "lucide-react";
import {
  FUNCTII_DIPLOMATIE_MISIUNE,
  calcSalariuDiplomatieValuta,
  clasaPrimaMisiune,
  clampNumber,
} from "@/lib/tax";

type Valuta = "EUR" | "USD";

export default function DiplomatiePage() {
  const [functieIdx, setFunctieIdx] = useState<number | null>(null);
  const [bazaPeTara, setBazaPeTara] = useState(1000);
  const [valuta, setValuta] = useState<Valuta>("EUR");
  const [tara, setTara] = useState("");
  const [esteMisiuneRepetata, setEsteMisiuneRepetata] = useState(false);

  const f = functieIdx !== null ? FUNCTII_DIPLOMATIE_MISIUNE[functieIdx] : null;
  const salariu = useMemo(
    () => (f ? calcSalariuDiplomatieValuta(f.coeficient, bazaPeTara) : 0),
    [f, bazaPeTara],
  );
  const clasaInfo = clasaPrimaMisiune(esteMisiuneRepetata);

  const fmt = (n: number) => n.toLocaleString("ro-RO", { maximumFractionDigits: 0 });

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-600 text-white">
        <div className="mx-auto max-w-4xl px-4 py-8 md:py-12">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" /> Înapoi la calculatorul principal
          </Link>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide uppercase backdrop-blur-sm">
            <Globe className="w-3.5 h-3.5" />
            Anexa IV — Diplomație / Misiune externă
          </div>
          <h1 className="mt-4 text-3xl md:text-5xl font-bold tracking-tight leading-[1.1]">
            Calculator salariu misiune permanentă în străinătate
          </h1>
          <p className="mt-4 max-w-2xl text-base md:text-lg text-white/90 leading-relaxed">
            Pentru personalul Corpului diplomatic și consular trimis la misiuni externe
            (ambasade, consulate, institute culturale). Salariul lunar e calculat în
            VALUTĂ NET, conform Art. 4 Anexa IV.
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        {/* Avertisment cheie */}
        <div className="flex items-start gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          <AlertTriangle className="shrink-0 w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <strong>Baza de calcul pe țară NU este publicată încă.</strong> Conform Art. 4
            alin. (3), valoarea bazei pentru fiecare țară se stabilește prin Hotărâre de
            Guvern, în termen de 60 zile după adoptarea legii. Până atunci, introdu manual
            o valoare estimativă pentru a vedea formula de calcul.
          </div>
        </div>

        {/* Formula */}
        <div className="rounded-2xl bg-white border border-slate-200 p-5">
          <h2 className="text-sm font-bold tracking-wider text-blue-700 uppercase mb-2">
            Formula (Art. 4 alin. 2)
          </h2>
          <code className="block bg-slate-900 text-emerald-300 px-4 py-3 rounded-lg font-mono text-sm">
            salariu_net_valută = coeficient_ierarhizare × bază_calcul_pe_țară
          </code>
          <p className="mt-2 text-xs text-slate-500">
            Salariul e <strong>net</strong> (fără CAS/CASS/impozit cum se aplică pe lei).
            Sunt și alte drepturi în valută (chirie, deplasare, etc.) reglementate separat
            prin lege — vezi Art. 5.
          </p>
        </div>

        {/* Funcția */}
        <div className="rounded-2xl bg-white border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Briefcase className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold tracking-wider text-blue-700 uppercase">
              1. Selectează funcția de încadrare la misiune
            </h2>
          </div>
          <select
            value={functieIdx ?? ""}
            onChange={(e) => setFunctieIdx(e.target.value === "" ? null : Number(e.target.value))}
            className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
          >
            <option value="">— alege funcția —</option>
            {FUNCTII_DIPLOMATIE_MISIUNE.map((fn, idx) => (
              <option key={fn.nr} value={idx}>
                {fn.nr}. coef {fn.coeficient.toFixed(2)} · {fn.functie.slice(0, 90)}{fn.functie.length > 90 ? "…" : ""}
              </option>
            ))}
          </select>
          {f && (
            <div className="mt-3 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-900">
              <p className="font-semibold mb-1">{f.functie}</p>
              <p className="text-xs">
                Nivelul studiilor: <strong>{f.studii}</strong> · Coeficient ierarhizare:{" "}
                <strong className="tabular-nums">{f.coeficient.toFixed(2)}</strong>
              </p>
            </div>
          )}
        </div>

        {/* Țara și clasa */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white border border-slate-200 p-5">
            <label className="block">
              <span className="text-sm font-bold tracking-wider text-blue-700 uppercase">2. Țara misiunii</span>
              <span className="block text-xs text-slate-500 mt-1">Pentru documentare</span>
              <input
                type="text"
                value={tara}
                onChange={(e) => setTara(e.target.value)}
                placeholder="ex: Franța, SUA, Germania"
                className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </div>
          <div className="rounded-2xl bg-white border border-slate-200 p-5">
            <span className="text-sm font-bold tracking-wider text-blue-700 uppercase">3. Tip misiune</span>
            <div className="mt-3 flex flex-col gap-2 text-sm">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!esteMisiuneRepetata}
                  onChange={() => setEsteMisiuneRepetata(false)}
                  className="text-blue-600"
                />
                <span>Prima misiune sau funcție nouă (clasa a II-a)</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={esteMisiuneRepetata}
                  onChange={() => setEsteMisiuneRepetata(true)}
                  className="text-blue-600"
                />
                <span>Min. 1 an în aceeași funcție anterior (clasa I)</span>
              </label>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Art. 6 nota 1 — Personalul la prima misiune se încadrează la clasa a II-a; clasa I cere min. 1 an vechime în funcție ierarhizată cel puțin la fel.
            </p>
            <div className="mt-2 inline-block rounded-lg bg-blue-50 px-2 py-1 text-xs text-blue-900 font-semibold">
              Clasa rezultată: {clasaInfo}
            </div>
          </div>
        </div>

        {/* Baza de calcul */}
        <div className="rounded-2xl bg-white border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <CalcIcon className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold tracking-wider text-blue-700 uppercase">
              4. Baza de calcul pe țară (HG, neoficial)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Baza corespunzătoare coeficientului 1.00 pentru țara respectivă. Va fi
            stabilită prin HG după adoptarea legii. Introdu o valoare estimativă pentru a
            vedea cum se modifică salariul.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={0}
              max={50000}
              step={50}
              value={bazaPeTara}
              onChange={(e) => setBazaPeTara(clampNumber(Number(e.target.value), 0, 50000))}
              className="flex-1 rounded-xl border-2 border-slate-200 px-3 py-2.5 text-lg tabular-nums focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
            />
            <select
              value={valuta}
              onChange={(e) => setValuta(e.target.value as Valuta)}
              className="rounded-xl border-2 border-slate-200 px-3 py-2.5 text-sm font-semibold focus:border-blue-500 focus:outline-none"
            >
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>

        {/* Rezultat */}
        {f && bazaPeTara > 0 && (
          <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-300 p-6">
            <p className="text-xs uppercase tracking-wider text-emerald-700 font-bold mb-2">
              Salariu net lunar estimat în valută
            </p>
            <p className="text-4xl md:text-5xl font-bold text-emerald-800 tabular-nums">
              {fmt(salariu)} {valuta}
            </p>
            <p className="mt-3 text-sm text-emerald-900">
              {f.coeficient.toFixed(2)} × {fmt(bazaPeTara)} {valuta} = {fmt(salariu)} {valuta}
              {tara && <span> · {tara}</span>}
            </p>
          </div>
        )}

        {/* Info suplimentar */}
        <div className="rounded-2xl bg-white border border-slate-200 p-5">
          <div className="flex items-start gap-3">
            <Info className="shrink-0 w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-slate-700 space-y-2">
              <p>
                <strong>Alte drepturi în valută și lei</strong> (Art. 5) — chirie, deplasare,
                indemnizație instalare, etc. — se stabilesc prin act normativ separat la
                nivel de lege, în 60 zile de la adoptarea legii salarizării.
              </p>
              <p>
                <strong>Personalul la centrala MAE</strong> (București) NU folosește acest
                calculator — el primește salariu standard în lei (vezi calculatorul principal,
                Anexa IV Cap. I/II).
              </p>
              <p>
                <strong>Comasarea funcțiilor</strong> (nota 2) — la misiunile unde nu se
                justifică funcții distincte, salariul se stabilește ținând cont de sarcinile
                preponderente, pregătire și vechime în specialitate.
              </p>
            </div>
          </div>
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Înapoi la calculatorul principal
        </Link>
      </section>
    </main>
  );
}
