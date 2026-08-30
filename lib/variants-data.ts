/**
 * Seturile de coeficienți pe variante — DOAR server-side (tools MCP/chat,
 * /api/coeficienti). Nu importa din componente client: aduce ~2,3 MB de JSON.
 *
 *  - 2026-05-25 → data/coefficients.min.json (importul inițial, neschimbat)
 *  - 2026-07-17 → data/variants/2026-07-17.min.json (scripts/import-coeficienti.mjs)
 *  - 2026-08-20 → data/variants/2026-08-20.min.json (scripts/import-coeficienti.mjs)
 */
import mai from "@/data/coefficients.min.json";
import iul from "@/data/variants/2026-07-17.min.json";
import aug from "@/data/variants/2026-08-20.min.json";
import { ANEXA_NUME, getVarianta, type VariantaId } from "./variants";
import { esteRandSoldaDeGrad } from "./tax";

export interface CoefEntry {
  anexa: string;
  anexaNume: string;
  capitol: string;
  sheet: string;
  functie: string;
  studii: string;
  grad: string;
  vechime: string;
  coeficient: number;
  cod: string;
  nrCrt: number | null;
  /** treapta de populație (Anexa VIII administrație locală) — din iulie 2026 */
  subcapitol?: string;
  /** Anexa IX din iulie/august: coeficienții eșalonați pe ani ("2027" … "2031") */
  coeficientEsalonat?: Record<string, number>;
}

const ROMAN = /^(IX|VIII|VII|VI|IV|V|III|II|I)(?=[\s_]|$)/;

/**
 * Normalizează un set brut: completează `anexa` din numele sheet-ului acolo
 * unde lipsește (importul din mai avea 308 rânduri cu anexa goală) și aliniază
 * `anexaNume` la denumirile din UI.
 */
function normalize(rows: unknown[]): CoefEntry[] {
  return (rows as Record<string, unknown>[]).map((raw) => {
    const e = raw as unknown as CoefEntry;
    let anexa = String(e.anexa ?? "").trim();
    if (!anexa) {
      const m = String(e.sheet ?? e.capitol ?? "").match(ROMAN);
      anexa = m ? m[1] : "";
    }
    return {
      ...e,
      anexa,
      anexaNume: ANEXA_NUME[anexa] ?? e.anexaNume ?? "",
      studii: e.studii ?? "",
      grad: e.grad ?? "",
      vechime: e.vechime ?? "",
      cod: e.cod ?? "",
      nrCrt: e.nrCrt ?? null,
    };
  });
}

const DATASETS: Record<VariantaId, CoefEntry[]> = {
  "2026-05-25": normalize(mai),
  "2026-07-17": normalize(iul),
  "2026-08-20": normalize(aug),
};

/** Toate rândurile variantei (inclusiv, la 25 mai, rândurile soldei de grad). */
export function getCoeficienti(id: VariantaId): CoefEntry[] {
  return DATASETS[id];
}

/** Doar funcțiile selectabile (fără rândurile soldei de grad din Anexa VI cap. I.2). */
export function getFunctii(id: VariantaId): CoefEntry[] {
  const grid = getVarianta(id).soldeGrad;
  return DATASETS[id].filter((e) => !esteRandSoldaDeGrad(e, grid));
}

export function numarFunctii(id: VariantaId): number {
  return getFunctii(id).length;
}
