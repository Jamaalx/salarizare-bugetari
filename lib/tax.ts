// Calcul brut → net conform proiectului de lege a salarizării (MMFTSS 2026).
// Formulele sunt identice în cele trei variante oficiale (25 mai, 17 iulie,
// 20 august 2026); ce diferă per variantă — valoarea de referință, grila
// soldelor de grad, coeficienții, etichetele — vine din lib/variants.ts și e
// transmis ca parametru. Acoperă regulile fiscale RO valabile la momentul
// redactării. Rezultatele sunt estimări orientative.

// Salariul de bază minim brut pe țară garantat în plată, în vigoare la data
// verificării (24.09.2026). Folosit pentru deducerea personală (art. 77 Cod
// fiscal) și pentru garanția de la art. 10 alin. (8) din proiect.
// sursa: HG nr. 146/2026 (M.Of. 13.03.2026) — 4.325 lei de la 1 iulie 2026
// (1 ian.–30 iun. 2026: 4.050 lei, HG nr. 1506/2024).
export const SAL_MIN_BRUT = 4325;
/** @deprecated nume istoric — valoarea urmează salariul minim în vigoare (SAL_MIN_BRUT). */
export const SAL_MIN_BRUT_2026 = SAL_MIN_BRUT;

// Reper orientativ pentru programul lunar de lucru (medie ~165 h/lună la normă
// întreagă). Folosit DOAR ca text ajutător — utilizatorul introduce numărul
// exact al lunii de pe fluturaș, nu se pre-completează niciun câmp.
export const ORE_NORMA_REPER = 165;

export function clampNumber(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export type SporType = "procent" | "valoare" | "lei";

// Mecanismul de calcul al sporului — determină ce date îi cere utilizatorului
// pentru acuratețe. Lipsă (undefined) = comportament standard:
//   procent → % din salariul de bază; valoare → % din val. ref.; lei → sumă fixă.
// - "orar":        tarif_orar × ore × procent% (noapte, ore supl., gărzi). Cere `ore`.
// - "selectie":    procentul e ales dintr-o listă de condiții (ex: categorie risc
//                  radiologic 2,5/5/7,5/10%). Folosește `optiuni`; valoarea aleasă
//                  ajunge în procentCustom.
// - "proportional": % din bază scalat cu fracțiunea de timp lucrat în condiții
//                  (art. „proporțional cu timpul efectiv lucrat"). Cere `fractieTimp`.
// - "oneOff":      sumă punctuală (mutare/instalare/campanie) — NU intră în
//                  salariul lunar recurent, se raportează separat.
// - "bazaProprie": procent dintr-o bază de referință diferită de salariul propriu
//                  (ex: indemnizația ÎCCJ pentru membri CSM). Cere `bazaCustom`.
export type SporInputKind =
  | "orar"
  | "selectie"
  | "proportional"
  | "oneOff"
  | "bazaProprie";

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
  // Grup de sporuri mutual exclusive (ex: "sanatate-conditii" = Anexa II
  // art. 7(1) lit. a-d nu se cumulează). Activarea unui spor dezactivează
  // celelalte din același grup în UI.
  groupExclusiv?: string;
  // Mecanismul de calcul (vezi SporInputKind). Lipsă = standard.
  inputKind?: SporInputKind;
  // Eticheta câmpului de ore pentru inputKind="orar" (ex: "ore de noapte / lună").
  unitateOre?: string;
  // Opțiunile pentru inputKind="selectie" — fiecare fixează procentul real.
  optiuni?: { label: string; valoare: number }[];
  // Eticheta bazei de referință pentru inputKind="bazaProprie".
  bazaLabel?: string;
}

export interface TaxInput {
  salariuBaza: number; // salariul de bază (după gradație), lei
  sporuri: {
    spor: Spor;
    activ: boolean;
    procentCustom?: number;
    // ore/lună pentru sporurile orare (inputKind="orar")
    ore?: number;
    // fracțiunea de timp lucrat în condiții, 0–100 (inputKind="proportional")
    fractieTimp?: number;
    // baza de referință în lei (inputKind="bazaProprie")
    bazaCustom?: number;
  }[];
  valoareReferinta: number;
  // Numărul de ore din programul lunar — numitorul tarifului orar pentru
  // sporurile orare. Fără valoare (0), sporurile orare nu pot fi calculate.
  oreNormaLunara?: number;
  // Persoane scutite de impozitul pe veniturile din salarii — art. 60 Cod fiscal:
  // - persoane cu handicap grav sau accentuat (pct. 1 lit. b)
  // - personal cercetare-dezvoltare (pct. 3)
  // - programatori IT (pct. 2)
  scutireImpozit?: boolean;
  // Persoane în întreținere pentru calculul deducerii personale (Cod fiscal).
  persoaneInIntretinere?: number;
  // Deducerea personală suplimentară — art. 77 alin. (10) Cod fiscal.
  sub26Ani?: boolean;
  copiiInvatamant?: number;
  // Pentru funcțiile de conducere din Anexa V (justiție), un coeficient
  // suplimentar din valoarea de referință se adaugă la salariul de bază.
  // Ex: președinte ICCJ +0.5 × val. ref.
  coefSuplimentConducere?: number;
  // Anexa VI (militari/poliție/penitenciare) — coeficientul soldei de grad /
  // salariului gradului profesional (cap. I.2). Solda lunară = soldă de funcție
  // (salariuBaza, cu gradații) + soldă de grad (coef × val. ref., FĂRĂ gradații).
  // Art. 2 alin. (2) + art. 6 alin. (4) + art. 4 alin. (3) din Anexa VI.
  soldaGradCoef?: number;
  // Art. 10 alin. (8) din proiect: dacă salariul de bază / solda de funcție
  // (normă de 8 ore) iese sub salariul minim brut pe țară, se plătește o sumă
  // egală cu salariul minim. Implicit SAL_MIN_BRUT; `false` dezactivează.
  salariuMinimGarantat?: number | false;
}

export interface TaxBreakdown {
  salariuBaza: number; // soldă de funcție + soldă de grad (pt. militari); altfel salariul de bază
  soldaGrad: number; // în lei, solda de grad / salariul gradului profesional (Anexa VI), 0 altfel
  // în lei, suma adăugată ca salariul de bază/solda de funcție să ajungă la
  // salariul minim brut pe țară (art. 10 alin. 8 din proiect); 0 altfel
  completareSalariuMinim: number;
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

  // Sume punctuale (one-off) — NU sunt incluse în salariuBrut lunar recurent.
  sumeOneOff: number;
  // true dacă un spor orar e activ dar nu s-a completat „ore normă/lună"
  // (numitorul tarifului orar) → sporul iese 0 și cifra e incompletă.
  oreNormaLipsa: boolean;
}

/**
 * Deducerea personală — art. 77 Cod fiscal (Legea 227/2015), forma
 * consolidată pe legislatie.just.ro la 08.08.2026 (articolul are forma dată de
 * OG 16/2022, în vigoare de la 01.01.2023; nemodificat ulterior).
 *
 * Deducerea personală de bază (alin. 3-4): procent din salariul minim brut pe
 * țară, pentru venit brut lunar de până la salariul minim + 2.000 lei:
 *   - brut ≤ salariul minim: 20% / 25% / 30% / 35% / 45%
 *     (fără / 1 / 2 / 3 / 4 și peste persoane în întreținere);
 *   - pe fiecare tranșă de 50 lei peste minim (min+1…min+50, min+51…min+100, …)
 *     procentul scade cu 0,5 puncte, până la tranșa min+1.951…min+2.000
 *     (0% / 5% / 10% / 15% / 25%);
 *   - brut > salariul minim + 2.000 lei: 0.
 * Deducerea personală suplimentară (alin. 10):
 *   a) 15% din salariul minim pentru tinerii de până la 26 de ani cu venit brut
 *      de până la salariul minim + 2.000 lei;
 *   b) 100 lei/lună pentru fiecare copil de până la 18 ani înscris într-o
 *      unitate de învățământ, indiferent de nivelul venitului.
 * Totalul se acordă în limita venitului impozabil lunar (alin. 2) — limitarea
 * se face în calcBrut. Legea nu prevede rotunjirea deducerii; o păstrăm la bani.
 */
// sursa: Legea 227/2015 (Codul fiscal), art. 77 alin. (4) — tabelul (forma din 08.08.2026)
const DEDUCERE_BAZA_PROCENT = [20, 25, 30, 35, 45];

export interface DeducereOptiuni {
  /** contribuabil cu vârsta de până la 26 de ani — art. 77 alin. (10) lit. a) */
  sub26Ani?: boolean;
  /** copii de până la 18 ani înscriși în învățământ — art. 77 alin. (10) lit. b) */
  copiiInvatamant?: number;
}

/** Procentul deducerii personale de bază (din salariul minim), art. 77 alin. (4). */
export function procentDeducereBaza(
  salariuBrut: number,
  persoaneInIntretinere: number,
  salariuMinim: number = SAL_MIN_BRUT,
): number {
  if (salariuBrut <= 0) return 0;
  const p = Math.floor(clampNumber(persoaneInIntretinere, 0, 4));
  const peste = salariuBrut - salariuMinim;
  // sursa: Codul fiscal art. 77 alin. (3) — peste minim + 2.000 lei nu se acordă
  if (peste > 2000) return 0;
  if (peste <= 0) return DEDUCERE_BAZA_PROCENT[p];
  const transa = Math.ceil(peste / 50); // 1 = min+1…min+50, …, 40 = min+1.951…min+2.000
  return Math.max(0, DEDUCERE_BAZA_PROCENT[p] - 0.5 * transa);
}

export function calculDeducere(
  salariuBrut: number,
  persoaneInIntretinere: number,
  salariuMinim: number = SAL_MIN_BRUT,
  optiuni: DeducereOptiuni = {},
): number {
  if (salariuBrut <= 0) return 0;
  // sursa: Codul fiscal art. 77 alin. (3)-(4) (forma din 08.08.2026)
  const baza = (procentDeducereBaza(salariuBrut, persoaneInIntretinere, salariuMinim) / 100) * salariuMinim;
  // sursa: Codul fiscal art. 77 alin. (10) lit. a) — 15% din salariul minim, sub 26 de ani
  const tineri = optiuni.sub26Ani && salariuBrut <= salariuMinim + 2000 ? 0.15 * salariuMinim : 0;
  // sursa: Codul fiscal art. 77 alin. (10) lit. b) — 100 lei/copil înscris în învățământ
  const copii = 100 * Math.floor(clampNumber(optiuni.copiiInvatamant ?? 0, 0, 20));
  return Math.round((baza + tineri + copii) * 100) / 100;
}

export function calcBrut(input: TaxInput): TaxBreakdown {
  const sbCalculat = input.salariuBaza + (input.coefSuplimentConducere ?? 0) * input.valoareReferinta;
  // sursa: proiect MMFTSS art. 10 alin. (8) (25 mai / 17 iul. / 20 aug. 2026; în
  // varianta 20 aug. la pag. 8-9) + art. 7 lit. z) pentru solda de funcție:
  // sub salariul minim brut pe țară garantat în plată se plătește o sumă egală
  // cu acesta. Folosim salariul minim în vigoare (HG 146/2026: 4.325 lei); cel
  // din 2027 nu e încă stabilit. Normă întreagă — timpul parțial nu e modelat.
  const salMinGarantat = input.salariuMinimGarantat === false ? 0 : input.salariuMinimGarantat ?? SAL_MIN_BRUT;
  const completareSalariuMinim =
    sbCalculat > 0 && sbCalculat < salMinGarantat ? salMinGarantat - sbCalculat : 0;
  // Sporurile rămân calculate la salariul de bază din grilă (`sb`): proiectul
  // nu spune dacă suma de completare intră în baza sporurilor.
  const sb = sbCalculat;
  // Solda de grad (Anexa VI) = coef cap. I.2 × val. ref. Se adaugă în solda lunară,
  // dar NU primește gradații (art. 4 alin. 3) și NU intră în baza sporurilor calculate
  // „din solda de funcție" (ex. art. 10) — de aceea e ținut separat de `sb`.
  const soldaGrad = (input.soldaGradCoef ?? 0) * input.valoareReferinta;
  // Tariful orar = salariu de bază / ore normă lunară. Numitorul e introdus de
  // utilizator (valoarea exactă a lunii de pe fluturaș), fără presupuneri.
  const oreNorma = input.oreNormaLunara && input.oreNormaLunara > 0 ? input.oreNormaLunara : 0;
  const tarifOrar = oreNorma > 0 ? sb / oreNorma : 0;

  let sporuriProcent = 0;
  let sporuriValoare = 0;
  let sporuriExceptate = 0;
  let sumeOneOff = 0;
  let oreNormaLipsa = false;

  for (const { spor, activ, procentCustom, ore, fractieTimp, bazaCustom } of input.sporuri) {
    if (!activ) continue;
    let lei = 0;

    if (spor.inputKind === "orar") {
      // tarif_orar × ore × procent% — se aplică DOAR pe orele calificate,
      // nu pe tot salariul lunar.
      if (oreNorma <= 0) oreNormaLipsa = true;
      const p = procentCustom ?? spor.valoare;
      lei = tarifOrar * (ore ?? 0) * (p / 100);
    } else if (spor.inputKind === "proportional") {
      // % din bază scalat cu fracțiunea de timp lucrat în condițiile respective.
      const p = procentCustom ?? spor.valoare;
      const frac = clampNumber(fractieTimp ?? 100, 0, 100) / 100;
      lei = ((sb * p) / 100) * frac;
    } else if (spor.inputKind === "bazaProprie") {
      // procent dintr-o bază de referință proprie (≠ salariul utilizatorului).
      const p = procentCustom ?? spor.valoare;
      lei = ((bazaCustom ?? 0) * p) / 100;
    } else if (spor.inputKind === "oneOff") {
      // sumă punctuală — raportată separat, exclusă din salariul lunar recurent.
      sumeOneOff += spor.tip === "valoare"
        ? (input.valoareReferinta * spor.valoare) / 100
        : procentCustom ?? spor.valoare;
      continue;
    } else if (spor.tip === "procent") {
      // standard + "selectie" (procentul ales din listă ajunge în procentCustom)
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

  const salariuBrut = sb + completareSalariuMinim + soldaGrad + sporuriProcent + sporuriExceptate + sporuriValoare;

  // CAS 25%, CASS 10%
  const cas = Math.round(salariuBrut * 0.25);
  const cass = Math.round(salariuBrut * 0.1);
  const venitImpozabil = salariuBrut - cas - cass;

  // sursa: Codul fiscal art. 77 alin. (2) — deducerea se acordă în limita venitului impozabil lunar
  const deductibil = Math.min(
    Math.max(0, venitImpozabil),
    calculDeducere(salariuBrut, input.persoaneInIntretinere ?? 0, SAL_MIN_BRUT, {
      sub26Ani: input.sub26Ani,
      copiiInvatamant: input.copiiInvatamant,
    }),
  );

  const impozitCalculat = Math.round(Math.max(0, venitImpozabil - deductibil) * 0.1);
  const impozit = input.scutireImpozit ? 0 : impozitCalculat;
  const salariuNet = venitImpozabil - impozit;

  return {
    salariuBaza: Math.round(sb + completareSalariuMinim + soldaGrad),
    soldaGrad: Math.round(soldaGrad),
    completareSalariuMinim: Math.round(completareSalariuMinim),
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
    sumeOneOff: Math.round(sumeOneOff),
    oreNormaLipsa,
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

// ─────────────────────────────────────────────────────────────────────────────
// SOLDA DE GRAD / SALARIUL GRADULUI PROFESIONAL — Anexa VI, capitolul I.2
// ─────────────────────────────────────────────────────────────────────────────
// Art. 2 alin. (2): militarii/polițiștii/polițiștii de penitenciare au soldă
// lunară compusă din SOLDĂ DE FUNCȚIE + SOLDĂ DE GRAD.
// Art. 6 alin. (4): solda de grad = coeficienții din cap. I.2 × valoarea de referință.
// Art. 4 alin. (3): gradațiile (1–7) majorează DOAR solda de funcție — solda de
// grad NU primește gradații.
// Coeficienții de mai jos sunt preluați integral din cap. I.2 al Anexei VI
// (Proiect-COEFICIENTI MMFTSS 25.05.2026). Nota: rândurile nrCrt 48–56 lipseau
// din importul `coefficients.json` (shift de coloană în xlsx) — sunt incluse aici.
// ATENȚIE: aceasta e grila din VARIANTA 25 MAI (Mareșal 1,00 → Soldat 0,10).
// Variantele din 17 iulie și 20 august au altă grilă (1,10 → 0,40) —
// data/variants/<id>.solde-grad.json, expusă prin `Varianta.soldeGrad`
// (lib/variants.ts). Funcțiile de mai jos primesc grila ca parametru.
export interface SoldaGrad {
  nrCrt: number;
  key: string; // "g{nrCrt}"
  label: string; // gradul militar / gradul profesional
  coef: number;
}

export const SOLDE_GRAD: SoldaGrad[] = [
  { nrCrt: 35, key: "g35", label: "Mareșal", coef: 1.0 },
  { nrCrt: 36, key: "g36", label: "General; amiral; chestor general de poliție", coef: 0.9 },
  { nrCrt: 37, key: "g37", label: "General-locotenent; viceamiral; chestor-șef de poliție", coef: 0.85 },
  { nrCrt: 38, key: "g38", label: "General-maior; contraamiral; chestor principal de poliție", coef: 0.81 },
  { nrCrt: 39, key: "g39", label: "General de brigadă / de flotilă aeriană; contraamiral de flotilă; chestor de poliție", coef: 0.77 },
  { nrCrt: 40, key: "g40", label: "Colonel; comandor; comisar-șef de poliție", coef: 0.73580378565715798 },
  { nrCrt: 41, key: "g41", label: "Locotenent-colonel; căpitan-comandor; comisar de poliție", coef: 0.69848040522527299 },
  { nrCrt: 42, key: "g42", label: "Maior; locotenent-comandor; subcomisar de poliție", coef: 0.69848040522527299 },
  { nrCrt: 43, key: "g43", label: "Căpitan; inspector principal de poliție", coef: 0.64249533457744601 },
  { nrCrt: 44, key: "g44", label: "Locotenent; inspector de poliție", coef: 0.62383364436150301 },
  { nrCrt: 45, key: "g45", label: "Sublocotenent; aspirant; subinspector de poliție", coef: 0.60517195414556102 },
  { nrCrt: 46, key: "g46", label: "Maistru militar principal; plutonier adjutant principal; agent-șef principal", coef: 0.58651026392961803 },
  { nrCrt: 47, key: "g47", label: "Maistru militar clasa I; plutonier adjutant; agent-șef de poliție", coef: 0.56784857371367603 },
  { nrCrt: 48, key: "g48", label: "Maistru militar clasa a II-a; plutonier major; agent-șef adjunct", coef: 0.474540122633964 },
  { nrCrt: 49, key: "g49", label: "Maistru militar clasa a III-a; plutonier; agent principal", coef: 0.45587843241802201 },
  { nrCrt: 50, key: "g50", label: "Maistru militar clasa a IV-a; sergent-major; agent de poliție", coef: 0.43721674220207901 },
  { nrCrt: 51, key: "g51", label: "Maistru militar clasa a V-a; sergent", coef: 0.41855505198613702 },
  { nrCrt: 52, key: "g52", label: "Caporal clasa I", coef: 0.39989336177019502 },
  { nrCrt: 53, key: "g53", label: "Caporal clasa a II-a", coef: 0.3 },
  { nrCrt: 54, key: "g54", label: "Caporal clasa a III-a", coef: 0.25 },
  { nrCrt: 55, key: "g55", label: "Fruntaș", coef: 0.2 },
  { nrCrt: 56, key: "g56", label: "Soldat", coef: 0.1 },
];

export function soldaGradByKey(
  key: string | null | undefined,
  grila: SoldaGrad[] = SOLDE_GRAD,
): SoldaGrad | null {
  if (!key) return null;
  return grila.find((g) => g.key === key) ?? null;
}

/** Cel mai mare coeficient din grila soldelor de grad (1,00 la 25 mai; 1,10 din iulie). */
export function pragSoldaGrad(grila: SoldaGrad[] = SOLDE_GRAD): number {
  return grila.reduce((m, g) => (g.coef > m ? g.coef : m), 0);
}

// Reguli de auto-deducere: din numele funcției ("Funcţii corespunzătoare gradului
// de colonel; ...") extragem gradul PRIMAR (primul din enumerare = gradul de
// armată) și îl mapăm pe coeficientul soldei de grad. Ordinea contează — gradele
// compuse (general-maior, locotenent-colonel, clasa a III-a) se verifică înaintea
// celor simple. Validat pe toate cele 34 de funcții din cap. I.1.
const SOLDA_GRAD_RULES: [string, string][] = [
  ["general de brigad", "g39"], ["general de flotil", "g39"],
  ["general-locotenent", "g37"], ["general-maior", "g38"], ["general", "g36"],
  ["locotenent-colonel", "g41"], ["colonel", "g40"],
  ["maior", "g42"], ["căpitan", "g43"],
  ["sublocotenent", "g45"], ["locotenent", "g44"],
  ["maistru militar clasa a v", "g51"], ["maistru militar clasa a iv", "g50"],
  ["maistru militar clasa a iii", "g49"], ["maistru militar clasa a ii", "g48"],
  ["maistru militar clasa i", "g47"], ["maistru militar principal", "g46"],
  ["plutonier adjutant sef", "g46"], ["plutonier adjutant", "g47"],
  ["plutonier major", "g48"], ["plutonier", "g49"],
  ["sergent-major", "g50"], ["sergent", "g51"],
  ["caporal clasa a iii", "g54"], ["caporal clasa a ii", "g53"], ["caporal clasa i", "g52"],
  ["frunta", "g55"], ["soldat", "g56"],
  ["subinspector", "g45"], ["agent de poliţie/penitenciare debutant", "g50"], ["agent", "g46"],
];

/**
 * Cheia soldei de grad dedusă automat din denumirea funcției (cap. I.1).
 * Funcțiile de vârf fără „gradului de" (Șeful SMG etc.) → grad de general.
 * Returnează null dacă nu se poate deduce (utilizatorul alege manual).
 */
export function soldaGradPentruFunctie(functie: string): string | null {
  const low = functie.toLowerCase();
  const idx = low.indexOf("gradului de ");
  if (idx < 0) return "g36";
  const primar = low.slice(idx + "gradului de ".length).split(";")[0].split(",")[0];
  for (const [sub, key] of SOLDA_GRAD_RULES) {
    if (primar.includes(sub)) return key;
  }
  return null;
}

/**
 * Adevărat pentru rândurile soldei de grad (cap. I.2) importate din greșeală ca
 * funcții selectabile în Anexa VI (setul din 25 mai). Coeficientul lor (≤ 1,00,
 * respectiv ≤ 1,10 în grilele din iulie/august) e sub orice funcție din cap. I.1
 * (minim 1,14 — soldat), deci pragul separă curat cele două capitole. Seturile
 * din iulie/august nu mai conțin astfel de rânduri (importatorul le separă).
 */
export function esteRandSoldaDeGrad(
  e: { anexa: string; coeficient: number },
  grila: SoldaGrad[] = SOLDE_GRAD,
): boolean {
  return e.anexa === "VI" && e.coeficient <= pragSoldaGrad(grila);
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
    descriere: "Art. 17 — spor de 25% din tariful orar, DOAR pentru orele lucrate între 22:00–06:00. Se aplică pe orele de noapte introduse, nu pe tot salariul. Exceptat de la plafon.",
    aplicabilAnexe: ["I", "III", "IV", "V", "VI", "VII", "VIII", "IX"],
    inputKind: "orar",
    unitateOre: "ore de noapte / lună (22:00–06:00)",
  },
  {
    id: "ore-supl-75",
    nume: "Muncă suplimentară zile lucrătoare (75%)",
    tip: "procent",
    valoare: 75,
    inclusInPlafon20: false,
    descriere: "Art. 18 — 75% din tariful orar pentru orele suplimentare necompensate cu liber în 60 zile. Se aplică pe orele suplimentare introduse, nu pe tot salariul.",
    inputKind: "orar",
    unitateOre: "ore suplimentare / lună",
  },
  {
    id: "ore-supl-100",
    nume: "Muncă în weekend / sărbători legale (100%)",
    tip: "procent",
    valoare: 100,
    inclusInPlafon20: false,
    descriere: "Art. 18(3) — 100% din tariful orar pentru orele lucrate în repaus săptămânal / sărbători legale. Se aplică pe orele introduse, nu pe tot salariul.",
    aplicabilAnexe: ["I", "III", "IV", "V", "VI", "VII", "VIII", "IX"],
    inputKind: "orar",
    unitateOre: "ore weekend / sărbători / lună",
  },
  {
    id: "handicap",
    nume: "Persoane cu handicap grav/accentuat (15% din val. referință)",
    tip: "valoare",
    valoare: 15,
    inclusInPlafon20: false,
    descriere:
      "Art. 19 alin. (1) proiect MMFTSS — citat: „spor de 15% din valoarea de referință\". " +
      "Cuantum FIX (15% × valoarea de referință: 615 lei la 4.100 lei, 600 lei la 4.000 lei), NU procent din salariul de bază. " +
      "Atenție: Legea 153/2017 (vechi) avea 15% din salariul de bază — proiectul nou a redus acest spor pentru funcțiile mari. " +
      "Conform art. 19 alin. (2), nu intră în plafonul de 20%.",
  },
  {
    id: "conditii",
    nume: "Spor pentru condiții de muncă (cadru)",
    tip: "procent",
    valoare: 15,
    inclusInPlafon20: true,
    descriere:
      "Art. 20 — procent stabilit prin regulament-cadru pe domeniu. Aplicabil DOAR pentru anexele care NU au sporuri concrete de condiții (Învățământ, Diplomație, Demnitate publică). Pentru Sănătate, Cultură, Justiție, Apărare, Cercetare, Administrație — folosește sporurile specifice anexei tale.",
    aplicabilAnexe: ["I", "IV", "IX"],
  },
  {
    id: "doctorat",
    nume: "Spor de doctorat (15%)",
    tip: "procent",
    valoare: 15,
    inclusInPlafon20: true,
    descriere:
      "Pentru personalul cu titlul științific de doctor obținut în domeniul postului ocupat. Inclus în plafonul de 20%. " +
      "⚠️ STATUS INCERT: nu apare explicit în noul proiect MMFTSS — bază legală anterioară Legea 153/2017 art. 14 alin. (8). Probabil va fi păstrat prin HG/regulament-cadru, dar de confirmat la adoptare.",
    aplicabilAnexe: ["I", "VII"],
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
    descriere: "Anexa II art. 2 — +10% din tariful orar pentru orele lucrate în weekend/sărbători (în loc de +100% din regimul general). Se aplică pe orele introduse, nu pe tot salariul.",
    aplicabilAnexe: ["II"],
    inputKind: "orar",
    unitateOre: "ore în weekend / sărbători / lună",
  },
  {
    id: "radiatii",
    nume: "Surse de radiații Sănătate (până la 10%)",
    tip: "procent",
    valoare: 5,
    inclusInPlafon20: true,
    descriere:
      "Anexa II art. 7(1) lit. e) — personal medical/auxiliar expus radiațiilor ionizante. Alege categoria de risc radiologic — procentul se stabilește automat.",
    aplicabilAnexe: ["II"],
    inputKind: "selectie",
    optiuni: [
      { label: "Categoria I (2,5%)", valoare: 2.5 },
      { label: "Categoria II (5%)", valoare: 5 },
      { label: "Categoria III (7,5%)", valoare: 7.5 },
      { label: "Categoria IV (10%)", valoare: 10 },
    ],
  },
  {
    id: "garzi-medic",
    nume: "Gărzi (plată la tarif orar)",
    tip: "procent",
    valoare: 100,
    inclusInPlafon20: false,
    descriere:
      "Anexa II art. 3-5 — gărzile pentru completarea normei se plătesc cu tariful orar al salariului de bază (100% pe oră). Introdu orele de gardă/lună. Gărzile peste norma legală se prestează prin contract separat; verifică fluturașul pentru valoarea exactă pe specialitate.",
    aplicabilAnexe: ["II"],
    inputKind: "orar",
    unitateOre: "ore de gardă / lună",
  },
  {
    id: "indemnizatie-permanenta-sanatate",
    nume: "Indemnizație de permanență (sumă fixă lunară)",
    tip: "lei",
    valoare: 500,
    inclusInPlafon20: false,
    descriere:
      "Sumă fixă lunară pentru personalul medical care asigură permanență/continuitate în unitate. " +
      "Valori uzuale: 300, 500, 800 sau 1000 lei (în funcție de poziție și regulamentul unității). Editează cuantumul după caz. " +
      "⚠️ STATUS INCERT: nu apare explicit în noul proiect MMFTSS — bază legală anterioară OUG 115/2004 + HG 153/2018. Probabil păstrată prin act normativ separat, de confirmat la adoptare.",
    aplicabilAnexe: ["II"],
  },
  {
    id: "garda-domiciliu-sanatate",
    nume: "Gardă la domiciliu (15% tarif orar)",
    tip: "procent",
    valoare: 15,
    inclusInPlafon20: true,
    descriere:
      "Anexa II art. 3(4) — 15% din tariful orar pentru orele de gardă la domiciliu / asistență de urgență. Introdu orele de gardă la domiciliu/lună.",
    aplicabilAnexe: ["II"],
    inputKind: "orar",
    unitateOre: "ore de gardă la domiciliu / lună",
  },
  {
    id: "neonatologie-laborator-sanatate",
    nume: "Condiții periculoase neonatologie/laboratoare (până la 15%)",
    tip: "procent",
    valoare: 15,
    inclusInPlafon20: true,
    descriere:
      "Anexa II art. 7(1) lit.a) — neonatologie, săli naștere, laboratoare analize. Max 15% sal. bază. Nu se cumulează cu celelalte sporuri lit. b-d (art. 7 alin. 5).",
    aplicabilAnexe: ["II"],
    groupExclusiv: "sanatate-conditii-art7",
  },
  {
    id: "periculoase-nivel-1-sanatate",
    nume: "Condiții deosebit periculoase nivel I (până la 40%)",
    tip: "procent",
    valoare: 40,
    inclusInPlafon20: true,
    descriere:
      "Anexa II art. 7(1) lit.b) — dializă, oncologie, ATI, paliative, chirurgie cardio, psihiatrie. Max 40%. Nu se cumulează cu lit. a/c/d (art. 7 alin. 5).",
    aplicabilAnexe: ["II"],
    groupExclusiv: "sanatate-conditii-art7",
  },
  {
    id: "tesa-leprozerii-sanatate",
    nume: "Personal TESA în leprozerii/TBC/psihiatrie (până la 20%)",
    tip: "procent",
    valoare: 20,
    inclusInPlafon20: true,
    descriere:
      "Anexa II art. 7(1) lit.b) — personal nemedical/TESA din leprozerii, TBC, psihiatrie. Max 20%. Nu se cumulează cu lit. a/c/d (art. 7 alin. 5).",
    aplicabilAnexe: ["II"],
    groupExclusiv: "sanatate-conditii-art7",
  },
  {
    id: "periculoase-nivel-2-sanatate",
    nume: "Condiții deosebit periculoase nivel II (până la 50%)",
    tip: "procent",
    valoare: 50,
    inclusInPlafon20: true,
    descriere:
      "Anexa II art. 7(1) lit.c) — anatomie patologică, SIDA, TBC, UPU/SMURD, ATI, transplant, arși. Max 50%. Nu se cumulează cu lit. a/b/d (art. 7 alin. 5).",
    aplicabilAnexe: ["II"],
    groupExclusiv: "sanatate-conditii-art7",
  },
  {
    id: "conditii-grele-sanatate",
    nume: "Condiții grele de muncă sănătate (5%)",
    tip: "procent",
    valoare: 5,
    inclusInPlafon20: true,
    descriere:
      "Anexa II art. 7(1) lit.d) — spor 5% din salariul de bază, proporțional cu timpul efectiv lucrat în acele condiții. Introdu fracțiunea de timp lucrat. Nu se cumulează cu lit. a/b/c (art. 7 alin. 5).",
    aplicabilAnexe: ["II"],
    groupExclusiv: "sanatate-conditii-art7",
    inputKind: "proportional",
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

  // === Adăugiri Cap. IV — sporuri generale ===
  {
    id: "fonduri-eu-demnitate",
    nume: "Proiecte UE — demnitari (până la 20% indemnizație)",
    tip: "procent",
    valoare: 20,
    inclusInPlafon20: true,
    descriere:
      "Art. 15 alin. (2)-(3) — președinți/vicepreșed. CJ, primari/viceprimari și demnitari care implementează proiecte finanțate din fonduri europene. Max 20% din indemnizația lunară.",
    aplicabilAnexe: ["IX"],
  },

  // === Adăugiri Anexa II — Asistență socială (distinct de Sănătate) ===
  {
    id: "conditii-grele-asistenta-sociala",
    nume: "Condiții grele asistență socială (5%)",
    tip: "procent",
    valoare: 5,
    inclusInPlafon20: true,
    descriere:
      "Anexa II art. 14(1) lit. b) — personal centre rezidențiale asistență socială (DGASPC etc.). Spor fix 5%, distinct de cel similar din sănătate.",
    aplicabilAnexe: ["II"],
  },
  {
    id: "izolare-asistenta-sociala",
    nume: "Izolare asistență socială (până la 15%)",
    tip: "procent",
    valoare: 15,
    inclusInPlafon20: false,
    descriere:
      "Anexa II art. 14(1) lit. c) — localități izolate, altitudine, atragere dificilă pentru centre de asistență socială. Exceptat de plafon (art. 14 alin. 2).",
    aplicabilAnexe: ["II"],
  },

  // === Adăugiri Anexa VI — Apărare ===
  {
    id: "cfp-aparare",
    nume: "CFP / audit apărare (+10% soldă funcție)",
    tip: "procent",
    valoare: 10,
    inclusInPlafon20: true,
    descriere:
      "Anexa VI art. 7 alin. (7) — control financiar preventiv propriu și audit în instituțiile de apărare/ordine publică. Distinct de sporul CFP general (art. 14).",
    aplicabilAnexe: ["VI"],
  },
  {
    id: "indemnizatie-studiu-aparare",
    nume: "Indemnizație de studiu elevi/studenți (0,40-0,50 val. ref.)",
    tip: "valoare",
    valoare: 50,
    inclusInPlafon20: false,
    descriere:
      "Anexa VI art. 41 alin. (1) — student 50% val. ref.; elev 40%. Lunară, pe perioada studiilor. Exceptată de plafon (art. 41 alin. 5).",
    aplicabilAnexe: ["VI"],
  },
  {
    id: "indemnizatie-comanda-aparare",
    nume: "Indemnizație de comandă elevi/studenți (0,10-0,20 val. ref.)",
    tip: "valoare",
    valoare: 20,
    inclusInPlafon20: false,
    descriere:
      "Anexa VI art. 41 alin. (2) — plt. adj. 20%, plt. major 18%, plt. companie 16%, locțiitor 12%, șef grupă 10%. Lunară, exceptată de plafon.",
    aplicabilAnexe: ["VI"],
  },
  {
    id: "indemnizatie-curs-aparare",
    nume: "Indemnizație curs formare militari (0,40-0,50 val. ref.)",
    tip: "valoare",
    valoare: 50,
    inclusInPlafon20: false,
    descriere:
      "Anexa VI art. 41 alin. (3) — ofițeri 50%; maiștri militari/subofițeri 40%. Pe durata cursului. Exceptată de plafon.",
    aplicabilAnexe: ["VI"],
  },
  {
    id: "indemnizatie-militar-termen-aparare",
    nume: "Indemnizație militar în termen (0,30-0,40 val. ref.)",
    tip: "valoare",
    valoare: 40,
    inclusInPlafon20: false,
    descriere:
      "Anexa VI art. 41 alin. (4) — fruntaș 40% val. ref.; soldat 30%. Lunară, exceptată de plafon.",
    aplicabilAnexe: ["VI"],
  },
  {
    id: "indemnizatie-mutare-familie-aparare",
    nume: "Indemnizație mutare per soț/copil (1/4 val. ref., one-off)",
    tip: "valoare",
    valoare: 25,
    inclusInPlafon20: false,
    descriere:
      "Anexa VI art. 38 alin. (3) lit. b) — 1/4 din valoarea de referință pentru soț/soție și fiecare copil aflat în întreținere, la data mutării. Plătită o singură dată.",
    aplicabilAnexe: ["VI"],
  },
  {
    id: "retentie-pensie-militara",
    nume: "Retenție pensie militară (1/3 soldă grad, net)",
    tip: "procent",
    valoare: 33,
    inclusInPlafon20: false,
    descriere:
      "Anexa VI art. 46 — pentru militarii care îndeplinesc condițiile pentru pensia de serviciu și rămân activi. 1/3 din solda de grad, NETĂ (fără CAS/CASS/impozit). Exceptată de plafon. NOTĂ: calculul nostru tratează ca procent peste salariul de bază; valoarea reală e netă — diferență de tratament fiscal.",
    aplicabilAnexe: ["VI"],
  },

  // === Anexa VI — Prime niche aviație ===
  {
    id: "prima-ora-zbor",
    nume: "Primă orară de zbor (2-10% × 1/3 sd. cd. escadrilă)",
    tip: "procent",
    valoare: 5,
    inclusInPlafon20: true,
    descriere:
      "Anexa VI art. 11 — per oră de zbor; majorabilă +50-200% după misiune. Membri echipaj: 50-85% din prima pilotului. Editează procentul pentru ora medie.",
    aplicabilAnexe: ["VI"],
  },
  {
    id: "prima-parasutare",
    nume: "Primă parașutare (2-8% × 1/3 sd. cd. batalion paraș.)",
    tip: "procent",
    valoare: 5,
    inclusInPlafon20: true,
    descriere:
      "Anexa VI art. 12 alin. (1) — per parașutare; combinate (alin. 2) +1-5%.",
    aplicabilAnexe: ["VI"],
  },
  {
    id: "prima-catapultare",
    nume: "Primă catapultare (1-2 × sumă soldă funcție + grad, one-off)",
    tip: "lei",
    valoare: 4100,
    inclusInPlafon20: true,
    descriere:
      "Anexa VI art. 12 alin. (3) — catapultare reală 1×, test 2×. Plată one-off. Suma e ESTIMATIVĂ (echivalentul soldei funcție+grad) — verifică fluturașul.",
    aplicabilAnexe: ["VI"],
  },
  {
    id: "prima-specialitate-aviatie",
    nume: "Prime zboruri test/recepție aeronave (4-500%)",
    tip: "procent",
    valoare: 10,
    inclusInPlafon20: true,
    descriere:
      "Anexa VI art. 13 — per eveniment, interval foarte larg (4-500%) după tipul misiunii: încercare, recepție, demonstrație. Editează după misiune.",
    aplicabilAnexe: ["VI"],
  },
  {
    id: "prime-asigurare-aeronautica",
    nume: "Prime asigurare activități aeronautice (interval larg)",
    tip: "procent",
    valoare: 5,
    inclusInPlafon20: true,
    descriere:
      "Anexa VI art. 17 — pachet: aterizare (0,04-3%), start (1-2%), dirijare (0,02-2%), reparații (0,2-15%), asigurare tehnică (0,003-0,1%), aterizare drone (5-40%), simulatoare (0,1-0,5%). Editează după cum se aplică.",
    aplicabilAnexe: ["VI"],
  },
  {
    id: "compensatie-aeronautic-incapacitate",
    nume: "Compensație aeronautic în incapacitate de zbor",
    tip: "procent",
    valoare: 80,
    inclusInPlafon20: true,
    descriere:
      "Anexa VI art. 18 — diferență salarială pentru personal aeronautic retras din zbor (≥80% din vechimea minimă pensie). Procent estimativ.",
    aplicabilAnexe: ["VI"],
  },
  {
    id: "prima-rapel-elicopter",
    nume: "Primă rapel/coborâre rapidă elicopter (2-3%)",
    tip: "procent",
    valoare: 2,
    inclusInPlafon20: true,
    descriere:
      "Anexa VI art. 20 — per coborâre: 2% rapel, 3% coborâre rapidă, din sd. funcție comandant.",
    aplicabilAnexe: ["VI"],
  },

  // === Anexa VI — Prime marină ===
  {
    id: "ambarcare-elevi",
    nume: "Ambarcare elevi/studenți militari (10%)",
    tip: "procent",
    valoare: 10,
    inclusInPlafon20: true,
    descriere:
      "Anexa VI art. 21 — 10% din solda minimă a soldatului gradat profesionist, pentru elevi/studenți instituții militare. Cumulabil cu sporul pentru personalul militar.",
    aplicabilAnexe: ["VI"],
  },
  {
    id: "prima-manevre-nave",
    nume: "Primă manevre periculoase nave (50% sd. funcție zilnic)",
    tip: "procent",
    valoare: 50,
    inclusInPlafon20: true,
    descriere:
      "Anexa VI art. 22 — 50% sd. funcție per zi, pentru plecare/acostare/alte manevre periculoase, indiferent de numărul de manevre.",
    aplicabilAnexe: ["VI"],
  },
  {
    id: "prima-salt-elicopter-apa",
    nume: "Primă salt elicopter în apă (1% sd. cd. scafandri)",
    tip: "procent",
    valoare: 1,
    inclusInPlafon20: true,
    descriere:
      "Anexa VI art. 23 — per salt din elicopter în apă, 1% sd. funcție comandant divizion scafandri.",
    aplicabilAnexe: ["VI"],
  },
  {
    id: "prima-scufundare",
    nume: "Primă scufundare (1-50% × 1/3 sd. cd. divizion)",
    tip: "procent",
    valoare: 3,
    inclusInPlafon20: true,
    descriere:
      "Anexa VI art. 24 alin. (2) — interval combinat după modul: autonomă deschisă/alim. suprafață 1-5%, semi-închisă 1,5-6%, închisă 2-3%, unitară 3-7%, saturație 12-50% zilnic. Majorări: -20% antrenament adâncime, +25% apă <10°C/testare, +100% misiuni EOD.",
    aplicabilAnexe: ["VI"],
  },
  {
    id: "prima-salt-recuperare-scafandri",
    nume: "Salt/recuperare scafandri (2-6% × 1/3 sd. cd. divizion)",
    tip: "procent",
    valoare: 3,
    inclusInPlafon20: true,
    descriere:
      "Anexa VI art. 25 — tabel: 2/3/4/5/5,5/6% după modalitate (vedetă, elicopter, submarin, viteză, etc.). +100% misiuni reale.",
    aplicabilAnexe: ["VI"],
  },
  {
    id: "prima-imersiune-submersibile",
    nume: "Imersiune submersibile / incintă (2,5-5%)",
    tip: "procent",
    valoare: 3,
    inclusInPlafon20: true,
    descriere:
      "Anexa VI art. 26 — per oră imersiune.",
    aplicabilAnexe: ["VI"],
  },
  {
    id: "prima-echipa-suprafata",
    nume: "Echipa suprafață scufundări (10-25% din prima scafandri)",
    tip: "procent",
    valoare: 15,
    inclusInPlafon20: true,
    descriere:
      "Anexa VI art. 27 — pentru echipajul de suprafață care asigură scufundările; 10-25% din prima orară/zilnică a scafandrilor.",
    aplicabilAnexe: ["VI"],
  },
  {
    id: "prima-imersiune-submarin",
    nume: "Primă imersiune submarin (2% sd. cd. submarin / oră)",
    tip: "procent",
    valoare: 2,
    inclusInPlafon20: true,
    descriere:
      "Anexa VI art. 31 — per oră imersiune. ×2 la 100-200m, ×3 peste 200m; +30% per intrare/ieșire prin sas.",
    aplicabilAnexe: ["VI"],
  },
  {
    id: "prima-proba-submarin",
    nume: "Probă imersiune mare adâncime (2 solde funcție, one-off)",
    tip: "lei",
    valoare: 8200,
    inclusInPlafon20: true,
    descriere:
      "Anexa VI art. 32 — plată one-off pentru proba la mare adâncime, echivalent 2× soldă funcție comandant. Verifică valoarea exactă pe fluturaș.",
    aplicabilAnexe: ["VI"],
  },
  {
    id: "prima-iesire-submarin-avariat",
    nume: "Ieșire submarin avariat (4 solde funcție, one-off)",
    tip: "lei",
    valoare: 16400,
    inclusInPlafon20: true,
    descriere:
      "Anexa VI art. 33 — plată one-off pentru ieșirea dintr-un submarin avariat, echivalent 4× soldă funcție. Valoare ESTIMATIVĂ.",
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
 * Categorizează sporurile aplicabile pe anexa selectată:
 * - "generale": sporuri din Cap. IV proiect care se aplică transversal
 *   (fără aplicabilAnexe sau aplicabile pe ≥5 anexe — practic peste tot)
 * - "specifice": sporuri restrânse la 1-4 anexe (reguli specifice anexei)
 */
export function sporuriGrupate(anexa: string): {
  generale: Spor[];
  specifice: Spor[];
} {
  const aplicabile = sporuriPentruAnexa(anexa);
  const generale: Spor[] = [];
  const specifice: Spor[] = [];
  for (const s of aplicabile) {
    if (!s.aplicabilAnexe || s.aplicabilAnexe.length >= 5) {
      generale.push(s);
    } else {
      specifice.push(s);
    }
  }
  return { generale, specifice };
}

/**
 * Valoarea de referință pentru anul 2027 — stabilită prin art. 35 alin. (2)
 * din dispozițiile finale ale proiectului de lege MMFTSS (25 mai 2026).
 * Începând cu 2028 se stabilește anual prin HG.
 *
 * @deprecated Păstrată pentru compatibilitate (varianta din 25 mai; și 17 iulie
 * are 4.100). Varianta din 20 august are 4.000 lei — folosește
 * `getVarianta(id).valoareReferinta` din lib/variants.ts.
 */
export const VALOARE_REFERINTA_DEFAULT = 4100;

/**
 * Anexa V Art. 8 — Coeficientul suplimentar pentru funcțiile de conducere
 * din sistemul justiției. Se adaugă la indemnizația de încadrare maximă
 * a judecătorului ÎCCJ, înmulțit cu valoarea de referință.
 *
 * Formula: indemnizație = max_iccj + coef × val. ref.
 */
export interface CoefConducereJustitie {
  id: string;
  label: string;
  coef: number;
  categorie: "ICCJ" | "Curti";
}

export const COEFICIENTI_CONDUCERE_JUSTITIE: CoefConducereJustitie[] = [
  // a) ÎCCJ + Parchetul de pe lângă ÎCCJ
  { id: "iccj-pres", label: "Președinte ÎCCJ / Procuror general PÎCCJ", coef: 0.5, categorie: "ICCJ" },
  { id: "iccj-vicepres", label: "Vicepreș. ÎCCJ / Prim-adj. proc. gen. / Proc. șef DNA / DIICOT", coef: 0.45, categorie: "ICCJ" },
  { id: "iccj-pres-sectie", label: "Pres. secție ÎCCJ / Adj. proc. gen. / Adj. proc. șef DNA / DIICOT", coef: 0.4, categorie: "ICCJ" },
  { id: "iccj-sef-sectie", label: "Proc. șef secție (PÎCCJ / DNA / DIICOT)", coef: 0.35, categorie: "ICCJ" },
  { id: "iccj-sef-sectie-adj", label: "Proc. șef secție adjunct (PÎCCJ / DNA / DIICOT)", coef: 0.3, categorie: "ICCJ" },
  { id: "iccj-sef-serv", label: "Proc. șef serviciu (PÎCCJ / DNA / DIICOT)", coef: 0.25, categorie: "ICCJ" },
  { id: "iccj-sef-birou", label: "Proc. șef birou (PÎCCJ / DNA / DIICOT)", coef: 0.2, categorie: "ICCJ" },
  // b) Curți de apel, tribunale, judecătorii
  { id: "curti-pres", label: "Pres. curte apel / Proc. general / Prim procuror", coef: 0.5, categorie: "Curti" },
  { id: "curti-vicepres", label: "Vicepreș. / Proc. general adjunct / Prim proc. adjunct", coef: 0.45, categorie: "Curti" },
  { id: "curti-pres-sectie", label: "Pres. secție / Proc. șef secție", coef: 0.4, categorie: "Curti" },
  { id: "curti-sef-serv", label: "Proc. șef serviciu", coef: 0.3, categorie: "Curti" },
  { id: "curti-sef-birou", label: "Proc. șef birou", coef: 0.2, categorie: "Curti" },
];

/**
 * Anexa IV Art. 6 — Nomenclatorul funcțiilor și coeficienților de ierarhizare
 * pentru determinarea salariilor în VALUTĂ pentru personalul trimis în
 * misiune permanentă în străinătate (ambasade, consulate, institute culturale).
 *
 * Formula: salariu_net_valuta = coef × baza_de_calcul_pe_tara
 * unde baza_de_calcul_pe_tara se stabilește prin HG (Art. 4 alin. 3) —
 * NU este publicată încă (urmează în 60 zile după adoptarea legii).
 */
export interface FunctieDiplomatieMisiune {
  nr: number;
  functie: string;
  studii: "S" | "M" | "G" | "M; G";
  coeficient: number;
}

export const FUNCTII_DIPLOMATIE_MISIUNE: FunctieDiplomatieMisiune[] = [
  { nr: 1, functie: "Ambasador-șef de misiune, emisar special zone conflict, reprezentant special SECI", studii: "S", coeficient: 6.6 },
  { nr: 2, functie: "Ambasador de carieră", studii: "S", coeficient: 6.27 },
  { nr: 3, functie: "Consul general-șef consulat, ministru plenipotențiar, reprezentant militar general-locotenent/maior", studii: "S", coeficient: 6.16 },
  { nr: 4, functie: "Ministru consilier, consul general carieră, director institut cultural, atașat apărării principal/militar/aero/naval", studii: "S", coeficient: 6.05 },
  { nr: 5, functie: "Consilier diplomatic/economic clasa I, atașat apărare clasa I, șef birou presă clasa I, director adjunct institut cultural", studii: "S", coeficient: 4.84 },
  { nr: 6, functie: "Consilier diplomatic/economic clasa a II-a, atașat apărare clasa a II-a, reprezentant militar locotenent-colonel", studii: "S", coeficient: 4.62 },
  { nr: 7, functie: "Secretar I clasa I, secretar economic I clasa I, atașat apărare adjunct clasa I, consul clasa I", studii: "S", coeficient: 4.18 },
  { nr: 8, functie: "Secretar I clasa a II-a, secretar economic I clasa a II-a, atașat apărare adjunct clasa a II-a, consul clasa a II-a", studii: "S", coeficient: 4.07 },
  { nr: 9, functie: "Secretar II clasa I, secretar economic II clasa I, economist clasa I, viceconsul clasa I, șef birou turism clasa I", studii: "S", coeficient: 3.85 },
  { nr: 10, functie: "Secretar II clasa a II-a, corespondent presă clasa I, economist clasa a II-a, șef serviciu admin. clasa I, viceconsul clasa a II-a", studii: "S", coeficient: 3.74 },
  { nr: 11, functie: "Secretar III clasa I, secretar economic III clasa I, secretar militar, consilier relații clasa I, șef birou turism clasa a II-a", studii: "S", coeficient: 3.63 },
  { nr: 12, functie: "Secretar III clasa a II-a, secretar economic III clasa a II-a, consilier relații clasa a II-a, referent principal relații clasa a II-a", studii: "S", coeficient: 3.41 },
  { nr: 13, functie: "Atașat clasa I, referent relații clasa I, bibliotecar principal, agent consular clasa I, atașat comunicații III clasa I", studii: "S", coeficient: 3.19 },
  { nr: 14, functie: "Atașat clasa a II-a, agent consular clasa a II-a, referent relații clasa a II-a, referent principal protecție clasa a II-a", studii: "S", coeficient: 3.08 },
  { nr: 15, functie: "Șef birou administrativ, referent principal de specialitate, plutonier-major/adjutant principal/maistru militar clasa a II-a", studii: "M", coeficient: 2.97 },
  { nr: 16, functie: "Contabil principal, referent transmitere, funcționar consular principal, sergent-plutonier/maistru militar clasa V-III", studii: "M", coeficient: 2.86 },
  { nr: 17, functie: "Contabil, cancelarist, bibliotecar, funcționar consular", studii: "M", coeficient: 2.75 },
  { nr: 18, functie: "Secretar-dactilograf principal, referent de specialitate I, referent protecție I", studii: "M", coeficient: 2.75 },
  { nr: 19, functie: "Intendent I, referent de specialitate II, referent protecție II", studii: "M", coeficient: 2.53 },
  { nr: 20, functie: "Secretar-dactilograf, referent relații II, intendent II", studii: "M; G", coeficient: 2.42 },
  { nr: 21, functie: "Șofer I, muncitor calificat I", studii: "M; G", coeficient: 2.31 },
  { nr: 22, functie: "Șofer II, muncitor calificat II, soldat/gradat voluntar în structuri NATO/UE/OSCE/ONU", studii: "G", coeficient: 1.98 },
  { nr: 23, functie: "Portar", studii: "G", coeficient: 1.87 },
  { nr: 24, functie: "Îngrijitor", studii: "G", coeficient: 1.76 },
];

/**
 * Calculul salariului lunar NET în valută pentru personalul în misiune
 * permanentă în străinătate. Conform Anexa IV Art. 4(2):
 *   salariu_net_valuta = coeficient × baza_de_calcul_pe_tara
 *
 * Salariul e NET (nu se aplică CAS/CASS/impozit ca la lei) — e drept salarial
 * primit direct, ținând cont de costul vieții din țară. Alte drepturi în
 * valută și lei (Art. 5) sunt stabilite separat prin lege.
 */
export function calcSalariuDiplomatieValuta(
  coef: number,
  bazaPeTara: number,
): number {
  if (coef <= 0 || bazaPeTara <= 0) return 0;
  return Math.round(coef * bazaPeTara);
}

/**
 * Aplicare regulă Art. 6 nota 1: la trimiterea în misiune, încadrarea în
 * clasa I se face DOAR dacă personalul a mai fost trimis minimum 1 an în
 * aceeași funcție sau una ierarhizată cel puțin la fel.
 * Pentru cei la prima misiune sau pe funcție nouă — clasa a II-a (coef mai mic).
 */
export function clasaPrimaMisiune(esteRepetata: boolean): "I" | "II" {
  return esteRepetata ? "I" : "II";
}
