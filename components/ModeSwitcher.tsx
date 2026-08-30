"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, Wrench, Plug, Loader2, Globe, Layers, Info } from "lucide-react";
import Wizard from "./Wizard";
import Calculator from "./Calculator";
import {
  VARIANTE,
  VARIANTA_IMPLICITA,
  esteVariantaId,
  getVarianta,
  type VariantaId,
} from "@/lib/variants";
import { VariantaProvider } from "@/lib/varianta-context";

type CoefPayload = { sheets: any[]; data: any[] };

// Seturile deja descărcate, ca schimbarea variantei înapoi să fie instant.
const cache = new Map<VariantaId, CoefPayload>();

export default function ModeSwitcher() {
  const [mode, setMode] = useState<"wizard" | "expert">("wizard");
  const [variantaId, setVariantaId] = useState<VariantaId>(VARIANTA_IMPLICITA);
  const [data, setData] = useState<CoefPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ?varianta=2026-07-17 în URL → pornește pe varianta respectivă (link-uri partajabile).
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("varianta");
    if (esteVariantaId(p)) setVariantaId(p);
  }, []);

  useEffect(() => {
    let aborted = false;
    setError(null);
    const cached = cache.get(variantaId);
    if (cached) {
      setData(cached);
      return;
    }
    setData(null);
    fetch(`/api/coeficienti/${variantaId}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json: any) => {
        const rows: any[] = Array.isArray(json) ? json : json.data || [];
        const payload: CoefPayload = { sheets: [], data: rows };
        cache.set(variantaId, payload);
        if (!aborted) setData(payload);
      })
      .catch((e) => {
        if (!aborted) setError(e instanceof Error ? e.message : "fetch failed");
      });
    return () => {
      aborted = true;
    };
  }, [variantaId]);

  const variant = getVarianta(variantaId);

  const schimbaVarianta = (id: VariantaId) => {
    setVariantaId(id);
    const url = new URL(window.location.href);
    if (id === VARIANTA_IMPLICITA) url.searchParams.delete("varianta");
    else url.searchParams.set("varianta", id);
    window.history.replaceState(null, "", url.toString());
  };

  return (
    <>
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 backdrop-blur-sm bg-white/85">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="hidden lg:flex items-center gap-4">
            <a
              href="#sources"
              className="text-xs font-medium text-slate-500 hover:text-brand-600"
            >
              Documente sursă
            </a>
            <Link
              href="/diplomatie"
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-brand-600"
            >
              <Globe className="w-3.5 h-3.5" /> Diplomație (misiune externă)
            </Link>
            <Link
              href="/mcp"
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-brand-600"
            >
              <Plug className="w-3.5 h-3.5" /> MCP pentru AI
            </Link>
          </div>
          <div className="flex items-center gap-2 ml-auto flex-wrap justify-end">
            <label className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              <Layers className="w-3.5 h-3.5 text-brand-600" strokeWidth={2} />
              <span className="hidden sm:inline">Varianta proiectului:</span>
              <select
                aria-label="Varianta proiectului de lege"
                value={variantaId}
                onChange={(e) => schimbaVarianta(e.target.value as VariantaId)}
                className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1.5 text-xs font-semibold text-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-100"
              >
                {VARIANTE.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.eticheta}
                    {v.id === VARIANTA_IMPLICITA ? " (ultima)" : ""} · VR {v.valoareReferinta} lei
                  </option>
                ))}
              </select>
            </label>
            <span className="text-xs text-slate-400 mr-1 hidden sm:inline">Mod:</span>
            <div className="inline-flex p-0.5 rounded-full bg-slate-100">
              <button
                onClick={() => setMode("wizard")}
                className={
                  "inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold transition " +
                  (mode === "wizard"
                    ? "bg-white text-brand-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900")
                }
              >
                <Sparkles className="w-3.5 h-3.5" strokeWidth={2} />
                Ghidat
              </button>
              <button
                onClick={() => setMode("expert")}
                className={
                  "inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold transition " +
                  (mode === "expert"
                    ? "bg-white text-brand-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900")
                }
              >
                <Wrench className="w-3.5 h-3.5" strokeWidth={2} />
                Expert
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-brand-50 border-b border-brand-100">
        <div className="mx-auto max-w-6xl px-4 py-2 flex items-start gap-2 text-xs text-brand-900">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-brand-600" strokeWidth={2} />
          <p className="leading-snug">
            <strong>Calculezi pe {variant.etichetaLunga}</strong>: valoare de referință{" "}
            <strong className="tabular-nums">
              {variant.valoareReferinta.toLocaleString("ro-RO")} lei
            </strong>{" "}
            ({variant.articolValoareReferinta}), intrare în vigoare{" "}
            <strong>{variant.intrareInVigoareText}</strong>, diferența tranzitorie față de{" "}
            {variant.referintaDiferentaTranzitorie}.{" "}
            <a href="#variante" className="underline underline-offset-2 hover:text-brand-700">
              Ce s-a schimbat între variante
            </a>
          </p>
        </div>
      </div>

      <VariantaProvider value={variant}>
        {data ? (
          mode === "wizard" ? (
            <Wizard key={variantaId} initialData={data} />
          ) : (
            <Calculator key={variantaId} initialData={data} />
          )
        ) : error ? (
          <div className="mx-auto max-w-3xl px-4 py-16 text-center">
            <p className="text-sm font-semibold text-rose-700">
              Nu am putut încărca datele coeficienților.
            </p>
            <p className="mt-2 text-xs text-slate-500">{error}</p>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl px-4 py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
            <p className="text-sm">Se încarcă coeficienții variantei din {variant.eticheta}…</p>
          </div>
        )}
      </VariantaProvider>
    </>
  );
}
