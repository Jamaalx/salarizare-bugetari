/**
 * Tools partajate între MCP server și chat AI.
 * Fiecare tool e o funcție pură care primește input validat și returnează rezultat structurat.
 *
 * Toate tool-urile care depind de date acceptă parametrul opțional `varianta`
 * (2026-05-25 / 2026-07-17 / 2026-08-20). Lipsă → varianta implicită
 * (ultimul text oficial). Apelurile vechi, fără `varianta`, rămân valide.
 */
import { z } from "zod";
import {
  calcBrut,
  aplicaGradatie,
  GRADATII,
  GRADATII_APARARE,
  SPORURI_STANDARD,
  gradatieDinVechime,
} from "./tax";
import {
  ANEXE,
  VARIANTA_IDS,
  VARIANTA_IMPLICITA,
  VARIANTE,
  getVarianta,
  type VariantaId,
} from "./variants";
import { getFunctii, numarFunctii } from "./variants-data";

const VARIANTA_DESC =
  "Varianta proiectului de lege: " +
  VARIANTE.map(
    (v) =>
      `${v.id} = ${v.eticheta} (valoare de referință ${v.valoareReferinta} lei, în vigoare de la ${v.intrareInVigoareText})`,
  ).join("; ") +
  `. Implicit: ${VARIANTA_IMPLICITA} (ultimul text oficial publicat).`;

const variantaSchema = z.enum(VARIANTA_IDS).optional().describe(VARIANTA_DESC);

const fold = (s: string) =>
  s
    .toLowerCase()
    .replace(/[șş]/g, "s")
    .replace(/[țţ]/g, "t")
    .replace(/[ăâ]/g, "a")
    .replace(/î/g, "i")
    .replace(/\s+/g, " ")
    .trim();

/* ============ SCHEMAS ============ */

export const searchFunctionSchema = z.object({
  query: z.string().describe("Cuvinte cheie pentru căutare (ex: 'profesor universitar', 'inspector'); caută în numele funcției, grad, capitol, treaptă de populație și cod"),
  anexa: z
    .enum(["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"])
    .optional()
    .describe("Filtrare după anexă (I=învățământ, II=sănătate, etc.)"),
  limit: z.number().int().min(1).max(50).default(10).describe("Număr maxim rezultate"),
  varianta: variantaSchema,
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
    .describe(
      "Ani vechime totală în muncă (inclusiv sectorul privat). Pentru Anexa VI (militari/poliție/penitenciare): timpul servit ca militar/polițist — 7 gradații de 3% la 3/6/9/12/15/18/21 ani",
    ),
  anexa: z
    .enum(["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"])
    .optional()
    .describe(
      "Anexa funcției (din search_function). Contează pentru gradații: Anexa VI folosește cele 7 gradații de 3% (Anexa VI art. 4), celelalte cele 6 gradații din art. 13. Lipsă → Anexa VI dacă e dat soldaGradCoef, altfel regimul general.",
    ),
  valoareReferinta: z
    .number()
    .optional()
    .describe(
      "Valoarea de referință în lei. Lipsă → cea fixată de varianta aleasă: 4100 (25 mai, art. 35 alin. 2; 17 iulie, art. 36 alin. 2) sau 4000 (20 august, art. 38 alin. 3)",
    ),
  coefIncludeVechime: z
    .boolean()
    .default(false)
    .describe(
      "True DOAR pentru funcții unde gradația e deja inclusă: funcții de conducere, Anexa V (justiție — indemnizație de încadrare) și Anexa IX (demnitate publică). Pentru execuție (inclusiv învățământ și sănătate) lasă FALSE — coeficientul din anexă e la gradația 0 (art. 13 alin. 2), iar gradațiile de vechime în muncă se aplică pe deasupra. Câmpul vechime din grila de învățământ/sănătate e vechimea în specialitate care alege coeficientul, NU vechimea în muncă din art. 13"
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
        ore: z
          .number()
          .optional()
          .describe("Ore/lună pentru sporurile orare (noapte, ore supl.) — necesită și oreNormaLunara"),
        fractie: z
          .number()
          .optional()
          .describe("Fracțiunea de timp (0–100) pentru sporurile proporționale cu timpul lucrat"),
      })
    )
    .default([])
    .describe("Lista sporurilor aplicabile cu procentul (dacă e custom)"),
  oreNormaLunara: z
    .number()
    .optional()
    .describe("Ore din programul lunar de lucru — numitorul tarifului orar pentru sporurile orare (ex: 165–168)"),
  soldaGradCoef: z
    .number()
    .optional()
    .describe(
      "DOAR Anexa VI (militari/poliție/penitenciare): coeficientul soldei de grad / salariului gradului profesional (cap. I.2). Grila depinde de variantă: 25 mai 0.1 (soldat) … 1.0 (mareșal); 17 iulie și 20 august 0.40 (soldat) … 1.10 (mareșal) — vezi list_variante. Solda lunară = soldă de funcție (coeficient de mai sus, cu gradații) + soldă de grad (acest coef × val. ref., FĂRĂ gradații — art. 2 alin. 2, art. 4 alin. 3, art. 6 alin. 4). Omite pentru celelalte anexe.",
    ),
  persoaneInIntretinere: z
    .number()
    .int()
    .min(0)
    .max(10)
    .optional()
    .describe("Persoane în întreținere pentru deducerea personală de bază (art. 77 alin. 4 Cod fiscal; 4 = „4 și peste”). Lipsă → 0."),
  sub26Ani: z
    .boolean()
    .optional()
    .describe("Contribuabil de până la 26 de ani — deducere suplimentară 15% din salariul minim (art. 77 alin. 10 lit. a Cod fiscal)."),
  copiiInvatamant: z
    .number()
    .int()
    .min(0)
    .max(20)
    .optional()
    .describe("Copii de până la 18 ani înscriși în învățământ — 100 lei/copil (art. 77 alin. 10 lit. b Cod fiscal)."),
  varianta: variantaSchema,
});

export const getLawArticleSchema = z.object({
  numar: z
    .number()
    .int()
    .min(1)
    .max(50)
    .describe("Numărul articolului din lege (1-41; numerotarea diferă între variante la art. 32+)"),
  varianta: variantaSchema,
});

export const listAnexeSchema = z.object({ varianta: variantaSchema });

/* ============ TOOL IMPLEMENTATIONS ============ */

export function searchFunction(input: z.infer<typeof searchFunctionSchema>) {
  const vid: VariantaId = input.varianta ?? VARIANTA_IMPLICITA;
  let list = getFunctii(vid);
  if (input.anexa) list = list.filter((e) => e.anexa === input.anexa);
  // Căutare pe cuvinte (toate trebuie să apară), fără diacritice — „medic primar"
  // găsește și rândul „Medic *1)" + grad „primar" din varianta 20 august.
  const tokens = fold(input.query).split(" ").filter(Boolean);
  if (tokens.length) {
    list = list.filter((e) => {
      const h = fold(`${e.functie} ${e.grad} ${e.capitol} ${e.subcapitol ?? ""} ${e.cod}`);
      return tokens.every((t) => h.includes(t));
    });
  }
  const results = list.slice(0, input.limit).map((e) => ({
    functie: e.functie,
    anexa: e.anexa,
    anexaNume: e.anexaNume,
    capitol: e.capitol,
    subcapitol: e.subcapitol,
    studii: e.studii || undefined,
    grad: e.grad || undefined,
    vechime: e.vechime || undefined,
    coeficient: e.coeficient,
    coeficientEsalonat: e.coeficientEsalonat,
    cod: e.cod || undefined,
  }));
  return {
    varianta: vid,
    total: list.length,
    afisate: results.length,
    rezultate: results,
  };
}

export function calculateSalary(input: z.infer<typeof calculateSalarySchema>) {
  const variant = getVarianta(input.varianta);
  const valRef = input.valoareReferinta ?? variant.valoareReferinta;
  // Militarii/polițiștii/polițiștii de penitenciare au 7 gradații de 3% (3–21 ani).
  // sursa: proiect MMFTSS art. 13 alin. (1) (excepția) + Anexa VI cap. II art. 4 alin. (3)
  // (forma din 20 mai 2026). Fără `anexa`, soldaGradCoef > 0 identifică Anexa VI.
  const esteAnexaVI = input.anexa === "VI" || (input.anexa === undefined && (input.soldaGradCoef ?? 0) > 0);
  const tabel = esteAnexaVI ? GRADATII_APARARE : GRADATII;
  const gradatie = input.coefIncludeVechime ? 0 : gradatieDinVechime(input.aniVechime, tabel);

  const salariuG0 = input.coeficient * valRef;
  const salariuBaza = Math.round(aplicaGradatie(salariuG0, gradatie, tabel));

  const sporuriState = SPORURI_STANDARD.map((sp) => {
    const found = input.sporuri.find((s) => s.id === sp.id);
    return {
      spor: sp,
      activ: !!found,
      procentCustom: found?.procent,
      ore: found?.ore,
      fractieTimp: found?.fractie,
    };
  });

  const tax = calcBrut({
    salariuBaza,
    sporuri: sporuriState,
    valoareReferinta: valRef,
    oreNormaLunara: input.oreNormaLunara,
    soldaGradCoef: input.soldaGradCoef,
    persoaneInIntretinere: input.persoaneInIntretinere,
    sub26Ani: input.sub26Ani,
    copiiInvatamant: input.copiiInvatamant,
  });

  return {
    varianta: {
      id: variant.id,
      eticheta: variant.eticheta,
      intrareInVigoare: variant.intrareInVigoareText,
      valoareReferintaLege: variant.valoareReferinta,
      articolValoareReferinta: variant.articolValoareReferinta,
    },
    input: {
      coeficient: input.coeficient,
      valoareReferinta: valRef,
      aniVechime: input.aniVechime,
      gradatie: gradatie,
      regimGradatii: esteAnexaVI ? "Anexa VI art. 4 (7 × 3%)" : "art. 13 (6 gradații)",
      coefIncludeVechime: input.coefIncludeVechime,
    },
    salariuDeBaza: tax.salariuBaza,
    detaliiCalcul: {
      coefXValRef: Math.round(salariuG0),
      adaosGradatii: salariuBaza - Math.round(salariuG0),
      soldaDeFunctie: tax.soldaGrad > 0 ? salariuBaza : undefined,
      soldaDeGrad: tax.soldaGrad > 0 ? tax.soldaGrad : undefined,
      sporuriInPlafon: tax.sporuriProcent,
      sporuriExceptate: tax.sporuriExceptate,
      sporuriDepasescPlafon: tax.sporuriDepasescPlafon,
    },
    salariuBrut: tax.salariuBrut,
    impozite: {
      cas25: tax.cas,
      cass10: tax.cass,
      impozit10: tax.impozit,
      deducerePersonala: tax.deductibil,
    },
    salariuNet: tax.salariuNet,
    moneda: "RON",
    note: input.coefIncludeVechime
      ? "Pentru această funcție gradațiile nu se aplică — coef include deja vechimea sau e funcție de conducere"
      : `Gradația ${gradatie} aplicată (${tabel[gradatie].numeRange}${esteAnexaVI ? ", regimul Anexei VI: +3% pe gradație" : ""})`,
  };
}

export function listAnexe(input: z.infer<typeof listAnexeSchema> = {}) {
  const vid: VariantaId = input.varianta ?? VARIANTA_IMPLICITA;
  const rows = getFunctii(vid);
  return {
    varianta: vid,
    anexe: ANEXE.map((a) => ({
      anexa: a.anexa,
      nume: a.nume,
      descriere: a.desc,
      numarFunctii: rows.filter((e) => e.anexa === a.anexa).length,
    })),
    total: rows.length,
  };
}

export function listVariante() {
  return {
    implicit: VARIANTA_IMPLICITA,
    context:
      "Proiectul de lege NU a fost adoptat. Pe 26 august 2026 partidele au anunțat că nu au ajuns la consens (jalonul PNRR de 770 mil. € a fost pierdut) și s-au angajat să adopte legea până la sfârșitul anului. Cele trei variante de mai jos sunt textele oficiale publicate.",
    nemodelat: [
      "Sănătate (Anexa II cap. II, varianta 20 august): cele 6 categorii de unități și factorii de multiplicare pe grupe (min. 8/6/4/2%) se stabilesc anual prin HG — nu pot fi calculați.",
      "Indemnizația pentru titlul științific de doctor: 500 lei brut/lună, în afara plafonului (art. 39, varianta 20 august).",
      "Premiul de performanță (10–20% din salariul de bază, art. 22) — drept discreționar, nu intră în salariul lunar.",
    ],
    variante: VARIANTE.map((v) => ({
      id: v.id,
      numar: v.numar,
      eticheta: v.eticheta,
      etichetaLunga: v.etichetaLunga,
      data: v.data,
      valoareReferinta: v.valoareReferinta,
      perioadaValoareReferinta: v.perioadaValoareReferinta,
      articolValoareReferinta: v.articolValoareReferinta,
      intrareInVigoare: v.intrareInVigoareText,
      articolIntrareInVigoare: v.articolIntrareInVigoare,
      diferentaTranzitorie: {
        referinta: v.referintaDiferentaTranzitorie,
        articol: v.articolDiferentaTranzitorie,
        limita: v.limitaDiferentaTranzitorie,
      },
      numarFunctii: numarFunctii(v.id),
      soldeGrad: v.soldeGrad.map((g) => ({ key: g.key, grad: g.label, coeficient: g.coef })),
      note: v.note,
      surse: v.surse,
    })),
  };
}

export function getGradatiiTable() {
  return {
    descriere:
      "Gradațiile se aplică succesiv (compus) pe salariul de bază; coeficienții de execuție din anexe sunt la gradația 0 (art. 13 alin. 2). Excepții (art. 13 alin. 1): demnitate publică, funcții de conducere și înalți funcționari publici (gradația e inclusă) și militarii/polițiștii/polițiștii de penitenciare, care au regimul propriu din Anexa VI (câmpul anexaVI). Tabelele sunt identice în toate cele trei variante ale proiectului.",
    referintaLegala: "Art. 13 din proiectul de lege MMFTSS (25 mai / 17 iulie / 20 august 2026)",
    gradatii: GRADATII,
    anexaVI: {
      descriere:
        "Militari, polițiști și polițiști de penitenciare (exceptați de la art. 13 alin. 1): 7 gradații, fiecare +3% aplicat succesiv la solda/salariul de funcție; solda de grad nu primește gradații.",
      referintaLegala: "Anexa VI cap. II art. 4 alin. (1)-(3) din proiectul MMFTSS",
      gradatii: GRADATII_APARARE,
    },
  };
}

export function getLawArticle(input: z.infer<typeof getLawArticleSchema>) {
  const variant = getVarianta(input.varianta);
  const rezumat =
    LAW_SUMMARIES_BY_VARIANT[variant.id][input.numar] ??
    LAW_SUMMARIES_COMMON[input.numar] ??
    "Articol nedocumentat în rezumat.";
  return {
    avertisment:
      "Pentru textul integral al articolului, descarcă proiectul oficial. Acest tool oferă doar rezumate cheie. Numerotarea articolelor finale diferă între variante (vezi list_variante).",
    varianta: variant.id,
    descarcaProiect: variant.surse[0]?.url,
    articol: input.numar,
    rezumat,
  };
}

// Articolele comune (numerotare identică în toate cele trei variante).
const LAW_SUMMARIES_COMMON: Record<number, string> = {
  1: "Obiect: sistemul de salarizare al personalului bugetar plătit din bugetul general consolidat. Drepturile salariale sunt EXCLUSIV cele prevăzute în lege.",
  2: "Domeniu: se aplică instituțiilor publice, autorităților publice, demnitarilor. NU se aplică BNR, ASF, ANRE, ANCOM.",
  5: "Raportul salarial: între cel mai mic și cel mai mare salariu este 1 la 8.",
  7: "Definiții: coeficient, valoare de referință, gradație, grad managerial, indemnizație, salariu de bază, diferență salarială tranzitorie, premiu de performanță etc.",
  8: "Ierarhizarea funcțiilor: metoda analitică de evaluare, 12 grade salariale.",
  9: "Structură: 12 grade salariale, interval coef 1-8. Valoarea de referință se stabilește anual prin HG (alin. 3).",
  10: "Salariu de bază = coef × val. ref. + gradații. Funcțiile de conducere au gradația maximă inclusă.",
  13: "Gradații (6 nivele): G0 <3 ani (0%), G1 3-5 (+7.5%), G2 5-10 (+5%), G3 10-15 (+5%), G4 15-20 (+2.5%), G5 >20 (+2.5%). Se aplică succesiv multiplicativ.",
  14: "Spor control financiar preventiv: 10%.",
  15: "Spor pentru proiecte fonduri europene: până la 40%.",
  17: "Spor muncă de noapte (22:00-06:00): 25%.",
  18: "Ore suplimentare: compensare cu liber în 60 zile, altfel +75% în zile lucrătoare / +100% în weekend.",
  19: "Spor persoane cu handicap grav/accentuat: 15% din valoarea de referință.",
  20: "Spor condiții de muncă: stabilit prin regulament-cadru pe domeniu.",
  21: "Plafon sporuri: 20% din suma salariilor de bază (baza include, pentru Anexa VI, și solda de grad). Excepții: noapte, ore supl., handicap, fonduri EU (parțial).",
  22: "Premiul de performanță: 10–20% din salariul de bază, acordat unui procent limitat din personal; nu intră în plafonul art. 21.",
};

// Articolele finale — numerotarea diferă între variante.
const LAW_SUMMARIES_BY_VARIANT: Record<VariantaId, Record<number, string>> = {
  "2026-05-25": {
    32: "Diferența salarială tranzitorie: dacă salariul nou < salariul lunar din decembrie 2026, se acordă diferența ca drept individual, cel târziu până la 31 decembrie 2031. Alin. (2)-(4): se exclud din bază drepturile pentru proiecte/gestionare fonduri europene și stimulentele.",
    35: "Intrare în vigoare: 1 ianuarie 2027 (alin. 1). Valoarea de referință pentru 2027 este de 4100 lei (alin. 2).",
    36: "Abrogări la data intrării în vigoare: Legea-cadru nr. 153/2017 și actele conexe.",
    37: "Anexele nr. I–IX fac parte integrantă din lege.",
  },
  "2026-07-17": {
    33: "Diferența salarială tranzitorie: dacă salariul nou < salariul aflat în plată în noiembrie 2026, se acordă diferența ca drept individual, până la egalizare; nu mai există limita 31 decembrie 2031. Se exclud din bază drepturile pentru fonduri europene și stimulentele.",
    34: "Soluționarea contestațiilor: 20 de zile pentru depunere, 30 de zile pentru soluționare, apoi instanța.",
    35: "Răspunderea aplicării legii; nerespectarea plafonului art. 21 = contravenție (30.000–50.000 lei).",
    36: "Intrare în vigoare: 1 decembrie 2026 (alin. 1). Valoarea de referință pentru decembrie 2026 și 2027 este de 4100 lei (alin. 2). Din 2028, majorarea e legată de reducerea cheltuielilor de personal ca % din PIB.",
    37: "Abrogări la data intrării în vigoare: Legea-cadru nr. 153/2017 și actele conexe.",
    38: "Anexele nr. I–IX fac parte integrantă din lege.",
  },
  "2026-08-20": {
    33: "Diferența salarială tranzitorie: dacă salariul nou < salariul aflat în plată în noiembrie 2026, se acordă diferența ca drept individual și se reduce în limita creșterilor ulterioare, până la stingere (fără limita 2031). Excluderi: fonduri europene, stimulente, drepturi preluate la art. 17-18 și Anexa II cap. II art. 1-3.",
    38: "Intrare în vigoare: 1 decembrie 2026 (alin. 1). Valoarea de referință pentru decembrie 2026 și 2027 este de 4.000 lei (alin. 3); Guvernul o poate modifica prin HG în 2027 (alin. 4). Din 2028, majorarea e legată de reducerea cheltuielilor de personal ca % din PIB (alin. 5).",
    39: "Modificarea Legii-cadru nr. 153/2017: indemnizația pentru titlul științific de doctor devine 500 lei brut/lună, în afara plafonului sporurilor.",
    40: "Abrogări la data intrării în vigoare: Legea-cadru nr. 153/2017 și actele conexe.",
    41: "Anexele nr. I–IX fac parte integrantă din lege.",
  },
};

/* ============ JSON Schema for OpenAI-style tool calling ============ */

export const TOOL_DEFINITIONS = [
  {
    name: "search_function",
    description:
      "Caută o funcție bugetară în datasetul legii (2.627 / 2.809 / 3.000 de funcții, în funcție de varianta proiectului: 25 mai / 17 iulie / 20 august 2026). Returnează numele funcției, coeficientul, anexa și detalii (grad, studii, vechime, treaptă de populație, coeficienți eșalonați pentru demnitari).",
    schema: searchFunctionSchema,
    handler: searchFunction,
  },
  {
    name: "calculate_salary",
    description:
      "Calculează salariul brut și net pentru o funcție, dat coeficientul. Aplică gradații de vechime, sporuri configurabile, deduce impozitele (CAS 25%, CASS 10%, impozit pe venit 10%). Valoarea de referință implicită depinde de variantă (4100 lei la 25 mai/17 iulie, 4000 lei la 20 august). Pentru funcții de conducere, Anexa V și Anexa IX setează coefIncludeVechime=true; pentru Anexa VI trimite anexa=\"VI\" (7 gradații de 3%).",
    schema: calculateSalarySchema,
    handler: calculateSalary,
  },
  {
    name: "list_anexe",
    description:
      "Listează cele 9 anexe (familii ocupaționale) din lege cu numărul de funcții din fiecare, pentru varianta aleasă a proiectului.",
    schema: listAnexeSchema,
    handler: listAnexe,
  },
  {
    name: "list_variante",
    description:
      "Listează cele trei variante oficiale ale proiectului de lege (25 mai, 17 iulie, 20 august 2026): valoarea de referință, data intrării în vigoare, referința diferenței tranzitorii, grila soldelor de grad, ce s-a schimbat și ce NU este modelat. Proiectul nu a fost adoptat (26 august 2026).",
    schema: z.object({}),
    handler: listVariante,
  },
  {
    name: "get_gradatii_table",
    description:
      "Returnează tabelul cu cele 6 gradații de vechime din art. 13 și, separat, cele 7 gradații de 3% ale militarilor/polițiștilor (Anexa VI art. 4) — identice în toate variantele.",
    schema: z.object({}),
    handler: getGradatiiTable,
  },
  {
    name: "get_law_article",
    description:
      "Returnează un rezumat al unui articol din proiectul de lege MMFTSS (1-41), pentru varianta aleasă (numerotarea articolelor finale diferă: intrarea în vigoare e art. 35 la 25 mai, art. 36 la 17 iulie, art. 38 la 20 august).",
    schema: getLawArticleSchema,
    handler: getLawArticle,
  },
] as const;
