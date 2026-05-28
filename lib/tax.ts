// Calcul brut → net conform proiectului de lege MMFTSS (25 mai 2026)
// intrat în vigoare 1 ianuarie 2027. Acoperă regulile fiscale RO valabile
// la momentul redactării. Rezultatele sunt estimări orientative.

export const SAL_MIN_BRUT_2026 = 4050; // salariul minim brut pe țară 2026 (RO)

export function clampNumber(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export type SporType = "procent" | "valoare" | "lei";

export interface Spor {
  id: string;
  nume: string;
  tip: SporType;
  // pentru tip="procent": procent din salariul de bază
  // pentru tip="valoare": procent din valoarea de referință
  // pentru tip="lei": sumă fixă lunară în lei (ex: indemnizație de permanență 300/500/800/1000)
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
    } else if (spor.tip === "valoare") {
      lei = (input.valoareReferinta * spor.valoare) / 100;
    } else {
      // tip === "lei" — sumă fixă lunară (cu override prin procentCustom = valoare în lei)
      lei = procentCustom ?? spor.valoare;
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
  {
    id: "gestionare-fonduri-externe",
    nume: "Gestionare fonduri externe (până la 40%)",
    tip: "procent",
    valoare: 40,
    inclusInPlafon20: false,
    descriere:
      "Art. 16 — personal Lg.490/2004 și organisme intermediare. Exceptat de plafon (alin. 5).",
  },

  // === Anexa II — Sănătate ===
  {
    id: "tura-sanatate",
    nume: "Spor pentru activitate în 3 ture (10%)",
    tip: "procent",
    valoare: 10,
    inclusInPlafon20: false,
    descriere: "Anexa II art. 1 — personalul medical în program de 3 ture (sau 2 ture 12-24h). Exceptat de plafonul de 20% conform art. 1 alin. (2).",
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
    nume: "Surse de radiații Sănătate (până la 10%)",
    tip: "procent",
    valoare: 5,
    inclusInPlafon20: true,
    descriere:
      "Anexa II art. 7(1) lit. e) — personal medical/auxiliar expus radiațiilor ionizante. Diferențiat pe categorii de risc radiologic: 2,5% (cat. I), 5% (cat. II), 7,5% (cat. III), 10% (cat. IV).",
    aplicabilAnexe: ["II"],
  },
  {
    id: "garzi-medic",
    nume: "Gardă suplimentară (contract separat, estimare)",
    tip: "procent",
    valoare: 25,
    inclusInPlafon20: false,
    descriere:
      "Anexa II art. 3-5 — gărzile obligatorii (pentru completarea normei) se plătesc cu tariful orar al salariului de bază, NU au procent fix. Gărzile peste norma legală se prestează prin contract separat. Acest spor e o ESTIMARE orientativă pentru cei cu gărzi multiple — verifică fluturașul pentru valoarea exactă. Variază pe specialitate.",
    aplicabilAnexe: ["II"],
  },
  {
    id: "indemnizatie-permanenta-sanatate",
    nume: "Indemnizație de permanență (sumă fixă lunară)",
    tip: "lei",
    valoare: 500,
    inclusInPlafon20: false,
    descriere:
      "Sumă fixă lunară pentru personalul medical care asigură permanență/continuitate în unitate. " +
      "Valori uzuale: 300, 500, 800 sau 1000 lei (în funcție de poziție și regulamentul unității). Editează cuantumul după caz.",
    aplicabilAnexe: ["II"],
  },
  {
    id: "garda-domiciliu-sanatate",
    nume: "Gardă la domiciliu (15% tarif orar)",
    tip: "procent",
    valoare: 15,
    inclusInPlafon20: true,
    descriere:
      "Anexa II art. 3(4) — 15% din tariful orar pentru orele de gardă la domiciliu / asistență de urgență.",
    aplicabilAnexe: ["II"],
  },
  {
    id: "neonatologie-laborator-sanatate",
    nume: "Condiții periculoase neonatologie/laboratoare (până la 15%)",
    tip: "procent",
    valoare: 15,
    inclusInPlafon20: true,
    descriere:
      "Anexa II art. 7(1) lit.a) — neonatologie, săli naștere, laboratoare analize. Max 15% sal. bază.",
    aplicabilAnexe: ["II"],
  },
  {
    id: "periculoase-nivel-1-sanatate",
    nume: "Condiții deosebit periculoase nivel I (până la 40%)",
    tip: "procent",
    valoare: 40,
    inclusInPlafon20: true,
    descriere:
      "Anexa II art. 7(1) lit.b) — dializă, oncologie, ATI, paliative, chirurgie cardio, psihiatrie. Max 40%.",
    aplicabilAnexe: ["II"],
  },
  {
    id: "tesa-leprozerii-sanatate",
    nume: "Personal TESA în leprozerii/TBC/psihiatrie (până la 20%)",
    tip: "procent",
    valoare: 20,
    inclusInPlafon20: true,
    descriere:
      "Anexa II art. 7(1) lit.b) — personal nemedical/TESA din leprozerii, TBC, psihiatrie. Max 20%.",
    aplicabilAnexe: ["II"],
  },
  {
    id: "periculoase-nivel-2-sanatate",
    nume: "Condiții deosebit periculoase nivel II (până la 50%)",
    tip: "procent",
    valoare: 50,
    inclusInPlafon20: true,
    descriere:
      "Anexa II art. 7(1) lit.c) — anatomie patologică, SIDA, TBC, UPU/SMURD, ATI, transplant, arși. Max 50%.",
    aplicabilAnexe: ["II"],
  },
  {
    id: "conditii-grele-sanatate",
    nume: "Condiții grele de muncă sănătate (5%)",
    tip: "procent",
    valoare: 5,
    inclusInPlafon20: true,
    descriere:
      "Anexa II art. 7(1) lit.d) — spor fix 5% din salariul de bază, proporțional cu timpul lucrat.",
    aplicabilAnexe: ["II"],
  },
  {
    id: "izolare-sanatate",
    nume: "Localități izolate / altitudine (până la 15%)",
    tip: "procent",
    valoare: 15,
    inclusInPlafon20: false,
    descriere:
      "Anexa II art. 7(3) — localități izolate, altitudine, atragere dificilă. Exceptat de plafon (alin.4).",
    aplicabilAnexe: ["II"],
  },
  {
    id: "periculoase-asistenta-sociala",
    nume: "Condiții deosebit periculoase asistență socială (până la 40%)",
    tip: "procent",
    valoare: 40,
    inclusInPlafon20: true,
    descriere:
      "Anexa II art. 14(1) lit.a) — centre recuperare neuropsihiatrică, TBC, SIDA. Max 40% sal. bază.",
    aplicabilAnexe: ["II"],
  },
  {
    id: "al-doilea-copil-plasament",
    nume: "Al II-lea copil în plasament (până la 10%)",
    tip: "procent",
    valoare: 10,
    inclusInPlafon20: true,
    descriere:
      "Anexa II art. 14(1) lit.d) — asistenți maternali profesioniști, pentru al doilea copil. Max 10%.",
    aplicabilAnexe: ["II"],
  },
  {
    id: "continuitate-maternali",
    nume: "Continuitate asistenți maternali (până la 5%)",
    tip: "procent",
    valoare: 5,
    inclusInPlafon20: true,
    descriere:
      "Anexa II art. 14(1) lit.e) — asigurarea continuității în muncă pentru asistenții maternali.",
    aplicabilAnexe: ["II"],
  },

  // === Anexa III — Cultură ===
  {
    id: "conditii-grele-cultura",
    nume: "Condiții grele de muncă cultură (până la 5%)",
    tip: "procent",
    valoare: 5,
    inclusInPlafon20: true,
    descriere:
      "Anexa III art. 1 — max 5% din salariul de bază, proporțional cu timpul lucrat la locurile respective.",
    aplicabilAnexe: ["III"],
  },

  // === Anexa V — Justiție ===
  {
    id: "delegare-penitenciar-justitie",
    nume: "Delegare/detașare administrația penitenciară (10%)",
    tip: "procent",
    valoare: 10,
    inclusInPlafon20: true,
    descriere:
      "Anexa V art. 11 — majorare 10% indemnizație / salariu de bază pe durata delegării în penitenciar.",
    aplicabilAnexe: ["V"],
  },
  {
    id: "membru-csm-ales",
    nume: "Indemnizație membru CSM ales (25%)",
    tip: "procent",
    valoare: 25,
    inclusInPlafon20: true,
    descriere:
      "Anexa V art. 10(3) — 25% din indemnizația brută lunară maximă a judecătorului ÎCCJ, membri CSM aleși.",
    aplicabilAnexe: ["V"],
  },
  {
    id: "membru-csm-drept",
    nume: "Indemnizație membru CSM de drept (50%)",
    tip: "procent",
    valoare: 50,
    inclusInPlafon20: true,
    descriere:
      "Anexa V art. 10(4) — 50% din indemnizația brută lunară maximă a judecătorului ÎCCJ, membri de drept.",
    aplicabilAnexe: ["V"],
  },
  {
    id: "auxiliar-tribunal-justitie",
    nume: "Majorare auxiliar tribunal/judecătorii Buc. (5%)",
    tip: "procent",
    valoare: 5,
    inclusInPlafon20: true,
    descriere:
      "Anexa V art. 15(3) — salarii majorate cu 5% pentru auxiliar la tribunale, jud. Bucureștii, reședință de județ.",
    aplicabilAnexe: ["V"],
  },
  {
    id: "auxiliar-curte-apel-justitie",
    nume: "Majorare auxiliar curți de apel (7.5%)",
    tip: "procent",
    valoare: 7.5,
    inclusInPlafon20: true,
    descriere:
      "Anexa V art. 15(4) — salarii majorate cu 7.5% pentru personal auxiliar curți de apel și parchete aferente.",
    aplicabilAnexe: ["V"],
  },
  {
    id: "auxiliar-iccj-justitie",
    nume: "Majorare auxiliar ÎCCJ/DNA/DIICOT (10%)",
    tip: "procent",
    valoare: 10,
    inclusInPlafon20: true,
    descriere:
      "Anexa V art. 15(5) — salarii majorate cu 10% pentru auxiliar ÎCCJ, Parchet ÎCCJ, DNA, DIICOT.",
    aplicabilAnexe: ["V"],
  },
  {
    id: "criminalistica-inec",
    nume: "Personal criminalistică INEC (2%)",
    tip: "procent",
    valoare: 2,
    inclusInPlafon20: true,
    descriere:
      "Anexa V art. 19(4) — indemnizații lunare mai mari cu 2% pentru personal criminalistică INEC.",
    aplicabilAnexe: ["V"],
  },

  // === Anexa VI — Apărare, ordine publică, siguranță națională ===
  {
    id: "conditii-periculoase-aparare",
    nume: "Condiții periculoase / grele apărare (până la 15% val. ref.)",
    tip: "valoare",
    valoare: 15,
    inclusInPlafon20: true,
    descriere:
      "Anexa VI art. 7 alin. (2) — până la 15% din valoarea de referință. INTRĂ în plafonul 20% (art. 7 alin. 11 exceptă doar muniții/explozivi alin.1 și izolarea alin.5). Editează procentul după caz.",
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
    nume: "Compensație lunară de risc misiuni externe (val. ref.)",
    tip: "valoare",
    valoare: 100,
    inclusInPlafon20: false,
    descriere:
      "Anexa VI art. 37-38 — compensație lunară de risc, până la 100% din valoarea de referință (editabil 0–100%).",
    aplicabilAnexe: ["VI"],
  },
  {
    id: "munitii-explozivi-aparare",
    nume: "Activități cu muniții/explozivi/calamități (până la 50% val. ref.)",
    tip: "valoare",
    valoare: 50,
    inclusInPlafon20: false,
    descriere:
      "Anexa VI art. 7(1) — primă până la 50% din valoarea de referință pentru muniții, explozivi, calamități. Exceptat.",
    aplicabilAnexe: ["VI"],
  },
  {
    id: "clasificare-aviatie",
    nume: "Primă clasificare aviație (8–30%)",
    tip: "procent",
    valoare: 8,
    inclusInPlafon20: true,
    descriere:
      "Anexa VI art. 10 — 8-30% din solda de funcție pentru personal navigant și parașutiști militari. Editabil.",
    aplicabilAnexe: ["VI"],
  },
  {
    id: "clasificare-aeronautic-nenav",
    nume: "Clasificare aeronautic nenavigant (5–19%)",
    tip: "procent",
    valoare: 5,
    inclusInPlafon20: true,
    descriere:
      "Anexa VI art. 15 — 5-19% din soldă funcție, personal aeronautic nenavigant. Editabil.",
    aplicabilAnexe: ["VI"],
  },
  {
    id: "specializare-aviatie",
    nume: "Specializare ofițeri ingineri aviație (8–22%)",
    tip: "procent",
    valoare: 8,
    inclusInPlafon20: true,
    descriere:
      "Anexa VI art. 16 — 8-22% soldă funcție, ofițeri ingineri/subingineri aviație, transmisiuni aeronautice.",
    aplicabilAnexe: ["VI"],
  },
  {
    id: "ambarcare-marina-baza",
    nume: "Ambarcare nave în bază (15%)",
    tip: "procent",
    valoare: 15,
    inclusInPlafon20: true,
    descriere:
      "Anexa VI art. 21(1) lit.a) — 15% din solda funcție/salariu bază, personal ambarcat în baza permanentă.",
    aplicabilAnexe: ["VI"],
  },
  {
    id: "ambarcare-marina-deplasare",
    nume: "Ambarcare nave în misiuni (+15% suplim.)",
    tip: "procent",
    valoare: 15,
    inclusInPlafon20: true,
    descriere:
      "Anexa VI art. 21(1) lit.b) — +15% suplimentar pe perioada deplasării pentru instrucții/misiuni.",
    aplicabilAnexe: ["VI"],
  },
  {
    id: "clasificare-scafandri",
    nume: "Primă clasificare scafandri (5–30%)",
    tip: "procent",
    valoare: 5,
    inclusInPlafon20: true,
    descriere:
      "Anexa VI art. 24(1) — 5-30% soldă funcție/salariu bază pentru scafandri brevetați. Editabil.",
    aplicabilAnexe: ["VI"],
  },
  {
    id: "control-nave-lupta",
    nume: "Control nave în misiuni de luptă (30%)",
    tip: "procent",
    valoare: 30,
    inclusInPlafon20: true,
    descriere:
      "Anexa VI art. 29 — 30% soldă funcție pentru personal echipe specializate control nave misiuni luptă.",
    aplicabilAnexe: ["VI"],
  },
  {
    id: "ambarcare-submarine",
    nume: "Ambarcare submarine (30%)",
    tip: "procent",
    valoare: 30,
    inclusInPlafon20: true,
    descriere:
      "Anexa VI art. 30 — 30% soldă funcție/salariu bază pentru personal militar/civil pe submarine.",
    aplicabilAnexe: ["VI"],
  },
  {
    id: "compensatie-civil-aparare",
    nume: "Compensație personal civil apărare (1/3 val. ref.)",
    tip: "valoare",
    valoare: 33,
    inclusInPlafon20: true,
    descriere:
      "Anexa VI — compensație lunară personal civil ~1/3 din valoarea de referință.",
    aplicabilAnexe: ["VI"],
  },
  {
    id: "indemnizatie-mutare-aparare",
    nume: "Indemnizație de mutare (val. ref., one-off)",
    tip: "valoare",
    valoare: 100,
    inclusInPlafon20: false,
    descriere:
      "Anexa VI — indemnizație egală cu valoarea de referință la mutare/transfer cu schimbarea domiciliului. " +
      "Plătită o singură dată; bifează doar luna în care primești efectiv suma.",
    aplicabilAnexe: ["VI"],
  },
  {
    id: "indemnizatie-instalare-aparare",
    nume: "Indemnizație de instalare (val. ref., one-off)",
    tip: "valoare",
    valoare: 100,
    inclusInPlafon20: false,
    descriere:
      "Anexa VI — indemnizație egală cu valoarea de referință la prima încadrare/instalare. Plătită o singură dată.",
    aplicabilAnexe: ["VI"],
  },
  {
    id: "indemnizatie-campanie-aparare",
    nume: "Indemnizație de campanie (val. ref., one-off)",
    tip: "valoare",
    valoare: 100,
    inclusInPlafon20: false,
    descriere:
      "Anexa VI — indemnizație egală cu valoarea de referință pentru participare la misiuni/operații. Plătită o singură dată la începutul misiunii.",
    aplicabilAnexe: ["VI"],
  },

  // === Anexa I — Învățământ ===
  {
    id: "izolare-invatamant",
    nume: "Spor de izolare personal didactic (până la 15%)",
    tip: "procent",
    valoare: 15,
    inclusInPlafon20: false,
    descriere:
      "Anexa I art. 3 — personal didactic calificat de predare/conducere în localități izolate. Până la 15% sal. bază, diferențiat pe zone (HG). Exceptat de plafonul 20%.",
    aplicabilAnexe: ["I"],
  },
  {
    id: "invatamant-special",
    nume: "Învățământ special / special integrat (până la 15%)",
    tip: "procent",
    valoare: 15,
    inclusInPlafon20: true,
    descriere:
      "Anexa I art. 4 — personal didactic din învățământul special/special integrat (cu excepția centrelor de resurse). Până la 15% sal. bază.",
    aplicabilAnexe: ["I"],
  },
  {
    id: "practica-pedagogica",
    nume: "Practică pedagogică (5–15%)",
    tip: "procent",
    valoare: 10,
    inclusInPlafon20: true,
    descriere:
      "Anexa I art. 5 — personal didactic desemnat să conducă practica pedagogică pentru viitori educatori/învățători/profesori. 5-15% sal. bază, în raport cu timpul efectiv și numărul elevilor/studenților.",
    aplicabilAnexe: ["I"],
  },
  {
    id: "predare-simultana",
    nume: "Predare simultană 2–5 clase (5–15%)",
    tip: "procent",
    valoare: 5,
    inclusInPlafon20: true,
    descriere:
      "Anexa I art. 6 — învățământ primar/gimnazial cu predare simultană: 5% (2 clase), 7% (3 clase), 10% (4 clase), 15% (5 clase). Editează procentul după caz.",
    aplicabilAnexe: ["I"],
  },
  {
    id: "salarii-diferentiate-univ",
    nume: "Salarii diferențiate învățământ superior (până la 20%)",
    tip: "procent",
    valoare: 20,
    inclusInPlafon20: true,
    descriere:
      "Anexa I art. 7 — personal didactic și administrativ din universități. Până la 20% sal. bază, stabilit de consiliul de administrație. Plătit din venituri proprii.",
    aplicabilAnexe: ["I"],
  },
  {
    id: "conducator-doctorat",
    nume: "Conducător de doctorat (1%/doctorand, max 10%)",
    tip: "procent",
    valoare: 5,
    inclusInPlafon20: true,
    descriere:
      "Anexa I art. 8 — personal didactic din învățământul superior, 1% sal. bază pentru fiecare student-doctorand, dar nu mai mult de 10% total. Editează procentul după numărul de doctoranzi.",
    aplicabilAnexe: ["I"],
  },

  // === Anexa VII — Cercetare / instituții finanțate integral din venituri proprii ===
  {
    id: "conditii-grele-vp",
    nume: "Condiții grele de muncă (5%)",
    tip: "procent",
    valoare: 5,
    inclusInPlafon20: true,
    descriere:
      "Anexa VII art. 6(1) lit. a) — spor 5% sal. bază pentru personal din instituții finanțate din venituri proprii, proporțional cu timpul lucrat la locurile respective.",
    aplicabilAnexe: ["VII"],
  },
  {
    id: "izolare-vp",
    nume: "Zone izolate / atragere dificilă (până la 15%)",
    tip: "procent",
    valoare: 15,
    inclusInPlafon20: false,
    descriere:
      "Anexa VII art. 6(1) lit. b) — personal în zone izolate sau unde atragerea se face cu greutate. Până la 15% sal. bază. Exceptat de plafon (art. 6 alin. 2).",
    aplicabilAnexe: ["VII"],
  },
  {
    id: "consemn-domiciliu-vp",
    nume: "Consemn la domiciliu (până la 15%)",
    tip: "procent",
    valoare: 15,
    inclusInPlafon20: true,
    descriere:
      "Anexa VII art. 6(1) lit. c) — până la 15% sal. bază pentru orele de consemn la domiciliu.",
    aplicabilAnexe: ["VII"],
  },
  {
    id: "siguranta-transport-vp",
    nume: "Siguranță navigație / feroviară / rutieră / aeronautică (până la 20%)",
    tip: "procent",
    valoare: 20,
    inclusInPlafon20: true,
    descriere:
      "Anexa VII art. 6(1) lit. d) — personal cu atribuții pentru siguranța transportului (naval, feroviar, rutier, aeronautic). Până la 20% sal. bază.",
    aplicabilAnexe: ["VII"],
  },

  // === Anexa VIII — Administrație (funcționari publici + personal contractual) ===
  {
    id: "izolare-delta-adm",
    nume: "Spor izolare Delta Dunării / rezervație (până la 15%)",
    tip: "procent",
    valoare: 15,
    inclusInPlafon20: false,
    descriere:
      "Anexa VIII Cap. I lit. B art. 7 (și Cap. II lit. J/K corespondent) — funcționari publici și personal contractual din localitățile Rezervației Biosferei Delta Dunării sau din Administrația/comisariatul rezervației. Până la 15% sal. bază, proporțional cu timpul lucrat. Exceptat de plafon.",
    aplicabilAnexe: ["VIII"],
  },
  {
    id: "radiatii-vama",
    nume: "Surse de radiații Autoritatea Vamală (până la 10%)",
    tip: "procent",
    valoare: 5,
    inclusInPlafon20: true,
    descriere:
      "Anexa VIII Cap. I lit. B art. 8 — funcționari publici din Autoritatea Vamală Română expuși radiațiilor. Diferențiat: 2,5% (cat. I), 5% (cat. II), 7,5% (cat. III), 10% (cat. IV).",
    aplicabilAnexe: ["VIII"],
  },
  {
    id: "conditii-grele-contractual-adm",
    nume: "Condiții grele personal contractual (5%)",
    tip: "procent",
    valoare: 5,
    inclusInPlafon20: true,
    descriere:
      "Anexa VIII Cap. II lit. J — personal contractual administrație: 5% sal. bază, proporțional cu timpul lucrat la locurile respective.",
    aplicabilAnexe: ["VIII"],
  },
  {
    id: "izolare-contractual-adm",
    nume: "Zone izolate personal contractual (până la 15%)",
    tip: "procent",
    valoare: 15,
    inclusInPlafon20: true,
    descriere:
      "Anexa VIII Cap. II lit. J — personal contractual administrație, în zone izolate sau unde atragerea se face cu greutate. Până la 15% sal. bază.",
    aplicabilAnexe: ["VIII"],
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
