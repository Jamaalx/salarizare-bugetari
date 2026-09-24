import type { Metadata } from "next";
import Link from "next/link";
import BannerNeadoptat from "@/components/BannerNeadoptat";
import { OG_IMAGE, RT_ORGANIZATIE, SITE_URL, breadcrumbLd, jsonLd } from "@/lib/seo";
import { ghiduri } from "@/lib/ghiduri";
import { dataLunga } from "@/lib/ghiduri/data";

const title = "Ghiduri despre salarizarea bugetarilor: noua lege, calculul, pe funcții";
const description =
  "Ghiduri pe datele proiectului noii legi a salarizării: cât ar câștiga fiecare funcție, cum se calculează salariul de bază, gradațiile și sporurile. Cu sursele oficiale.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/ghiduri", types: { "application/rss+xml": `${SITE_URL}/ghiduri/feed.xml` } },
  openGraph: { title, description, url: `${SITE_URL}/ghiduri`, siteName: "România Transparentă", locale: "ro_RO", type: "website", images: [{ url: OG_IMAGE, width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image" },
};

export default function GhiduriPage() {
  const G = ghiduri();
  return (
    <main className="min-h-screen bg-slate-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd({
          "@graph": [
            breadcrumbLd([["Calculator", "/"], ["Ghiduri", "/ghiduri"]]),
            {
              "@type": "Blog",
              "@id": `${SITE_URL}/ghiduri#blog`,
              name: "Ghiduri despre salarizarea bugetarilor",
              url: `${SITE_URL}/ghiduri`,
              inLanguage: "ro",
              publisher: RT_ORGANIZATIE,
              blogPost: G.map((g) => ({
                "@type": "BlogPosting",
                "@id": `${SITE_URL}/ghiduri/${g.slug}#articol`,
                headline: g.titlu,
                url: `${SITE_URL}/ghiduri/${g.slug}`,
                datePublished: g.publicat,
                dateModified: g.actualizat,
              })),
            },
          ],
        })}
      />
      <BannerNeadoptat />
      <div className="mx-auto max-w-3xl px-4 py-6 md:py-10">
        <nav aria-label="Breadcrumb" className="text-sm text-slate-600">
          <Link href="/" className="underline-offset-2 hover:underline">Calculator</Link> › <span aria-current="page">Ghiduri</span>
        </nav>
        <h1 className="mt-3 text-2xl md:text-4xl font-bold tracking-tight text-slate-900">Ghiduri despre salarizarea bugetarilor</h1>
        <p className="mt-2 text-slate-700 leading-relaxed">
          Ce prevede proiectul noii legi a salarizării pentru fiecare categorie de personal, explicat pe cifre. Fiecare cifră
          vine din grilele oficiale ale proiectului și e calculată cu aceleași reguli ca în calculator.
        </p>
        <ul className="mt-8 space-y-6">
          {G.map((g) => (
            <li key={g.slug} className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg md:text-xl font-semibold">
                <Link href={`/ghiduri/${g.slug}`} className="text-brand-700 underline-offset-2 hover:underline">{g.titlu}</Link>
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {g.categorie} · <time dateTime={g.publicat}>{dataLunga(g.publicat)}</time>
              </p>
              <p className="mt-2 text-slate-700">{g.descriere}</p>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-sm text-slate-600">
          Articolele noi apar și în <a href="/ghiduri/feed.xml" className="text-brand-700 underline underline-offset-2">fluxul RSS</a>.
        </p>
      </div>
    </main>
  );
}
