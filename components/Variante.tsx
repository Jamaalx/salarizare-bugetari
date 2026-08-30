import { GitCompare, Ban } from "lucide-react";
import { VARIANTE, VARIANTA_IMPLICITA } from "@/lib/variants";

type Rand = { criteriu: string; valori: [string, string, string]; nota?: string };

// Tabelul condensat al diferențelor — verificat pe textele și xlsx-urile oficiale.
const RANDURI: Rand[] = [
  {
    criteriu: "Valoarea de referință",
    valori: ["4.100 lei (2027) — art. 35 alin. (2)", "4.100 lei (dec. 2026 + 2027) — art. 36 alin. (2)", "4.000 lei (dec. 2026 + 2027) — art. 38 alin. (3)"],
  },
  {
    criteriu: "Intrare în vigoare",
    valori: ["1 ianuarie 2027", "1 decembrie 2026", "1 decembrie 2026"],
  },
  {
    criteriu: "Gradații (art. 13)",
    valori: ["0–5: +7,5 / +5 / +5 / +2,5 / +2,5%", "identic", "identic"],
  },
  {
    criteriu: "Plafon sporuri (art. 21)",
    valori: ["20% din salariile de bază", "identic (baza include solda de grad)", "identic"],
  },
  {
    criteriu: "Coeficienți",
    valori: ["2.627 rânduri", "2.809 rânduri; ~85% din coduri modificate față de mai", "3.000 rânduri; ~17% modificate față de iulie (mai ales Anexele I și II)"],
  },
  {
    criteriu: "Anexa II — Sănătate (exemple)",
    valori: [
      "medic primar 4,00 · specialist 3,20 · medic 1,76 · asistent S principal 1,90 · farmacist primar 2,40",
      "4,00 · 3,20 · 2,16 · 1,92 · 2,70",
      "4,00 · 3,20 · 2,16 · 1,92 · 2,90; rezidenți pe ani (an V 2,45, an IV 2,35)",
    ],
  },
  {
    criteriu: "Anexa VI — solda de grad",
    valori: ["Mareșal 1,00 → Soldat 0,10", "Mareșal 1,10 · General 1,05 · Colonel 0,75 · Căpitan 0,67 · Sublocotenent 0,63 · Sergent 0,50 · Soldat 0,40", "identic cu iulie"],
  },
  {
    criteriu: "Diferența salarială tranzitorie",
    valori: ["față de dec. 2026, plătită cel târziu până la 31 dec. 2031 (art. 32)", "față de nov. 2026 (art. 33)", "față de nov. 2026, fără limita 2031 (art. 33)"],
  },
  {
    criteriu: "Anexa IX — demnitari",
    valori: ["un singur coeficient", "coloane 2026/2027, 2028, 2029, 2030, 2031 (eșalonare)", "eșalonare 2026/2027 → 2031; aleși locali pe 28 de trepte de populație"],
  },
  {
    criteriu: "Anexa VIII — administrație locală",
    valori: ["4 trepte de populație", "4 trepte", "5 trepte (noi: 120.001–200.000 și 50.001–120.000); grade noi „superior 4/3/2”"],
  },
  {
    criteriu: "Titlu de doctor",
    valori: ["—", "—", "500 lei brut/lună, sumă fixă, în afara plafonului (art. 39)"],
  },
  {
    criteriu: "Sănătate: categorii de unități",
    valori: ["—", "±15% pe categorii", "6 categorii de unități + factori de multiplicare pe grupe (min. 8/6/4/2%), stabiliți anual prin HG (Anexa II cap. II)"],
  },
];

const NEMODELAT = [
  {
    titlu: "Sănătate — categoriile de unități și factorii pe grupe",
    text: "Varianta din 20 august (Anexa II cap. II) împarte unitățile sanitare în 6 categorii și prevede factori de multiplicare pe grupe de personal (minimum 8/6/4/2%), stabiliți anual prin Hotărâre de Guvern. Coeficienții din xlsx sunt cei pentru „Categoria II”; fără HG nu există nicio bază de calcul, așa că nu aplicăm niciun factor.",
  },
  {
    titlu: "Indemnizația pentru titlul științific de doctor",
    text: "500 lei brut/lună, sumă fixă, în afara plafonului sporurilor (art. 39 în varianta din 20 august, ca modificare a Legii 153/2017). Nu este inclusă în calcul — adaug-o manual la brut dacă te privește.",
  },
  {
    titlu: "Premiul de performanță",
    text: "10–20% din salariul de bază, acordat discreționar unui procent limitat din personal (art. 22). Nu este un drept lunar, deci nu intră în estimare.",
  },
];

export default function Variante() {
  return (
    <section id="variante" className="bg-slate-50 border-t border-slate-200">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-6 max-w-3xl">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-brand-100 text-brand-700 mb-3">
            <GitCompare className="w-5 h-5" strokeWidth={2} />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            Ce s-a schimbat între variante
          </h2>
          <p className="mt-2 text-slate-600">
            Trei texte oficiale au fost publicate în 2026: <strong>25 mai</strong> (MMFTSS),{" "}
            <strong>17 iulie</strong> (MMFTSS) și <strong>20 august</strong> (publicat de
            federațiile sindicale). Niciunul nu a fost adoptat. Formulele de calcul (gradații,
            plafon, fiscalitate) sunt identice; diferă valoarea de referință, data aplicării,
            coeficienții și câteva reguli speciale. Alegi varianta din bara de sus — implicit
            calculăm pe cea din{" "}
            {VARIANTE.find((v) => v.id === VARIANTA_IMPLICITA)?.eticheta}, ultimul text oficial.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
                <th className="px-4 py-3 font-semibold w-44">Criteriu</th>
                {VARIANTE.map((v) => (
                  <th key={v.id} className="px-4 py-3 font-semibold">
                    <span className="block text-slate-900 normal-case text-sm">
                      Varianta {v.numar} — {v.eticheta}
                    </span>
                    <span className="block font-normal normal-case text-[11px] text-slate-500 mt-0.5">
                      VR {v.valoareReferinta.toLocaleString("ro-RO")} lei · {v.intrareInVigoareText}
                      {v.id === VARIANTA_IMPLICITA ? " · implicit" : ""}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {RANDURI.map((r) => (
                <tr key={r.criteriu} className="align-top">
                  <th
                    scope="row"
                    className="px-4 py-3 text-left font-semibold text-slate-800 text-xs md:text-sm"
                  >
                    {r.criteriu}
                  </th>
                  {r.valori.map((val, i) => (
                    <td key={i} className="px-4 py-3 text-slate-700 text-xs md:text-sm leading-snug">
                      {val}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 grid md:grid-cols-3 gap-3">
          {VARIANTE.map((v) => (
            <details key={v.id} className="rounded-2xl border border-slate-200 bg-white p-4 group">
              <summary className="cursor-pointer text-sm font-semibold text-slate-900 list-none flex items-center justify-between">
                <span>Note — varianta {v.numar} ({v.eticheta})</span>
                <span className="text-slate-400 group-open:rotate-90 transition text-xs">▶</span>
              </summary>
              <ul className="mt-3 space-y-2 text-xs text-slate-600 leading-snug list-disc pl-4">
                {v.note.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </details>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center gap-2 text-amber-900 font-semibold">
            <Ban className="w-4 h-4" strokeWidth={2} />
            Ce NU este modelat în calculator
          </div>
          <ul className="mt-3 grid md:grid-cols-3 gap-4 text-sm text-amber-900/90">
            {NEMODELAT.map((n) => (
              <li key={n.titlu}>
                <p className="font-semibold text-amber-950">{n.titlu}</p>
                <p className="mt-1 text-xs leading-relaxed">{n.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
