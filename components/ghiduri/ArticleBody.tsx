import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Mini-markdown-ul ghidurilor → React (fără HTML brut, fără dangerouslySetInnerHTML).
 * Blocuri separate de un rând gol: „## Titlu” (H2 cu id pentru cuprins), „### Titlu”, „- punct”,
 * „1. pas”, „> Titlu: text” (casetă), tabel „| a | b |” (primul rând = antet). În linie: **îngroșat**,
 * [text](/cale-interna) sau [text](https://…).
 */

/** id-ul unui titlu, pentru cuprins: „Cât câștigă un asistent medical?” → „cat-castiga-un-asistent-medical” */
export function ancora(t: string): string {
  return t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export const titluriH2 = (corp: string): string[] =>
  corp.split("\n").filter((l) => l.startsWith("## ")).map((l) => l.slice(3).trim());

const LINK = "text-brand-700 underline underline-offset-2 hover:text-brand-900";

export function Inline({ text }: { text: string }): ReactNode {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  let k = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) out.push(<strong key={k++} className="font-semibold text-slate-900"><Inline text={m[1]} /></strong>);
    else {
      const href = m[3];
      if (!href.startsWith("/") && !/^https?:\/\//.test(href)) throw new Error(`ghid: legătură invalidă ${href}`);
      out.push(
        href.startsWith("/") ? (
          <Link key={k++} href={href} className={LINK}>{m[2]}</Link>
        ) : (
          <a key={k++} href={href} className={LINK}>{m[2]}</a>
        ),
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}

const NUMERIC = /^[-−+]?[\d.,]+\s*(%|lei)?$/;

export default function ArticleBody({ corp }: { corp: string }) {
  const blocuri = corp.trim().split(/\n\s*\n/);
  return (
    <>
      {blocuri.map((b, i) => {
        const linii = b.split("\n").map((l) => l.trimEnd());
        const prima = linii[0];
        const rest = linii.slice(1).join(" ");
        if (prima.startsWith("## ")) {
          const t = prima.slice(3).trim();
          return (
            <section key={i}>
              <h2 id={ancora(t)} className="mt-10 scroll-mt-4 text-xl md:text-2xl font-bold text-slate-900">{t}</h2>
              {rest && <p className="mt-3"><Inline text={rest} /></p>}
            </section>
          );
        }
        if (prima.startsWith("### ")) {
          return (
            <section key={i}>
              <h3 className="mt-6 text-lg font-semibold text-slate-900">{prima.slice(4).trim()}</h3>
              {rest && <p className="mt-2"><Inline text={rest} /></p>}
            </section>
          );
        }
        if (linii.every((l) => l.startsWith("- ")))
          return (
            <ul key={i} className="mt-3 list-disc space-y-1.5 pl-6">
              {linii.map((l, j) => <li key={j}><Inline text={l.slice(2)} /></li>)}
            </ul>
          );
        if (linii.every((l) => /^\d+\. /.test(l)))
          return (
            <ol key={i} className="mt-3 list-decimal space-y-1.5 pl-6">
              {linii.map((l, j) => <li key={j}><Inline text={l.replace(/^\d+\. /, "")} /></li>)}
            </ol>
          );
        if (linii.every((l) => l.startsWith(">"))) {
          const text = linii.map((l) => l.replace(/^>\s?/, "")).join(" ");
          const m = /^([^:]{2,40}):\s*(.*)$/.exec(text);
          return (
            <div key={i} className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-slate-800">
              <p className="font-semibold text-slate-900">{m ? m[1] : "De reținut"}</p>
              <p className="mt-1"><Inline text={m ? m[2] : text} /></p>
            </div>
          );
        }
        if (linii.every((l) => l.startsWith("|"))) {
          const celule = (l: string) => l.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
          const [antet, ...randuri] = linii.filter((l) => !/^\|[\s:|-]+\|$/.test(l)).map(celule);
          for (const r of randuri)
            if (r.length !== antet.length) throw new Error(`ghid: rând de tabel cu ${r.length} celule în loc de ${antet.length}: ${r.join(" | ")}`);
          const num = antet.map((_, c) => c > 0 && randuri.every((r) => r[c] === "—" || NUMERIC.test(r[c])));
          return (
            <div key={i} className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>{antet.map((a, c) => <th key={c} className={`px-3 py-2 ${num[c] ? "text-right" : ""}`}>{a}</th>)}</tr>
                </thead>
                <tbody>
                  {randuri.map((r, j) => (
                    <tr key={j} className="border-t border-slate-100">
                      {r.map((x, c) => (
                        <td key={c} className={`px-3 py-1.5 ${num[c] ? "text-right tabular-nums" : ""}`}><Inline text={x} /></td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return <p key={i} className="mt-3"><Inline text={linii.join(" ")} /></p>;
      })}
    </>
  );
}
