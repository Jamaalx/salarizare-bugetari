"use client";

/** Generatorul de cod de pe pagina /widget: alegi varianta, modul, înălțimea și rel-ul, copiezi codul, vezi widgetul. */
import { useMemo, useState } from "react";
import { Copy, Check } from "lucide-react";
import { VARIANTE, VARIANTA_IMPLICITA } from "@/lib/variants";
import { cale } from "@/lib/shell";
import {
  CALE_EMBED,
  INALTIME_IMPLICITA,
  REL_IMPLICIT,
  codIframe,
  codScript,
  type Mod,
  type Rel,
} from "@/lib/widget";

export default function GeneratorWidget() {
  const [format, setFormat] = useState<"script" | "iframe">("script");
  const [varianta, setVarianta] = useState<string>("");
  const [mod, setMod] = useState<Mod>("ghidat");
  const [inaltime, setInaltime] = useState<number>(INALTIME_IMPLICITA);
  const [rel, setRel] = useState<Rel>(REL_IMPLICIT);
  const [copiat, setCopiat] = useState(false);

  const o = { varianta: varianta || undefined, mod, inaltime, rel };
  const cod = format === "script" ? codScript(o) : codIframe(o);
  const previzualizare = useMemo(() => {
    const q = new URLSearchParams();
    if (varianta) q.set("varianta", varianta);
    if (mod !== "ghidat") q.set("mod", mod);
    const s = q.toString();
    return cale(`${CALE_EMBED}${s ? `?${s}` : ""}`);
  }, [varianta, mod]);

  const copiaza = () =>
    navigator.clipboard
      .writeText(cod)
      .then(() => {
        setCopiat(true);
        setTimeout(() => setCopiat(false), 2000);
      })
      .catch(() => {});

  const camp = "min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm";

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm font-medium text-slate-700">
          Tipul codului
          <select className={camp} value={format} onChange={(e) => setFormat(e.target.value as "script" | "iframe")}>
            <option value="script">Script (înălțime automată)</option>
            <option value="iframe">Doar iframe (fără JavaScript)</option>
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Varianta proiectului
          <select className={camp} value={varianta} onChange={(e) => setVarianta(e.target.value)}>
            <option value="">Ultima publicată (se schimbă singură)</option>
            {VARIANTE.map((v) => (
              <option key={v.id} value={v.id}>
                {v.eticheta}
                {v.id === VARIANTA_IMPLICITA ? " (ultima acum)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Modul la pornire
          <select className={camp} value={mod} onChange={(e) => setMod(e.target.value as Mod)}>
            <option value="ghidat">Ghidat (pas cu pas)</option>
            <option value="expert">Expert (toate câmpurile)</option>
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Înălțimea inițială (px)
          <input
            className={camp}
            type="number"
            min={480}
            max={4000}
            step={20}
            value={inaltime}
            onChange={(e) => setInaltime(Number(e.target.value) || INALTIME_IMPLICITA)}
          />
        </label>
      </div>
      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          className="mt-1"
          checked={rel === "nofollow"}
          onChange={(e) => setRel(e.target.checked ? "nofollow" : "")}
        />
        <span>
          Adaugă <code>rel=&quot;nofollow&quot;</code> la linkul de atribuire (de exemplu, dacă politica site-ului tău
          o cere pentru linkurile externe).
        </span>
      </label>

      <div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-900">Codul de pus în pagina ta</p>
          <button type="button" onClick={copiaza} className="rt-btn rt-btn--primary rt-btn--sm">
            {copiat ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copiat ? "Copiat" : "Copiază codul"}
          </button>
        </div>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">
          <code>{cod}</code>
        </pre>
      </div>

      <div>
        <p className="text-sm font-semibold text-slate-900">Previzualizare</p>
        <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2">
          <iframe
            key={previzualizare}
            src={previzualizare}
            title="Previzualizare: Calculator salarii — România Transparentă"
            className="block w-full border-0"
            style={{ height: inaltime }}
            loading="lazy"
          />
        </div>
      </div>
    </div>
  );
}
