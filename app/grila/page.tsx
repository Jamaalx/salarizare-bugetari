import type { Metadata } from "next";
import Link from "next/link";
import BannerNeadoptat from "@/components/BannerNeadoptat";
import { getVarianta, VARIANTA_IMPLICITA } from "@/lib/variants";
import { GRILE, OG_IMAGE, SITE_URL, breadcrumbLd, grilaDupaSlug, intervalAnexa, jsonLd, lei, de } from "@/lib/seo";

const v = getVarianta(VARIANTA_IMPLICITA);
const title = "Grilele de salarizare 2026 pe domenii: coeficienți și salarii de bază";
const description = `Grilele din proiectul noii legi a salarizării (varianta din ${v.eticheta}, valoarea de referință ${lei(v.valoareReferinta)}): învățământ, sănătate, cultură, justiție, apărare, administrație, demnitate publică. Proiect neadoptat.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/grila" },
  openGraph: { title, description, url: `${SITE_URL}/grila`, siteName: "România Transparentă", locale: "ro_RO", type: "website", images: [{ url: OG_IMAGE, width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image" },
};

export default function GrilePage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(breadcrumbLd([["Calculator", "/"], ["Grile de salarizare", "/grila"]]))} />
      <BannerNeadoptat />
      <div className="mx-auto max-w-6xl px-4 py-6 md:py-10">
        <nav aria-label="Breadcrumb" className="text-sm text-slate-600">
          <Link href="/" className="underline-offset-2 hover:underline">Calculator</Link> › <span aria-current="page">Grile de salarizare</span>
        </nav>
        <h1 className="mt-3 text-2xl md:text-4xl font-bold tracking-tight text-slate-900">Grilele de salarizare 2026, pe domenii</h1>
        <p className="mt-2 max-w-3xl text-slate-700 leading-relaxed">
          Coeficienții din proiectul legii salarizării personalului plătit din fonduri publice, {v.etichetaLunga.toLowerCase()},
          și salariul de bază brut care rezultă: coeficient × valoarea de referință de {lei(v.valoareReferinta)}. Proiectul nu a fost adoptat.
        </p>
        <ul className="mt-6 grid gap-3 md:grid-cols-2">
          {GRILE.map((g) => {
            const x = grilaDupaSlug(g.slug)!;
            const i = intervalAnexa(g.anexa);
            return (
              <li key={g.slug} className="rounded-xl border border-slate-200 bg-white p-4">
                <Link href={`/grila/${g.slug}`} className="text-lg font-semibold text-brand-700 underline-offset-2 hover:underline">
                  Anexa {g.anexa}: {x.nume}
                </Link>
                <p className="mt-1 text-sm text-slate-600">{x.desc}</p>
                {i && <p className="mt-1 text-sm text-slate-800">{i.n}{de(i.n)} funcții · {lei(i.min)} – {lei(i.max)} brut</p>}
              </li>
            );
          })}
        </ul>
        <p className="mt-6 text-sm text-slate-600">
          Pentru salariul tău, cu gradație, sporuri și net, pe oricare dintre cele trei variante:{" "}
          <Link href="/" className="font-semibold text-brand-700 underline underline-offset-2">calculatorul</Link>. Cum se
          calculează salariul de bază și ce prevede proiectul pe funcții: <Link href="/ghiduri" className="font-semibold text-brand-700 underline underline-offset-2">ghidurile</Link>.
        </p>
      </div>
    </main>
  );
}
