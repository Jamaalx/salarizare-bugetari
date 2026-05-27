import {
  FileText,
  FileSpreadsheet,
  Download,
  ExternalLink,
  ScrollText,
} from "lucide-react";

type SourceItem = {
  href: string;
  title: string;
  desc: string;
  type: "law" | "annex" | "spreadsheet" | "calendar";
};

const SOURCES: SourceItem[] = [
  {
    href: "/sources/Proiect-lege-MMFTSS-25-mai-2026_final.docx",
    title: "Proiect lege MMFTSS — text final",
    desc: "Textul integral al proiectului (47 articole, dispoziții finale și tranzitorii).",
    type: "law",
  },
  {
    href: "/sources/Proiect-COEFICIENTI-1-8-MMFTSS-25.05.2026-16.37-.xlsx",
    title: "Coeficienții 1–8 (toate funcțiile)",
    desc: "47 sheet-uri Excel cu toți coeficienții din anexele I–IX. Sursa datelor din calculator.",
    type: "spreadsheet",
  },
  {
    href: "/sources/ierarhia-functiilor-rerprezentative-evaluate-20250525.xlsx",
    title: "Ierarhia funcțiilor reprezentative evaluate",
    desc: "139 funcții cheie cu poziționarea lor pe gradele salariale 1–10.",
    type: "spreadsheet",
  },
  {
    href: "/sources/Calendar-consultari-salarizare-25.05.2026.docx",
    title: "Calendar consultări salarizare",
    desc: "Programul oficial de consultare cu federațiile sindicale.",
    type: "calendar",
  },
  {
    href: "/sources/Anexa-I-cap-I-B-Reglem-spec-invat-20-mai-2026.doc",
    title: "Anexa I cap. I-B — Învățământ",
    desc: "Reglementări specifice pentru personalul didactic și didactic auxiliar.",
    type: "annex",
  },
  {
    href: "/sources/ANEXA-II-Cap-II-REGLEMENTARI-specifice-varianta-20-mai-2026.docx",
    title: "Anexa II cap. II — Sănătate",
    desc: "Reglementări specifice pentru personalul din sănătate și asistență socială.",
    type: "annex",
  },
  {
    href: "/sources/Anexa-III-cap-VI-20-mai-2026-Reglementari-specifice-personalului-din-cultura.docx",
    title: "Anexa III cap. VI — Cultură",
    desc: "Reglementări specifice pentru personalul din cultură.",
    type: "annex",
  },
  {
    href: "/sources/Anexa-IV-cap-III-Reglementari-specifice-personal-diplomatie-20-mai-2026.docx",
    title: "Anexa IV cap. III — Diplomație",
    desc: "Reglementări specifice pentru personalul din diplomație.",
    type: "annex",
  },
  {
    href: "/sources/Anexa-nr-V-Reglementari-specifice-personal-justitie-20-mai-2026.docx",
    title: "Anexa V — Justiție",
    desc: "Reglementări specifice pentru magistrați, grefieri și personal auxiliar.",
    type: "annex",
  },
  {
    href: "/sources/Anexa-VI-reglementari-speciale-20-mai-2026.docx",
    title: "Anexa VI — Apărare, ordine publică",
    desc: "Reglementări specifice pentru personalul militar, polițiști, ISU, penitenciare.",
    type: "annex",
  },
  {
    href: "/sources/Anexa-VII-var-20-mai-2026.doc",
    title: "Anexa VII — Cercetare",
    desc: "Reglementări specifice pentru personalul din cercetare-dezvoltare.",
    type: "annex",
  },
  {
    href: "/sources/Anexa-VIII-cap-I-B-Regl-spec-functionarii-publici-20-mai-2026.doc",
    title: "Anexa VIII cap. I-B — Funcționari publici",
    desc: "Reglementări specifice pentru funcționarii publici.",
    type: "annex",
  },
  {
    href: "/sources/Anexa-VIII-cap-II-J-si-K-Regl-spec-personal-contractual-20-mai-2026.doc",
    title: "Anexa VIII cap. II J/K — Personal contractual",
    desc: "Reglementări specifice pentru personalul contractual din administrație.",
    type: "annex",
  },
];

const iconFor = (type: SourceItem["type"]) => {
  switch (type) {
    case "law":
      return ScrollText;
    case "spreadsheet":
      return FileSpreadsheet;
    case "calendar":
      return FileText;
    default:
      return FileText;
  }
};

const colorFor = (type: SourceItem["type"]) => {
  switch (type) {
    case "law":
      return "bg-brand-100 text-brand-700";
    case "spreadsheet":
      return "bg-emerald-100 text-emerald-700";
    case "calendar":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
};

export default function Sources() {
  return (
    <section id="sources" className="bg-white border-t border-slate-200">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-8 max-w-2xl">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            Documente sursă
          </h2>
          <p className="mt-2 text-slate-600">
            Toate calculele de pe acest site se bazează exclusiv pe documentele oficiale
            publicate de Ministerul Muncii (MMFTSS) la data de 25 mai 2026. Le poți
            descărca direct de mai jos pentru verificare.
          </p>
          <a
            href="https://mmuncii.ro/j33/index.php/ro/transparenta/proiecte-in-dezbatere"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium"
          >
            Pagina oficială MMFTSS — proiecte în dezbatere
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {SOURCES.map((s) => {
            const Icon = iconFor(s.type);
            return (
              <a
                key={s.href}
                href={s.href}
                download
                className="group rounded-2xl border border-slate-200 bg-white p-4 hover:border-brand-300 hover:shadow-md transition flex items-start gap-3"
              >
                <div
                  className={
                    "shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl " +
                    colorFor(s.type)
                  }
                >
                  <Icon className="w-5 h-5" strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-slate-900 leading-tight group-hover:text-brand-700 transition">
                    {s.title}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 leading-snug">{s.desc}</div>
                  <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-600">
                    <Download className="w-3.5 h-3.5" /> Descarcă
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
