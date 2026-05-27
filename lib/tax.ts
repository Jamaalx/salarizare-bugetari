// Calcul brut → net conform proiectului de lege MMFTSS (25 mai 2026)
// intrat în vigoare 1 ianuarie 2027. Acoperă regulile fiscale RO valabile
// la momentul redactării. Rezultatele sunt estimări orientative.

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
  // pentru tip="procent": procent din salariul de bază
  // pentru tip="valoare": procent din valoarea de referință
  valoare: number;
  inclusInPlafon20: boolean;
  descriere?: string;
  // Dacă e nedefinit, sporul e aplicabil pe toate anexele.
  // Altfel, doar pe anexele listate (ex: ["VI"] = doar apărare/ordine publică).
  aplicabilAnexe?: string[];
}

export interface TaxInput {
  salariuBaza: number; // salariul de bază (după gradație), lei
  sporuri: { spor: Spor; activ: boolean; procentCustom?: number }[];
  valoareReferinta: number;
  // Persoane scutite de impozitul pe veniturile din salarii — art. 60 Cod fiscal:
  // - persoane cu handicap grav sau accentuat (pct. 1 lit. b)
  // - personal cercetare-dezvoltare (pct. 3)
  // - programatori IT (pct. 2)
  scutireImpozit?: boolean;
  // Persoane în întreținere pentru calculul deducerii personale (Cod fiscal).
  persoaneInIntretinere?: number;
  // Pentru funcțiile de conducere din Anexa V (justiție), un coeficient
  // suplimentar din valoarea de referință se adaugă la salariul de bază.
  // Ex: președinte ICCJ +0.5 × val. ref.
  coefSuplimentConducere?: number;
}

export interface TaxBreakdown {
  salariuBaza: number;
  sporuriProcent: number; // în lei, sporuri procentuale care intră în plafon (NU mai sunt capate)
  sporuriValoare: number; // în lei, sporuri valorice
  sporuriExceptate: number; // în lei, sporuri în afara plafonului
  salariuBrut: number;

  cas: number; // 25%
  cass: number; // 10%
  deductibil: number; // deducere personală
  impozit: number;
  salariuNet: number;

  plafon20: number; // 20% din salariul de bază — limită orientativă pentru sporurile în plafon
  sporuriDepasescPlafon: boolean; // true dacă suma sporurilor „în plafon" > 20% (avertisment, NU cap)
}

/**
 * Deducerea personală 2027 — pe baza Codului fiscal (OUG 16/2022, neabrogată de
 * proiectul MMFTSS). Aplicabilă pentru salarii brute până la 2.000 lei peste
 * salariul minim brut pe țară. Mecanismul exact e o tabelă degresivă; aici
 * folosim o simplificare orientativă:
 *   - deducere bază: 510 lei pentru fără persoane în întreținere
 *   - +160 lei per persoană în întreținere, până la 4 persoane
 *   - se elimină gradat când brut > 2.000 + sal.min.
 *
 * Acoperă cazul tipic (salarii mici cu copii) fără a încerca să replice exact
 * formula complexă din Codul fiscal — pentru sume oficiale, fluturașul.
 */
export function calculDeducere(
  salariuBrut: number,
  persoaneInIntretinere: number,
  salariuMinim: number = SAL_MIN_BRUT_2026,
): number {
  if (salariuBrut <= 0) return 0;
  if (salariuBrut > salariuMinim + 2000) return 0;
  const baza = 510;
  const perPersoana = 160;
  const p = clampNumber(persoaneInIntretinere, 0, 4);
  // degresiv pe paliere de 100 lei peste minim
  const overMin = Math.max(0, salariuBrut - salariuMinim);
  const palier = Math.floor(overMin / 100); // 0..20
  const factor = Math.max(0, 1 - palier / 20);
  return Math.round((baza + perPersoana * p) * factor);
}

export function calcBrut(input: TaxInput): TaxBreakdown {
  const sb = input.salariuBaza + (input.coefSuplimentConducere ?? 0) * input.valoareReferinta;
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
      lei = (input.valoareReferinta * spor.valoare) / 100;
    }
    if (spor.inclusInPlafon20) sporuriProcent += lei;
    else sporuriExceptate += lei;
  }

  // Plafonul de 20% conform art. 21 alin. (2) se aplică AGREGAT pe ordonatorul
  // principal de credite (instituție), NU per persoană. La nivel individual nu
  // cap-uim suma sporurilor — doar marcăm dacă depășește media de 20% (avertisment).
  const plafon20 = sb * 0.2;
  const sporuriDepasesc = sporuriProcent > plafon20;

  const salariuBrut = sb + sporuriProcent + sporuriExceptate + sporuriValoare;

  // CAS 25%, CASS 10%
  const cas = Math.round(salariuBrut * 0.25);
  const cass = Math.round(salariuBrut * 0.1);
  const venitImpozabil = salariuBrut - cas - cass;

  const deductibil = calculDeducere(salariuBrut, input.persoaneInIntretinere ?? 0);

  const impozitCalculat = Math.round(Math.max(0, venitImpozabil - deductibil) * 0.1);
  const impozit = input.scutireImpozit ? 0 : impozitCalculat;
  const salariuNet = venitImpozabil - impozit;

  return {
    salariuBaza: sb,
    sporuriProcent,
    sporuriValoare,
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

// Gradații vechime conform ART. 13 din proiect (regim standard)
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

// Gradații Anexa VI (Apărare, ordine publică, siguranță națională) — Art. 4 alin. (3)
// din Anexa VI „Reglementări speciale" (proiect MMFTSS 25 mai 2026).
// Intervale de 3 ani, majorare uniformă +3% per gradație. 8 nivele (G0..G7).
export const GRADATII_APARARE: GradatieInfo[] = [
  { nivel: 0, numeRange: "până la 3 ani", cota: 0 },
  { nivel: 1, numeRange: "3 – 6 ani", cota: 3 },
  { nivel: 2, numeRange: "6 – 9 ani", cota: 3 },
  { nivel: 3, numeRange: "9 – 12 ani", cota: 3 },
  { nivel: 4, numeRange: "12 – 15 ani", cota: 3 },
  { nivel: 5, numeRange: "15 – 18 ani", cota: 3 },
  { nivel: 6, numeRange: "18 – 21 ani", cota: 3 },
  { nivel: 7, numeRange: "peste 21 ani", cota: 3 },
];

/** Tabelul de gradații aplicabil în funcție de anexa ocupațională. */
export function gradatiiForAnexa(anexa: string): GradatieInfo[] {
  return anexa === "VI" ? GRADATII_APARARE : GRADATII;
}

/**
 * Calculează salariul după aplicarea succesivă a gradațiilor 0..N pe coef × val_ref.
 * Rotunjire ÎN FAVOAREA SALARIATULUI conform Art. 7 lit. (i) — Math.ceil.
 */
export function aplicaGradatie(
  salariuBazaG0: number,
  gradatie: number,
  tabel: GradatieInfo[] = GRADATII,
): number {
  let s = salariuBazaG0;
  for (let g = 1; g <= gradatie && g < tabel.length; g++) {
    s = s * (1 + tabel[g].cota / 100);
  }
  return Math.ceil(s);
}

export function gradatieDinVechime(
  aniVechime: number,
  tabel: GradatieInfo[] = GRADATII,
): number {
  if (tabel === GRADATII_APARARE) {
    if (aniVechime < 3) return 0;
    if (aniVechime < 6) return 1;
    if (aniVechime < 9) return 2;
    if (aniVechime < 12) return 3;
    if (aniVechime < 15) return 4;
    if (aniVechime < 18) return 5;
    if (aniVechime < 21) return 6;
    return 7;
  }
  if (aniVechime < 3) return 0;
  if (aniVechime < 5) return 1;
  if (aniVechime < 10) return 2;
  if (aniVechime < 15) return 3;
  if (aniVechime < 20) return 4;
  return 5;
}

// Sporuri standard din lege (Cap. IV proiect MMFTSS + reglementări specifice pe anexe)
// Câmpul `aplicabilAnexe` lipsă = aplicabil oriunde; setat = doar pe anexele listate.
export const SPORURI_STANDARD: Spor[] = [
  // === Cap. IV proiect (aplicabile general) ===
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
    // Anexa II Sănătate are regim diferit (10% în ture — vezi `tura-sanatate`).
    aplicabilAnexe: ["I", "III", "IV", "V", "VI", "VII", "VIII", "IX"],
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
    // Pentru Anexa II Sănătate, art. 2 prevede doar +10% pe ora lucrată în
    // weekend/sărbători, nu +100% — vezi sporul `weekend-sanatate` mai jos.
    aplicabilAnexe: ["I", "III", "IV", "V", "VI", "VII", "VIII", "IX"],
  },
  {
    id: "handicap",
    nume: "Persoane cu handicap grav/accentuat (15% din val. referință)",
    tip: "valoare",
    valoare: 15,
    inclusInPlafon20: false,
    descriere:
      "Art. 19 alin. (1) proiect MMFTSS — citat: „spor de 15% din valoarea de referință\". " +
      "Cuantum FIX (15% × 4100 = 615 lei pentru 2027), NU procent din salariul de bază. " +
      "Atenție: Legea 153/2017 (vechi) avea 15% din salariul de bază — proiectul nou a redus acest spor pentru funcțiile mari. " +
      "Conform art. 19 alin. (2), nu intră în plafonul de 20%.",
  },
  {
    id: "conditii",
    nume: "Spor pentru condiții de muncă",
    tip: "procent",
    valoare: 15,
    inclusInPlafon20: true,
    descriere:
      "Art. 20 — procent stabilit prin regulament-cadru pe domeniu (variază între 5% și 40% în funcție de anexă). Editează procentul după caz.",
  },
  {
    id: "doctorat",
    nume: "Spor de doctorat (15%)",
    tip: "procent",
    valoare: 15,
    inclusInPlafon20: true,
    descriere:
      "Pentru personalul cu titlul științific de doctor obținut în domeniul postului ocupat. Inclus în plafonul de 20%.",
  },
  {
    id: "premiu-performanta",
    nume: "Premiu de performanță (10–20%)",
    tip: "procent",
    valoare: 10,
    inclusInPlafon20: false,
    descriere:
      "Art. 22 — premiu acordat pentru performanță deosebită, exceptat de la plafonul 20%.",
  },

  // === Anexa II — Sănătate ===
  {
    id: "tura-sanatate",
    nume: "Spor pentru activitate în 3 ture (10%)",
    tip: "procent",
    valoare: 10,
    inclusInPlafon20: true,
    descriere: "Anexa II art. 1 — pentru personalul medical în program de 3 ture.",
    aplicabilAnexe: ["II"],
  },
  {
    id: "weekend-sanatate",
    nume: "Tarif majorat weekend / sărbători (+10%)",
    tip: "procent",
    valoare: 10,
    inclusInPlafon20: true,
    descriere: "Anexa II art. 2 — în loc de +100% (regim general).",
    aplicabilAnexe: ["II"],
  },
  {
    id: "radiatii",
    nume: "Lucrul cu surse de radiații (până la 50%)",
    tip: "procent",
    valoare: 30,
    inclusInPlafon20: false,
    descriere:
      "Anexa II — personal expus radiațiilor ionizante (radiologie, medicină nucleară). Editează procentul după nivelul de expunere.",
    aplicabilAnexe: ["II"],
  },
  {
    id: "garzi-medic",
    nume: "Garde medici (tarif suplimentar)",
    tip: "procent",
    valoare: 25,
    inclusInPlafon20: false,
    descriere:
      "Anexa II art. 3-5 — tarif pe oră de gardă peste norma de bază. Estimare medie 25%, variază pe specialitate.",
    aplicabilAnexe: ["II"],
  },

  // === Anexa VI — Apărare, ordine publică, siguranță națională ===
  {
    id: "conditii-periculoase-aparare",
    nume: "Condiții periculoase / grele (15% val. ref.)",
    tip: "valoare",
    valoare: 15,
    inclusInPlafon20: false,
    descriere:
      "Anexa VI art. 8 alin. (1) — până la 15% din valoarea de referință. Editează procentul după caz.",
    aplicabilAnexe: ["VI"],
  },
  {
    id: "izolare-aparare",
    nume: "Spor de izolare (15% val. ref.)",
    tip: "valoare",
    valoare: 15,
    inclusInPlafon20: false,
    descriere:
      "Anexa VI art. 8 alin. (5) — pentru personal în zone izolate / detașat. Până la 15% din val. ref.",
    aplicabilAnexe: ["VI"],
  },
  {
    id: "risc-misiuni-aparare",
    nume: "Compensație lunară de risc (val. ref.)",
    tip: "valoare",
    valoare: 100,
    inclusInPlafon20: false,
    descriere:
      "Anexa VI art. 38 alin. (1) lit. b — pentru misiuni internaționale, până la nivelul valorii de referință (editabil 0–100%).",
    aplicabilAnexe: ["VI"],
  },
];

/** Filtrează sporurile aplicabile pe anexa selectată. */
export function sporuriPentruAnexa(anexa: string): Spor[] {
  if (!anexa) return SPORURI_STANDARD;
  return SPORURI_STANDARD.filter(
    (s) => !s.aplicabilAnexe || s.aplicabilAnexe.includes(anexa),
  );
}

/**
 * Valoarea de referință pentru anul 2027 — stabilită prin art. 35 alin. (2)
 * din dispozițiile finale ale proiectului de lege MMFTSS (25 mai 2026).
 * Începând cu 2028 se stabilește anual prin HG.
 */
export const VALOARE_REFERINTA_DEFAULT = 4100;
