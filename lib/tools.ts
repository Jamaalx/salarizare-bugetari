/**
 * Tools partajate între MCP server și chat AI.
 * Fiecare tool e o funcție pură care primește input validat și returnează rezultat structurat.
 */
import { z } from "zod";
import coefData from "@/data/coefficients.json";
import {
  calcBrut,
  aplicaGradatie,
  GRADATII,
  SPORURI_STANDARD,
  VALOARE_REFERINTA_DEFAULT,
  gradatieDinVechime,
} from "./tax";

type CoefEntry = (typeof coefData.data)[number];

const ALL_DATA: CoefEntry[] = coefData.data as any;

const ANEXE = [
  { anexa: "I", nume: "Învățământ", desc: "Profesori, educatori, învățători, didactic auxiliar" },
  { anexa: "II", nume: "Sănătate și asistență socială", desc: "Medici, asistente, infirmieri, asistenți sociali" },
  { anexa: "III", nume: "Cultură", desc: "Biblioteci, muzee, teatre, presa publică" },
  { anexa: "IV", nume: "Diplomație", desc: "Personal MAE, ambasade, consulate" },
  { anexa: "V", nume: "Justiție", desc: "Judecători, procurori, grefieri, executori" },
  { anexa: "VI", nume: "Apărare, ordine publică", desc: "Militari, poliție, penitenciare, ISU" },
  { anexa: "VII", nume: "Cercetare", desc: "Cercetători, dezvoltare tehnologică" },
  { anexa: "VIII", nume: "Administrație", desc: "Funcționari publici, personal contractual" },
  { anexa: "IX", nume: "Funcții de demnitate publică", desc: "Aleși locali, miniștri, parlamentari" },
];

/* ============ SCHEMAS ============ */

export const searchFunctionSchema = z.object({
  query: z.string().describe("Cuvinte cheie pentru căutare (ex: 'profesor universitar', 'inspector')"),
  anexa: z
    .enum(["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"])
    .optional()
    .describe("Filtrare după anexă (I=învățământ, II=sănătate, etc.)"),
  limit: z.number().int().min(1).max(50).default(10).describe("Număr maxim rezultate"),
});

export const calculateSalarySchema = z.object({
  coeficient: z
    .number()
    .min(0.5)
    .max(10)
    .describe("Coeficientul de salarizare (între 1.00 și 8.00 conform legii)"),
  aniVechime: z
    .number()
    .int()
    .min(0)
    .max(60)
    .default(0)
    .describe("Ani vechime totală în muncă (inclusiv sectorul privat)"),
  valoareReferinta: z
    .number()
    .default(VALOARE_REFERINTA_DEFAULT)
    .describe("Valoarea de referință în lei (4100 pentru 2027, art. 47)"),
  coefIncludeVechime: z
    .boolean()
    .default(false)
    .describe(
      "True pentru funcții unde coef include deja vechimea (învățământ universitar, sanitar) sau funcții de conducere — gradațiile nu se mai aplică"
    ),
  sporuri: z
    .array(
      z.object({
        id: z.enum([
          "control-fin",
          "fonduri-eu",
          "noapte",
          "ore-supl-75",
          "ore-supl-100",
          "handicap",
          "conditii",
        ]),
        procent: z.number().optional(),
      })
    )
    .default([])
    .describe("Lista sporurilor aplicabile cu procentul (dacă e custom)"),
});

export const getLawArticleSchema = z.object({
  numar: z
    .number()
    .int()
    .min(1)
    .max(50)
    .describe("Numărul articolului din lege (1-50)"),
});

/* ============ TOOL IMPLEMENTATIONS ============ */

export function searchFunction(input: z.infer<typeof searchFunctionSchema>) {
  let list = ALL_DATA;
  if (input.anexa) list = list.filter((e) => e.anexa === input.anexa);
  const q = input.query.toLowerCase().trim();
  if (q) {
    list = list.filter(
      (e) =>
        e.functie.toLowerCase().includes(q) ||
        e.capitol.toLowerCase().includes(q)
    );
  }
  const results = list.slice(0, input.limit).map((e) => ({
    functie: e.functie,
    anexa: e.anexa,
    anexaNume: e.anexaNume,
    capitol: e.capitol,
    studii: e.studii || undefined,
    grad: e.grad || undefined,
    vechime: e.vechime || undefined,
    coeficient: e.coeficient,
    cod: e.cod || undefined,
  }));
  return {
    total: list.length,
    afisate: results.length,
    rezultate: results,
  };
}

export function calculateSalary(input: z.infer<typeof calculateSalarySchema>) {
  const valRef = input.valoareReferinta;
  const gradatie = input.coefIncludeVechime ? 0 : gradatieDinVechime(input.aniVechime);

  const salariuG0 = input.coeficient * valRef;
  const salariuBaza = Math.round(aplicaGradatie(salariuG0, gradatie));

  const sporuriState = SPORURI_STANDARD.map((sp) => {
    const found = input.sporuri.find((s) => s.id === sp.id);
    return {
      spor: sp,
      activ: !!found,
      procentCustom: found?.procent,
    };
  });

  const tax = calcBrut({
    salariuBaza,
    sporuri: sporuriState,
    valoareReferinta: valRef,
  });

  return {
    input: {
      coeficient: input.coeficient,
      valoareReferinta: valRef,
      aniVechime: input.aniVechime,
      gradatie: gradatie,
      coefIncludeVechime: input.coefIncludeVechime,
    },
    salariuDeBaza: salariuBaza,
    detaliiCalcul: {
      coefXValRef: Math.round(salariuG0),
      adaosGradatii: salariuBaza - Math.round(salariuG0),
      sporuriInPlafon: tax.sporuriProcent,
      sporuriExceptate: tax.sporuriExceptate,
      sporuriDepasescPlafon: tax.sporuriDepasescPlafon,
    },
    salariuBrut: tax.salariuBrut,
    impozite: {
      cas25: tax.cas,
      cass10: tax.cass,
      impozit10: tax.impozit,
    },
    salariuNet: tax.salariuNet,
    moneda: "RON",
    note: input.coefIncludeVechime
      ? "Pentru această funcție gradațiile nu se aplică — coef include deja vechimea sau e funcție de conducere"
      : `Gradația ${gradatie} aplicată (${GRADATII[gradatie].numeRange})`,
  };
}

export function listAnexe() {
  return {
    anexe: ANEXE.map((a) => ({
      anexa: a.anexa,
      nume: a.nume,
      descriere: a.desc,
      numarFunctii: ALL_DATA.filter((e) => e.anexa === a.anexa).length,
    })),
    total: ALL_DATA.length,
  };
}

export function getGradatiiTable() {
  return {
    descriere:
      "Gradațiile se aplică succesiv (compus) pe salariul de bază. Excepție: funcții de conducere și învățământ universitar/sanitar — coef include deja vechimea.",
    referintaLegala: "Art. 13 din proiectul de lege MMFTSS",
    gradatii: GRADATII,
  };
}

export function getLawArticle(input: z.infer<typeof getLawArticleSchema>) {
  return {
    avertisment:
      "Pentru textul integral al articolului, descarcă proiectul oficial. Acest tool oferă doar rezumate cheie.",
    descarcaProiect:
      "https://mmuncii.ro/j33/index.php/ro/transparenta/proiecte-in-dezbatere",
    articol: input.numar,
    rezumat: LAW_SUMMARIES[input.numar] ?? "Articol nedocumentat în rezumat.",
  };
}

const LAW_SUMMARIES: Record<number, string> = {
  1: "Obiect: sistemul de salarizare al personalului bugetar plătit din bugetul general consolidat. Drepturile salariale sunt EXCLUSIV cele prevăzute în lege.",
  2: "Domeniu: se aplică instituțiilor publice, autorităților publice, demnitarilor. NU se aplică BNR, ASF, ANRE, ANCOM.",
  5: "Raportul salarial: între cel mai mic și cel mai mare salariu este 1 la 8.",
  7: "Definiții: coeficient, valoare de referință, gradație, grad managerial, indemnizație, salariu de bază, valoare de referință etc.",
  8: "Ierarhizarea funcțiilor: metoda analitică de evaluare, 12 grade salariale.",
  9: "Structură: 12 grade salariale, interval coef 1-8. Valoarea de referință se stabilește anual prin HG.",
  10: "Salariu de bază = coef × val. ref. + gradații. Funcțiile de conducere au gradația maximă inclusă.",
  13: "Gradații (6 nivele): G0 <3 ani (0%), G1 3-5 (+7.5%), G2 5-10 (+5%), G3 10-15 (+5%), G4 15-20 (+2.5%), G5 >20 (+2.5%). Se aplică succesiv multiplicativ.",
  14: "Spor control financiar preventiv: 10%.",
  15: "Spor pentru proiecte fonduri europene: până la 40%.",
  17: "Spor muncă de noapte (22:00-06:00): 25%.",
  18: "Ore suplimentare: compensare cu liber în 60 zile, altfel +75% în zile lucrătoare / +100% în weekend.",
  19: "Spor persoane cu handicap grav/accentuat: 15% din valoarea de referință.",
  20: "Spor condiții de muncă: stabilit prin regulament-cadru pe domeniu.",
  21: "Plafon sporuri: 20% din suma salariilor de bază. Excepții: noapte, ore supl., handicap, fonduri EU (parțial).",
  32: "Diferența salarială tranzitorie: dacă salariul nou < salariul dec. 2026, se acordă diferența ca drept individual până la 31 dec. 2031.",
  47: "Intrare în vigoare: 1 ianuarie 2027. Valoarea de referință pentru 2027 este de 4100 lei.",
};

/* ============ JSON Schema for OpenAI-style tool calling ============ */

export const TOOL_DEFINITIONS = [
  {
    name: "search_function",
    description:
      "Caută o funcție bugetară în datasetul legii (2627 funcții). Returnează numele funcției, coeficientul, anexa și detalii (grad, studii, vechime).",
    schema: searchFunctionSchema,
    handler: searchFunction,
  },
  {
    name: "calculate_salary",
    description:
      "Calculează salariul brut și net pentru o funcție, dat coeficientul. Aplică gradații de vechime, sporuri configurabile, deduce impozitele (CAS 25%, CASS 10%, impozit pe venit 10%). Pentru funcții de conducere sau învățământ universitar/sanitar, setează coefIncludeVechime=true.",
    schema: calculateSalarySchema,
    handler: calculateSalary,
  },
  {
    name: "list_anexe",
    description:
      "Listează cele 9 anexe (familii ocupaționale) din lege cu numărul de funcții din fiecare.",
    schema: z.object({}),
    handler: listAnexe,
  },
  {
    name: "get_gradatii_table",
    description:
      "Returnează tabelul cu cele 6 gradații de vechime și cotele de majorare conform art. 13.",
    schema: z.object({}),
    handler: getGradatiiTable,
  },
  {
    name: "get_law_article",
    description:
      "Returnează un rezumat al unui articol din proiectul de lege MMFTSS (1-50).",
    schema: getLawArticleSchema,
    handler: getLawArticle,
  },
] as const;
