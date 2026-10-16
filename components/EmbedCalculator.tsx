"use client";

/**
 * Calculatorul în varianta pentru alte site-uri (ruta /embed, docs/WIDGET-EMBED.md): fără antetul și subsolul
 * site-ului, fără barele lipite sus. Alege varianta și modul din adresă (?varianta=…&mod=expert), trimite
 * înălțimea conținutului către pagina gazdă (postMessage, citit de public/embed.js) și deschide linkurile
 * într-o filă nouă, ca vizitatorul să nu rămână cu site-ul nostru blocat în cadrul gazdei.
 */
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import Wizard from "./Wizard";
import Calculator from "./Calculator";
import { VARIANTE, VARIANTA_IMPLICITA, esteVariantaId, getVarianta, type VariantaId } from "@/lib/variants";
import { VariantaProvider } from "@/lib/varianta-context";
import { cale } from "@/lib/shell";
import { ATRIBUIRE_TEXT, ATRIBUIRE_URL, MESAJ_INALTIME, parametriEmbed, type Mod } from "@/lib/widget";

type CoefPayload = { sheets: any[]; data: any[] };

export default function EmbedCalculator() {
  const [variantaId, setVariantaId] = useState<VariantaId>(VARIANTA_IMPLICITA);
  const [mod, setMod] = useState<Mod>("ghidat");
  const [data, setData] = useState<CoefPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const radacina = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const p = parametriEmbed(window.location.search);
    if (esteVariantaId(p.varianta)) setVariantaId(p.varianta);
    setMod(p.mod);
  }, []);

  useEffect(() => {
    let oprit = false;
    setData(null);
    setError(null);
    fetch(cale(`/api/coeficienti/${variantaId}`))
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json: any) => {
        if (!oprit) setData({ sheets: [], data: Array.isArray(json) ? json : json.data || [] });
      })
      .catch((e) => {
        if (!oprit) setError(e instanceof Error ? e.message : "fetch failed");
      });
    return () => {
      oprit = true;
    };
  }, [variantaId]);

  // înălțimea conținutului → pagina gazdă; doar dacă suntem într-un cadru
  useEffect(() => {
    const el = radacina.current;
    if (!el || window.parent === window) return;
    let ultima = 0;
    const trimite = () => {
      const h = Math.ceil(el.getBoundingClientRect().height);
      if (h !== ultima) {
        ultima = h;
        window.parent.postMessage({ type: MESAJ_INALTIME, h }, "*");
      }
    };
    const ro = new ResizeObserver(trimite);
    ro.observe(el);
    trimite();
    return () => ro.disconnect();
  }, []);

  // linkurile spre alte pagini se deschid într-o filă nouă (ancorele „#…" rămân în cadru)
  useEffect(() => {
    const laClic = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.getAttribute("href")!.startsWith("#")) return;
      a.target = "_blank";
      a.rel = Array.from(new Set([...a.rel.split(" ").filter(Boolean), "noopener"])).join(" ");
    };
    document.addEventListener("click", laClic, true);
    return () => document.removeEventListener("click", laClic, true);
  }, []);

  const varianta = getVarianta(variantaId);

  return (
    <div ref={radacina} className="bg-rt-paper">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-3 py-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold text-rt-navy">Calculator salariu bugetari</p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Varianta proiectului de lege"
              value={variantaId}
              onChange={(e) => setVariantaId(e.target.value as VariantaId)}
              className="min-h-[36px] rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800"
            >
              {VARIANTE.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.eticheta}
                  {v.id === VARIANTA_IMPLICITA ? " (ultima)" : ""} · VR {v.valoareReferinta} lei
                </option>
              ))}
            </select>
            <div className="inline-flex gap-1 p-1 rounded-full bg-slate-100" role="group" aria-label="Modul de calcul">
              {(["ghidat", "expert"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMod(m)}
                  aria-pressed={mod === m}
                  className={
                    "min-h-[30px] text-xs px-3 py-1 rounded-full font-semibold " +
                    (mod === m ? "bg-white text-brand-700 shadow-sm" : "text-slate-600 hover:text-slate-900")
                  }
                >
                  {m === "ghidat" ? "Ghidat" : "Expert"}
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="mx-auto max-w-5xl px-3 pb-2 flex items-start gap-1.5 text-xs text-rose-900">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-600" aria-hidden="true" />
          <span>
            <strong>Proiectul de lege NU a fost adoptat.</strong> Calculezi pe {varianta.etichetaLunga}, valoare de
            referință {varianta.valoareReferinta.toLocaleString("ro-RO")} lei. Estimare informativă, nu fluturaș oficial.
          </span>
        </p>
      </div>

      <VariantaProvider value={varianta}>
        {data ? (
          mod === "ghidat" ? (
            <Wizard key={variantaId} initialData={data} />
          ) : (
            <Calculator key={variantaId} initialData={data} />
          )
        ) : error ? (
          <p className="px-4 py-12 text-center text-sm font-semibold text-rose-700">
            Nu am putut încărca datele coeficienților ({error}).
          </p>
        ) : (
          <div className="px-4 py-12 flex flex-col items-center gap-3 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
            <p className="text-sm">Se încarcă coeficienții variantei din {varianta.eticheta}…</p>
          </div>
        )}
      </VariantaProvider>

      <p className="border-t border-slate-200 bg-white px-3 py-2 text-center text-xs text-slate-600">
        <a href={ATRIBUIRE_URL} target="_blank" rel="noopener" className="font-semibold text-brand-700 underline underline-offset-2">
          {ATRIBUIRE_TEXT}
        </a>
        {" · gratuit, fără reclame, fără cookie-uri de urmărire"}
      </p>
    </div>
  );
}
