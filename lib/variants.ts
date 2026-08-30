/**
 * Variantele oficiale ale proiectului de lege a salarizării (MMFTSS 2026).
 *
 * Fișier SIGUR pentru client (nu importă seturile de coeficienți, doar
 * metadatele din data/variants/index.json și grilele soldelor de grad).
 * Seturile de date propriu-zise se încarcă server-side din lib/variants-data.ts
 * sau prin /api/coeficienti/<id>.
 */
import index from "@/data/variants/index.json";
import soldeMai from "@/data/variants/2026-05-25.solde-grad.json";
import soldeIul from "@/data/variants/2026-07-17.solde-grad.json";
import soldeAug from "@/data/variants/2026-08-20.solde-grad.json";
import type { SoldaGrad } from "./tax";

export const VARIANTA_IDS = ["2026-05-25", "2026-07-17", "2026-08-20"] as const;
export type VariantaId = (typeof VARIANTA_IDS)[number];

export interface VariantaSursa {
  titlu: string;
  url: string;
}

export interface Varianta {
  id: VariantaId;
  /** „I", „II", „III" */
  numar: string;
  /** „25 mai 2026" */
  eticheta: string;
  etichetaLunga: string;
  data: string;
  /** lei — cuantumul fixat prin lege pentru perioada de mai jos */
  valoareReferinta: number;
  /** „2027" / „decembrie 2026 și 2027" */
  perioadaValoareReferinta: string;
  /** trimiterea la articolul care fixează valoarea de referință */
  articolValoareReferinta: string;
  intrareInVigoare: string;
  intrareInVigoareText: string;
  articolIntrareInVigoare: string;
  /** luna de referință pentru diferența salarială tranzitorie */
  referintaDiferentaTranzitorie: string;
  articolDiferentaTranzitorie: string;
  /** null = textul nu mai prevede o dată-limită */
  limitaDiferentaTranzitorie: string | null;
  numarArticole: number;
  surse: VariantaSursa[];
  note: string[];
  /** grila soldelor de grad (Anexa VI cap. I.2) din varianta respectivă */
  soldeGrad: SoldaGrad[];
}

type VariantaJson = Omit<Varianta, "id" | "soldeGrad"> & {
  id: string;
  fisiere: { coeficienti: string; soldeGrad: string };
};

const SOLDE: Record<VariantaId, SoldaGrad[]> = {
  "2026-05-25": soldeMai,
  "2026-07-17": soldeIul,
  "2026-08-20": soldeAug,
};

export function esteVariantaId(x: unknown): x is VariantaId {
  return typeof x === "string" && (VARIANTA_IDS as readonly string[]).includes(x);
}

export const VARIANTE: Varianta[] = (index.variante as VariantaJson[]).map((v) => {
  if (!esteVariantaId(v.id)) throw new Error(`Variantă necunoscută în index.json: ${v.id}`);
  const { fisiere: _fisiere, ...rest } = v;
  void _fisiere;
  return { ...rest, id: v.id, soldeGrad: SOLDE[v.id] };
});

/** Varianta afișată implicit — ultimul text oficial publicat. */
export const VARIANTA_IMPLICITA: VariantaId = esteVariantaId(index.implicit)
  ? index.implicit
  : "2026-08-20";

export function getVarianta(id?: string | null): Varianta {
  const found = esteVariantaId(id) ? VARIANTE.find((v) => v.id === id) : undefined;
  return found ?? VARIANTE.find((v) => v.id === VARIANTA_IMPLICITA)!;
}

/** Familiile ocupaționale (anexele I–IX) — denumiri folosite în UI, MCP și date. */
export const ANEXE = [
  { anexa: "I", nume: "Învățământ și cercetare", desc: "Profesori, educatori, didactic auxiliar, cercetători (CS I/II/III), institute de cercetare" },
  { anexa: "II", nume: "Sănătate și asistență socială", desc: "Medici, asistente, infirmieri, asistenți sociali" },
  { anexa: "III", nume: "Cultură", desc: "Biblioteci, muzee, teatre, presa publică" },
  { anexa: "IV", nume: "Diplomație", desc: "Personal MAE, ambasade, consulate" },
  { anexa: "V", nume: "Justiție", desc: "Judecători, procurori, grefieri, executori" },
  { anexa: "VI", nume: "Apărare, ordine publică", desc: "Militari, poliție, penitenciare, ISU" },
  { anexa: "VII", nume: "Instituții din venituri proprii", desc: "Personal din instituții publice finanțate integral din venituri proprii (cercetătorii CS I/II/III sunt în Anexa I)" },
  { anexa: "VIII", nume: "Administrație", desc: "Funcționari publici, personal contractual" },
  { anexa: "IX", nume: "Funcții de demnitate publică", desc: "Aleși locali, miniștri, parlamentari" },
] as const;

export const ANEXA_NUME: Record<string, string> = Object.fromEntries(
  ANEXE.map((a) => [a.anexa, a.nume]),
);

/**
 * Textul scurt „din 2027" / „din 1 dec 2026" folosit în etichete.
 */
export function etichetaAplicare(v: Varianta): string {
  return v.intrareInVigoare === "2027-01-01" ? "din 2027" : "din 1 dec. 2026";
}
