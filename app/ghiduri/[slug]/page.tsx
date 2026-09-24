import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BannerNeadoptat from "@/components/BannerNeadoptat";
import ArticleBody, { Inline, ancora, titluriH2 } from "@/components/ghiduri/ArticleBody";
import { OG_IMAGE, RT_ORGANIZATIE, SITE_URL, breadcrumbLd, jsonLd } from "@/lib/seo";
import { cuvinte, ghidDupaSlug, ghiduri } from "@/lib/ghiduri";
import { dataLunga } from "@/lib/ghiduri/data";

/**
 * Un ghid, randat static: răspunsul scurt sus, „Pe scurt”, cuprins, textul, întrebări frecvente
 * vizibile, surse, legături spre calculator și grile. BlogPosting + FAQPage + BreadcrumbList în JSON-LD.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return ghiduri().map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const g = ghidDupaSlug((await params).slug);
  if (!g) return {};
  return {
    title: g.titluMeta,
    description: g.descriere,
    alternates: { canonical: `/ghiduri/${g.slug}` },
    openGraph: {
      title: g.titlu,
      description: g.descriere,
      url: `${SITE_URL}/ghiduri/${g.slug}`,
      siteName: "România Transparentă",
      locale: "ro_RO",
      type: "article",
      publishedTime: g.publicat,
      modifiedTime: g.actualizat,
      images: [{ url: OG_IMAGE, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function GhidPage({ params }: { params: Promise<{ slug: string }> }) {
  const g = ghidDupaSlug((await params).slug);
  if (!g) notFound();
  const url = `${SITE_URL}/ghiduri/${g.slug}`;
  const h2 = titluriH2(g.corp);
  const altele = ghiduri().filter((x) => x.slug !== g.slug).slice(0, 4);
  const cale: [string, string][] = [
    ["Calculator", "/"],
    ["Ghiduri", "/ghiduri"],
    [g.titlu, `/ghiduri/${g.slug}`],
  ];
  const minute = Math.max(1, Math.round(cuvinte(g) / 200));

  return (
    <main className="min-h-screen bg-slate-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd({
          "@graph": [
            { ...breadcrumbLd(cale), "@id": `${url}#breadcrumb` },
            {
              "@type": "BlogPosting",
              "@id": `${url}#articol`,
              headline: g.titlu,
              description: g.descriere,
              abstract: g.raspuns,
              datePublished: g.publicat,
              dateModified: g.actualizat,
              inLanguage: "ro",
              url,
              mainEntityOfPage: url,
              image: OG_IMAGE,
              author: RT_ORGANIZATIE,
              publisher: RT_ORGANIZATIE,
              isPartOf: { "@type": "Blog", "@id": `${SITE_URL}/ghiduri#blog` },
              breadcrumb: { "@id": `${url}#breadcrumb` },
              articleSection: g.categorie,
              keywords: g.cuvantCheie,
              wordCount: cuvinte(g),
              citation: g.surse.map((s) => ({ "@type": "CreativeWork", name: s.titlu, url: s.url })),
              speakable: { "@type": "SpeakableSpecification", cssSelector: ["#raspuns", "#pe-scurt"] },
            },
            {
              "@type": "FAQPage",
              "@id": `${url}#intrebari`,
              mainEntity: g.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
            },
          ],
        })}
      />
      <BannerNeadoptat />
      <article className="mx-auto max-w-3xl px-4 py-6 md:py-10 text-slate-800 leading-relaxed">
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
        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-brand-700">{g.categorie}</p>
        <h1 className="mt-1 text-2xl md:text-4xl font-bold tracking-tight text-slate-900">{g.titlu}</h1>
        <p className="mt-2 text-sm text-slate-500">
          Publicat pe <time dateTime={g.publicat}>{dataLunga(g.publicat)}</time>
          {g.actualizat !== g.publicat && (
            <>
              {" "}· actualizat pe <time dateTime={g.actualizat}>{dataLunga(g.actualizat)}</time>
            </>
          )}{" "}
          · {minute} min de citit
        </p>

        <p id="raspuns" className="mt-5 rounded-xl border border-slate-200 bg-white p-4 text-lg text-slate-900">
          {g.raspuns}
        </p>

        <div id="pe-scurt" className="mt-4 rounded-xl border border-brand-100 bg-brand-50 p-4">
          <p className="font-semibold text-slate-900">Pe scurt</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {g.peScurt.map((p) => (
              <li key={p}><Inline text={p} /></li>
            ))}
          </ul>
        </div>

        <nav aria-label="Cuprins" className="mt-6 rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <p className="font-semibold text-slate-900">Cuprins</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            {[...h2.map((t): [string, string] => [t, ancora(t)]), ["Întrebări frecvente", "intrebari"] as [string, string], ["Surse", "surse"] as [string, string]].map(([t, id]) => (
              <li key={id}><a href={`#${id}`} className="text-brand-700 underline-offset-2 hover:underline">{t}</a></li>
            ))}
          </ol>
        </nav>

        <ArticleBody corp={g.corp} />

        <section>
          <h2 id="intrebari" className="mt-10 scroll-mt-4 text-xl md:text-2xl font-bold text-slate-900">Întrebări frecvente</h2>
          {g.faq.map((f) => (
            <div key={f.q} className="mt-4">
              <h3 className="font-semibold text-slate-900">{f.q}</h3>
              <p className="mt-1">{f.a}</p>
            </div>
          ))}
        </section>

        <section>
          <h2 id="surse" className="mt-10 scroll-mt-4 text-xl md:text-2xl font-bold text-slate-900">Surse</h2>
          <p className="mt-3 text-sm">
            Cifrele sunt calculate din grilele oficiale ale proiectului, cu aceleași reguli ca în calculator; când apare o variantă nouă,
            articolul se actualizează. Documentele folosite:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-6 text-sm">
            {g.surse.map((s) => (
              <li key={s.url + s.titlu}>
                <a href={s.url} className="text-brand-700 underline underline-offset-2">{s.titlu}</a>
                {s.nota && <>: {s.nota}</>}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-bold text-slate-900">Mai departe</h2>
          <ul className="mt-2 space-y-1">
            {g.legaturi.map(([h, t]) => (
              <li key={h}><Link href={h} className="font-semibold text-brand-700 underline underline-offset-2">{t}</Link></li>
            ))}
          </ul>
          {altele.length > 0 && (
            <>
              <p className="mt-4 font-semibold text-slate-900">Alte ghiduri</p>
              <ul className="mt-1 space-y-1 text-sm">
                {altele.map((x) => (
                  <li key={x.slug}><Link href={`/ghiduri/${x.slug}`} className="text-brand-700 underline-offset-2 hover:underline">{x.titlu}</Link></li>
                ))}
              </ul>
            </>
          )}
        </section>
      </article>
    </main>
  );
}
