import { AlertTriangle } from "lucide-react";

/**
 * Banner permanent: proiectul de lege NU a fost adoptat (26 august 2026).
 * Text stabilit împreună cu proprietarul proiectului — nu-l reformula fără sursă.
 */
export default function BannerNeadoptat() {
  return (
    <div
      role="status"
      className="bg-rose-50 border-b border-rose-200 text-rose-900"
    >
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-start gap-3 text-sm leading-relaxed">
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" strokeWidth={2} />
        <p>
          <strong className="font-semibold">Proiectul de lege NU a fost adoptat.</strong> Pe 26
          august 2026 partidele au anunțat că nu au ajuns la consens (jalonul PNRR de 770 mil. €
          a fost pierdut) și s-au angajat să adopte legea până la sfârșitul anului. Calculatorul
          oferă cele trei variante oficiale publicate: <strong>25 mai</strong>,{" "}
          <strong>17 iulie</strong> și <strong>20 august 2026</strong>.{" "}
          <a href="#variante" className="underline underline-offset-2 hover:text-rose-700">
            Ce s-a schimbat între ele
          </a>
        </p>
      </div>
    </div>
  );
}
