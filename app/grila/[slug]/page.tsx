import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BannerNeadoptat from "@/components/BannerNeadoptat";
import { getVarianta, VARIANTA_IMPLICITA } from "@/lib/variants";
import { gradatiiForAnexa } from "@/lib/tax";
import {
  GRILE,
  OG_IMAGE,
  RT_ORGANIZATIE,
  SITE_URL,
  breadcrumbLd,
  grilaDupaSlug,
  intervalAnexa,
  jsonLd,
  lei,
  de,
  randuriAnexa,
  salariuBaza,
} from "@/lib/seo";

/**
 * Grila de salarizare a unei anexe, randată pe server (pagină statică): coeficienții din
 * varianta implicită a proiectului și salariul de bază la gradația 0 = coeficient × valoarea
 * de referință. Calculatorul rămâne pe prima pagină; aici e tabelul pe care îl caută oamenii.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return GRILE.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const g = grilaDupaSlug((await params).slug);
  if (!g) return {};
  const i = intervalAnexa(g.anexa)!;
  const title = `Grila de salarizare 2026: ${g.titlu} (Anexa ${g.anexa})`;
  const description = `Coeficienții și salariul de bază pentru ${g.nume.toLowerCase()} în proiectul legii salarizării din ${i.v.eticheta}: ${i.n}${de(i.n)} funcții, între ${lei(i.min)} și ${lei(i.max)} brut la gradația 0. Proiect neadoptat.`;
  return {
    title,
    description,
    alternates: { canonical: `/grila/${g.slug}` },
    openGraph: { title, description, url: `${SITE_URL}/grila/${g.slug}`, siteName: "România Transparentă", locale: "ro_RO", type: "article", images: [{ url: OG_IMAGE, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image" },
  };
}

export default async function GrilaPage({ params }: { params: Promise<{ slug: string }> }) {
  const g = grilaDupaSlug((await params).slug);
  if (!g) notFound();
  const v = getVarianta(VARIANTA_IMPLICITA);
  const randuri = randuriAnexa(g.anexa);
  const i = intervalAnexa(g.anexa)!;
  const vr = lei(v.valoareReferinta);

  // grupele din foile oficiale: treapta de populație (Anexa VIII) sau capitolul
  const grupe = new Map<string, typeof randuri>();
  for (const e of randuri) {
    const k = e.subcapitol ?? `Capitolul ${e.capitol}`;
    grupe.set(k, [...(grupe.get(k) ?? []), e]);
  }
  const esalonat = randuri.some((e) => e.coeficientEsalonat);
  const cote = gradatiiForAnexa(g.anexa).slice(1).map((x) => `${x.cota.toLocaleString("ro-RO")}%`).join(", ");
  // aceleași excepții ca în calculator (components/Wizard.tsx): Anexa V și IX au gradația inclusă
  const gradatii =
    g.anexa === "V"
      ? "La Anexa V, indemnizația de încadrare include deja gradul, gradația și vechimea în funcție, deci nu se mai adaugă gradații."
      : g.anexa === "IX"
        ? "Funcțiile de demnitate publică au indemnizație lunară, fără gradații de vechime."
        : `Coeficienții din grilă sunt la gradația 0; gradațiile pentru vechimea în muncă (art. 13) se aplică succesiv peste: ${cote}. La funcțiile de conducere gradația e inclusă.`;

  const faraGradatie = g.anexa === "V" || g.anexa === "IX";
  const raspuns = `În varianta din ${v.eticheta} a proiectului legii salarizării, salariul de bază pentru ${g.nume.toLowerCase()} (Anexa ${g.anexa}) se obține înmulțind coeficientul funcției cu valoarea de referință de ${vr} (${v.articolValoareReferinta}). ${faraGradatie ? "Cele" : "La gradația 0, cele"} ${i.n}${de(i.n)} funcții din grilă au între ${lei(i.min)} și ${lei(i.max)} brut pe lună. Proiectul nu a fost adoptat.`;
  const intrebari: [string, string][] = [
    [`Cât este salariul de bază pentru ${g.titlu} în noua lege a salarizării?`, raspuns],
    [
      "Cum se calculează salariul de bază?",
      `Coeficientul din grilă × valoarea de referință (${vr} în varianta din ${v.eticheta}), rotunjit în sus la leu. ${gradatii}`,
    ],
    [
      "A fost adoptată noua lege a salarizării?",
      "Nu. Pe 26 august 2026 partidele au anunțat că nu au ajuns la consens (jalonul PNRR de 770 mil. € a fost pierdut) și s-au angajat să adopte legea până la sfârșitul anului. Tabelul arată ce prevede proiectul, nu salariile în vigoare.",
    ],
  ];
  const solde = g.anexa === "VI" ? v.soldeGrad : [];

  const cale: [string, string][] = [
    ["Calculator", "/"],
    ["Grile de salarizare", "/grila"],
    [`Anexa ${g.anexa}: ${g.nume}`, `/grila/${g.slug}`],
  ];

  return (
    <main className="min-h-screen bg-slate-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd({
          "@graph": [
            breadcrumbLd(cale),
            {
              "@type": "Dataset",
              name: `Grila de salarizare: ${g.nume} (Anexa ${g.anexa}), proiectul din ${v.eticheta}`,
              description: raspuns,
              url: `${SITE_URL}/grila/${g.slug}`,
              inLanguage: "ro",
              isAccessibleForFree: true,
              creator: RT_ORGANIZATIE,
              keywords: ["grila de salarizare", "noua lege a salarizării", "coeficienți de salarizare", g.nume],
              isBasedOn: v.surse.map((s) => ({ "@type": "CreativeWork", name: s.titlu, url: s.url.startsWith("/") ? `${SITE_URL}${s.url}` : s.url })),
            },
            {
              "@type": "FAQPage",
              mainEntity: intrebari.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
            },
          ],
        })}
      />
      <BannerNeadoptat />
      <div className="mx-auto max-w-6xl px-4 py-6 md:py-10">
        <nav aria-label="Breadcrumb" className="text-sm text-slate-600">
          <ol className="flex flex-wrap gap-1">
            {cale.map(([t, h], k) => (
              <li key={h} className="flex gap-1">
                {k > 0 && <span aria-hidden>›</span>}
                {k < cale.length - 1 ? <Link href={h} className="underline-offset-2 hover:underline">{t}</Link> : <span aria-current="page">{t}</span>}
              </li>
            ))}
          </ol>
        </nav>
        <h1 className="mt-3 text-2xl md:text-4xl font-bold tracking-tight text-slate-900">
          Grila de salarizare 2026: {g.titlu}
        </h1>
        <p className="mt-1 text-slate-600">
          Anexa {g.anexa} — {g.nume}. {g.desc}.
        </p>
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-slate-800 leading-relaxed">
          <strong>Pe scurt:</strong> {raspuns}
        </div>
        <p className="mt-4 text-sm text-slate-600">
          Coeficienții sunt cei din {v.etichetaLunga}. Salariul de bază e brut, la gradația 0 (fără vechime în muncă),
          fără sporuri. Pentru salariul tău, cu gradație, sporuri și net,{" "}
          <Link href="/" className="font-semibold text-brand-700 underline underline-offset-2">folosește calculatorul</Link>.
        </p>

        {[...grupe].map(([grupa, rs]) => (
          <section key={grupa} className="mt-8">
            <h2 className="text-lg md:text-xl font-bold text-slate-900">{grupa}</h2>
            <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Funcția</th>
                    <th className="px-3 py-2">Studii</th>
                    <th className="px-3 py-2">Grad / treaptă</th>
                    <th className="px-3 py-2">Vechime în funcție</th>
                    <th className="px-3 py-2 text-right">Coeficient</th>
                    <th className="px-3 py-2 text-right">{faraGradatie ? "Salariu de bază / indemnizație" : "Salariu de bază (gradația 0)"}</th>
                  </tr>
                </thead>
                <tbody>
                  {rs.map((e, k) => (
                    <tr key={`${e.cod}-${e.nrCrt}-${k}`} className="border-t border-slate-100">
                      <td className="px-3 py-1.5">{e.functie}</td>
                      <td className="px-3 py-1.5 text-slate-600">{e.studii}</td>
                      <td className="px-3 py-1.5 text-slate-600">{e.grad}</td>
                      <td className="px-3 py-1.5 text-slate-600">{e.vechime}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{e.coeficient.toLocaleString("ro-RO", { maximumFractionDigits: 4 })}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums font-medium">{lei(salariuBaza(e, v))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
        {esalonat && (
          <p className="mt-3 text-sm text-slate-600">
            Coeficienții funcțiilor de demnitate publică sunt eșalonați pe ani în proiect; tabelul arată coeficientul din primul an.
          </p>
        )}

        {solde.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg md:text-xl font-bold text-slate-900">Solda de grad</h2>
            <p className="mt-1 text-sm text-slate-600">
              La militari, polițiști și polițiștii de penitenciare, solda lunară = solda de funcție (tabelele de mai sus, cu gradații)
              + solda de grad = coeficientul gradului × {vr}, fără gradații.
            </p>
            <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr><th className="px-3 py-2">Gradul</th><th className="px-3 py-2 text-right">Coeficient</th><th className="px-3 py-2 text-right">Solda de grad</th></tr>
                </thead>
                <tbody>
                  {solde.map((s) => (
                    <tr key={s.key} className="border-t border-slate-100">
                      <td className="px-3 py-1.5">{s.label}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{s.coef.toLocaleString("ro-RO")}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums font-medium">{lei(Math.round(s.coef * v.valoareReferinta))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="mt-10">
          <h2 className="text-lg md:text-xl font-bold text-slate-900">Întrebări frecvente</h2>
          {intrebari.map(([q, a]) => (
            <div key={q} className="mt-4">
              <h3 className="font-semibold text-slate-900">{q}</h3>
              <p className="mt-1 text-slate-700 leading-relaxed">{a}</p>
            </div>
          ))}
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-bold text-slate-900">Celelalte grile</h2>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2 text-sm">
            {GRILE.filter((x) => x.slug !== g.slug).map((x) => (
              <li key={x.slug}>
                <Link href={`/grila/${x.slug}`} className="text-brand-700 underline-offset-2 hover:underline">
                  Anexa {x.anexa}: {x.titlu}
                </Link>
              </li>
            ))}
          </ul>
          {g.anexa === "II" && (
            <p className="mt-4 text-sm text-slate-600">
              Cât se plătește azi, pe legea în vigoare, în spitalele publice:{" "}
              <a href="https://spitale.romaniatransparenta.eu/salarii" className="text-brand-700 underline underline-offset-2">salariile reale din listele spitalelor</a>.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
