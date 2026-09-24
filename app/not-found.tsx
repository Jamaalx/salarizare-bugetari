import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pagina nu există — Calculator Salariu Bugetari",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Pagina nu există</h1>
      <p className="mt-3 text-slate-700">
        Adresa nu mai există sau a fost scrisă greșit. Mergi la{" "}
        <Link href="/" className="font-semibold text-brand-700 underline underline-offset-2">calculator</Link> sau la{" "}
        <Link href="/grila" className="font-semibold text-brand-700 underline underline-offset-2">grilele de salarizare</Link>.
      </p>
    </main>
  );
}
