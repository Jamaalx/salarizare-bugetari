// Calcul brut → net conform regulilor fiscale RO 2026
// Note: regulile fiscale se modifică anual. Acestea sunt valorile aplicabile
// la momentul redactării proiectului (mai 2026). Asistent/calculatorul oferă
// o estimare orientativă.

export const SAL_MIN_BRUT_2026 = 4050; // salariul minim brut pe țară 2026 (RO)

export function clampNumber(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export type SporType = "procent" | "valoare";

export interface Spor {
  id: string;
  nume: string;
  tip: SporType;
  // pentru tip="procent": procent din salariul de bază (inclus în plafonul 20% sau nu)
  // pentru tip="valoare": sumă fixă în lei sau procent din valoarea de referință
  valoare: number;
  inclusInPlafon20: boolean;
  descriere?: string;
}

export interface TaxInput {
  salariuBaza: number; // salariul de bază (după gradație), lei
  sporuri: { spor: Spor; activ: boolean; procentCustom?: number }[];
  valoareReferinta: number; // pentru sporul de handicap (15% din val ref)
}

export interface TaxBreakdown {
  salariuBaza: number;
  sporuriProcent: number; // total în lei din sporuri procentuale incluse în plafon
  sporuriValoare: number; // total în lei din sporuri valorice / din val referință
  sporuriExceptate: number; // în lei, sporuri în afara plafonului 20%
  salariuBrut: number;

  cas: number; // 25%
  cass: number; // 10%
  deductibil: number; // deducere personală
  impozit: number; // 10%
  salariuNet: number;

  plafon20: number; // 20% din salariul de bază = plafonul maxim pentru sporuri în plafon
  sporuriDepasescPlafon: boolean;
}

export function calcBrut(input: TaxInput): TaxBreakdown {
  const sb = input.salariuBaza;
  let sporuriProcent = 0;
  let sporuriValoare = 0;
  let sporuriExceptate = 0;

  for (const { spor, activ, procentCustom } of input.sporuri) {
    if (!activ) continue;
    let lei = 0;
    if (spor.tip === "procent") {
      const p = procentCustom ?? spor.valoare;
      lei = (sb * p) / 100;
    } else {
      // valoare = procent din valoarea de referință (ex: handicap 15% val ref)
      lei = (input.valoareReferinta * spor.valoare) / 100;
    }
    if (spor.inclusInPlafon20) sporuriProcent += lei;
    else sporuriExceptate += lei;
  }

  // Plafon 20% din salariul de bază pentru sporurile incluse în plafon
  const plafon20 = sb * 0.2;
  const sporuriDepasesc = sporuriProcent > plafon20;
  const sporuriProcentCapate = Math.min(sporuriProcent, plafon20);

  const salariuBrut = sb + sporuriProcentCapate + sporuriExceptate + sporuriValoare;

  // CAS 25%, CASS 10%
  const cas = Math.round(salariuBrut * 0.25);
  const cass = Math.round(salariuBrut * 0.1);
  const venitImpozabil = salariuBrut - cas - cass;

  // Deducere personală simplificată: 510 lei (fără persoane în întreținere) — RO 2026
  // Practic complex; folosim 0 deducere ca să arătăm valoare conservatoare.
  // Userul poate vedea breakdown-ul.
  const deductibil = 0;

  const impozit = Math.round(Math.max(0, venitImpozabil - deductibil) * 0.1);
  const salariuNet = venitImpozabil - impozit;

  return {
    salariuBaza: sb,
    sporuriProcent: sporuriProcentCapate,
    sporuriValoare: sporuriValoare,
    sporuriExceptate,
    salariuBrut: Math.round(salariuBrut),
    cas,
    cass,
    deductibil,
    impozit,
    salariuNet: Math.round(salariuNet),
    plafon20,
    sporuriDepasescPlafon: sporuriDepasesc,
  };
}

// Gradații vechime conform ART. 13 din proiect
export interface GradatieInfo {
  nivel: number;
  numeRange: string;
  cota: number;
}
export const GRADATII: GradatieInfo[] = [
  { nivel: 0, numeRange: "până la 3 ani", cota: 0 },
  { nivel: 1, numeRange: "3 – 5 ani", cota: 7.5 },
  { nivel: 2, numeRange: "5 – 10 ani", cota: 5 },
  { nivel: 3, numeRange: "10 – 15 ani", cota: 5 },
  { nivel: 4, numeRange: "15 – 20 ani", cota: 2.5 },
  { nivel: 5, numeRange: "peste 20 ani", cota: 2.5 },
];

/** Calculează salariul după aplicarea succesivă a gradațiilor 0..N pe coef * val_ref */
export function aplicaGradatie(salariuBazaG0: number, gradatie: number): number {
  let s = salariuBazaG0;
  for (let g = 1; g <= gradatie; g++) {
    s = s * (1 + GRADATII[g].cota / 100);
  }
  return s;
}

export function gradatieDinVechime(aniVechime: number): number {
  if (aniVechime < 3) return 0;
  if (aniVechime < 5) return 1;
  if (aniVechime < 10) return 2;
  if (aniVechime < 15) return 3;
  if (aniVechime < 20) return 4;
  return 5;
}

// Sporuri standard din lege (cap. IV)
export const SPORURI_STANDARD: Spor[] = [
  {
    id: "control-fin",
    nume: "Control financiar preventiv (10%)",
    tip: "procent",
    valoare: 10,
    inclusInPlafon20: true,
    descriere: "Art. 14 — personal care exercită CFP.",
  },
  {
    id: "fonduri-eu",
    nume: "Proiecte fonduri europene (până la 40%)",
    tip: "procent",
    valoare: 40,
    inclusInPlafon20: false,
    descriere:
      "Art. 15/16 — personal nominalizat în echipe de proiecte UE. Exceptat de la plafonul 20% (în limita cofinanțării din fonduri externe).",
  },
  {
    id: "noapte",
    nume: "Muncă de noapte (25%)",
    tip: "procent",
    valoare: 25,
    inclusInPlafon20: false,
    descriere: "Art. 17 — orele lucrate între 22:00–06:00, exceptat de la plafon.",
  },
  {
    id: "ore-supl-75",
    nume: "Muncă suplimentară zile lucrătoare (75%)",
    tip: "procent",
    valoare: 75,
    inclusInPlafon20: false,
    descriere: "Art. 18 — ore suplimentare necompensate cu liber în 60 zile.",
  },
  {
    id: "ore-supl-100",
    nume: "Muncă în weekend / sărbători legale (100%)",
    tip: "procent",
    valoare: 100,
    inclusInPlafon20: false,
    descriere: "Art. 18(3) — ore lucrate în repaus săptămânal / sărbători legale.",
  },
  {
    id: "handicap",
    nume: "Persoane cu handicap grav/accentuat (15% din val. referință)",
    tip: "valoare",
    valoare: 15,
    inclusInPlafon20: false,
    descriere: "Art. 19 — 15% din valoarea de referință.",
  },
  {
    id: "conditii",
    nume: "Spor pentru condiții de muncă (până la 25%)",
    tip: "procent",
    valoare: 15,
    inclusInPlafon20: true,
    descriere:
      "Art. 20 — mărime stabilită prin regulament-cadru pe domeniu. Procent editabil.",
  },
];

/**
 * Valoarea de referință pentru anul 2027 — stabilită prin art. 47 alin. (2)
 * din dispozițiile finale ale proiectului de lege MMFTSS (25 mai 2026).
 * Începând cu 2028 se stabilește anual prin HG (art. 9 alin. 3).
 */
export const VALOARE_REFERINTA_DEFAULT = 4100;
