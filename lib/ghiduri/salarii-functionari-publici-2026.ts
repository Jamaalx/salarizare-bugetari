/**
 * Ghid: salarii funcționari publici 2026 = ce prevede proiectul legii salarizării (Anexa VIII, administrație) pentru
 * funcționarii publici de execuție: consilier/expert, referent, pe grade profesionale și pe trepte de populație.
 * Coeficienții vin din getFunctii() (rândurile după `cod`), netul din calcBrut() (lib/tax.ts). În grila locală
 * fiecare grad are două valori de coeficient; nu stabilim aici ce le deosebește, arătăm intervalul.
 */
import { VARIANTA_IMPLICITA, getVarianta } from "../variants";
import { getFunctii } from "../variants-data";
import { aplicaGradatie, calcBrut, GRADATII, SAL_MIN_BRUT } from "../tax";
import { SITE_URL } from "../seo";
import type { Ghid } from "./tip";

const lei = (n: number) => n.toLocaleString("ro-RO");
const coefTxt = (c: number) => c.toLocaleString("ro-RO", { maximumFractionDigits: 4 });

const GRADE = ["debutant", "asistent", "principal", "superior"] as const;

/** treptele de populație din Anexa VIII, capitolul administrație locală (varianta din 20 august) */
const TREPTE = [
  { capitol: "CI A 3 (local4)", nume: "sub 10.000 de locuitori" },
  { capitol: "CI A 3 (local3)", nume: "10.001–50.000 de locuitori" },
  { capitol: "CI A 3 (local2) (2)", nume: "50.001–120.000 de locuitori" },
  { capitol: "CI A 3 (local2)", nume: "120.001–200.000 de locuitori" },
  { capitol: "CI A 3 (local1)", nume: "peste 200.000 de locuitori, consilii județene și sectoarele Bucureștiului" },
] as const;

export function ghid(): Ghid {
  const v = getVarianta(VARIANTA_IMPLICITA);
  const VR = v.valoareReferinta;
  const randuri = getFunctii(v.id).filter((e) => e.anexa === "VIII" && e.coeficient > 0);
  const baza = (c: number, g = 0) => aplicaGradatie(c * VR, g);
  const net = (b: number) => calcBrut({ salariuBaza: b, sporuri: [], valoareReferinta: VR }).salariuNet;
  const ultima = GRADATII.length - 1;

  // 1. consilier (studii superioare), pe grade, în capitolul CI A 2: un singur coeficient pe grad
  const consilier = GRADE.map((grad, i) => {
    const r = randuri.filter((e) => e.capitol === "CI_A_2" && e.cod === `81.20108002.04.${4 - i}`);
    if (r.length !== 1) throw new Error(`funcționari publici: consilier ${grad} are ${r.length} rânduri`);
    const b = baza(r[0]!.coeficient);
    return { grad, coef: r[0]!.coeficient, b, n: net(b), b5: baza(r[0]!.coeficient, ultima) };
  });

  // 2. administrație locală: consilier superior (S) și referent debutant (M), interval pe trepte
  const interval = (cod: string, capitol: string) => {
    const r = randuri.filter((e) => e.capitol === capitol && e.cod === cod);
    if (r.length === 0) throw new Error(`funcționari publici: ${cod} lipsește în ${capitol}`);
    const c = r.map((e) => e.coeficient);
    return { min: baza(Math.min(...c)), max: baza(Math.max(...c)), cMin: Math.min(...c), cMax: Math.max(...c) };
  };
  const local = TREPTE.map((t) => ({
    ...t,
    consilier: interval("81.30111002.04.1", t.capitol),
    referent: interval("81.30111004.01.4", t.capitol),
  }));

  const minim = Math.min(...consilier.map((x) => x.b), ...local.map((x) => x.referent.min));
  const maxim = Math.max(...consilier.map((x) => x.b), ...local.map((x) => x.consilier.max));
  const sup = consilier[3]!;
  const deb = consilier[0]!;
  const subMinim = [...consilier.map((x) => x.b), ...local.flatMap((x) => [x.referent.min, x.consilier.min])].filter((b) => b < SAL_MIN_BRUT).length;
  const rap5 = Math.round((sup.b5 / sup.b - 1) * 1000) / 10;

  const tabelConsilier = consilier
    .map((x) => `| Consilier, grad ${x.grad} | ${coefTxt(x.coef)} | ${lei(x.b)} | ${lei(x.n)} | ${lei(x.b5)} |`)
    .join("\n");
  const tabelLocal = local
    .map(
      (x) =>
        `| ${x.nume} | ${coefTxt(x.consilier.cMin)} – ${coefTxt(x.consilier.cMax)} | ${lei(x.consilier.min)} – ${lei(x.consilier.max)} | ${lei(x.referent.min)} – ${lei(x.referent.max)} |`,
    )
    .join("\n");

  const raspuns = `Un funcționar public de execuție (consilier, grad superior) ar avea în proiectul noii legi, varianta din ${v.eticheta}, un salariu de bază de ${lei(sup.b)} lei brut pe lună, iar un consilier debutant ${lei(deb.b)} lei. Valoarea de referință e ${lei(VR)} lei. Legea nu a fost adoptată; în 2026 salariile se plătesc pe Legea 153/2017.`;

  const corp = `## Cât ar câștiga un funcționar public pe noua lege?
Funcționarii publici sunt încadrați în Anexa VIII a proiectului (administrație). Salariul de bază = coeficientul funcției × valoarea de referință (${lei(VR)} lei în varianta din ${v.eticheta}), rotunjit în sus la leu. Pentru un consilier cu studii superioare, în capitolul CI A 2 din Anexa VIII, pe cele patru grade profesionale, în lei brut pe lună:

| Funcția | Coeficient | Salariu de bază, gradația 0 (lei brut) | Net, fără sporuri (lei) | Salariu de bază, gradația 5 (lei brut) |
|---|---|---|---|---|
${tabelConsilier}

Netul e calculat cu regulile fiscale din calculator, fără sporuri și fără deduceri personale suplimentare. Cifra din fluturaș depinde de spor, de locul de muncă și de situația personală.

> Atenție: legea nu a fost adoptată. Pe 26 august 2026 partidele au anunțat că nu au ajuns la consens și s-au angajat să adopte legea până la sfârșitul anului. Cifrele de mai jos sunt calcule din proiect, nu salarii garantate.

## Exemplu de calcul: salariul unui consilier superior
Un exemplu pas cu pas, pentru funcția de consilier, grad superior, cu studii superioare:

1. Coeficientul din grilă: ${coefTxt(sup.coef)}.
2. Salariul de bază: ${coefTxt(sup.coef)} × ${lei(VR)} lei = ${lei(sup.b)} lei brut (gradația 0).
3. Gradațiile: după 20 de ani de vechime în muncă (gradația 5), salariul de bază ajunge la ${lei(sup.b5)} lei, adică cu ${rap5.toLocaleString("ro-RO")}% mai mult.
4. Sporurile se adaugă peste, dacă funcția are dreptul la ele.
5. Din brut se scad contribuțiile și impozitul: pe baza de ${lei(sup.b)} lei, netul rezultat, fără sporuri, e ${lei(sup.n)} lei.

Regulile de calcul, pe larg, sunt în [ghidul despre salariul de bază](/ghiduri/cum-se-calculeaza-salariul-de-baza). Calculul pe funcția ta îl faci în [calculatorul de salarii](/).

## Cât diferă salariul în administrația locală, pe trepte de populație?
În administrația locală (capitolul CI A 3 din Anexa VIII) coeficienții depind de mărimea unității administrativ-teritoriale. Varianta din 20 august are 5 trepte de populație, nu 4. Tabelul arată funcția de consilier, grad superior (studii superioare), și funcția de referent debutant (studii medii); fiecare grad are în grilă două valori de coeficient, așa că arătăm intervalul dintre ele:

| Unitatea administrativ-teritorială | Coeficient, consilier superior | Salariu de bază, consilier superior (lei brut) | Salariu de bază, referent debutant (lei brut) |
|---|---|---|---|
${tabelLocal}

Nu stabilim aici ce deosebește cele două valori de pe același grad din grilă; pentru asta se citește textul oficial al proiectului, din sursele de la finalul ghidului. Grila întreagă, cu toate funcțiile, e la [Anexa VIII, administrație](/grila/administratie).

## Care sunt gradele profesionale ale funcționarilor publici?
Debutant, asistent, principal și superior sunt cele patru grade din grila de mai sus. În varianta din 20 august apar și gradele „superior 4”, „superior 3” și „superior 2” pentru funcționarii publici din administrația locală, iar coeficientul lor e puțin mai mare decât al gradului „superior”. Gradul profesional nu se confundă cu gradația: gradul schimbă coeficientul funcției, pe când gradația vine din vechimea în muncă și majorează salariul de bază cu un procent.

## Ce ține de vechime: gradațiile
Pe lângă salariul de bază din grilă, vechimea în muncă aduce până la ${ultima} gradații succesive (ultima, peste 20 de ani). La ultima, salariul de bază al consilierului superior din tabel crește de la ${lei(sup.b)} la ${lei(sup.b5)} lei brut. Gradația se calculează pe salariul de bază al funcției, nu pe salariul net.

## Ce salarii se plătesc acum, în 2026?
Până la adoptarea unei legi noi, funcționarii publici sunt plătiți pe Legea 153/2017, cu grilele și valoarea de referință în vigoare. Acest ghid nu publică salarii pe legea actuală și nu le compară cu proiectul, pentru că nu avem în date grila în vigoare. Salariul exact pe legea actuală îl găsești în decizia de încadrare sau în statul de funcții al instituției.

## Greșeli frecvente când citești grila funcționarilor publici
- **Iei brutul drept net:** coeficientul × valoarea de referință e salariul de bază brut, nu banii primiți în mână.
- **Confunzi unitatea:** în administrația locală, aceeași funcție are alt coeficient în funcție de treapta de populație.
- **Compari variante diferite:** valoarea de referință și treptele diferă între variantele din mai, iulie și august; verifică varianta din care vine cifra.
- **Uiți gradația și sporul:** grila arată gradația 0; vechimea în muncă și sporurile se adaugă peste ea.
- **Confunzi proiectul cu legea:** nicio dată de intrare în vigoare din proiect nu se aplică până nu e adoptat și promulgat.

Dacă salariul de bază din grilă iese sub salariul minim brut pe țară (${lei(SAL_MIN_BRUT)} lei), se plătește salariul minim (art. 10 alin. (8)). ${subMinim === 0 ? "Toate salariile de bază din tabelele de mai sus depășesc acest prag." : `${lei(subMinim)} dintre valorile de salariu de bază din tabelele de mai sus sunt sub această sumă.`} Vezi și panorama pe toate domeniile, în [ghidul despre salariile bugetarilor](/ghiduri/salarii-bugetari-2026), și diferențele dintre texte, în [ghidul despre cele trei variante](/ghiduri/legea-salarizarii-2026-cele-trei-variante).

> Atenție: legea nu a fost adoptată. Pe 26 august 2026 partidele au anunțat că nu au ajuns la consens și s-au angajat să adopte legea până la sfârșitul anului. Salariile de mai sus sunt calcule din proiect, nu salarii garantate.

Actualizat la 3 noiembrie 2026.`;

  return {
    slug: "salarii-functionari-publici-2026",
    categorie: "Ghid",
    titlu: "Salarii funcționari publici 2026: cât ar fi pe noua lege, pe grade",
    titluMeta: "Salarii funcționari publici 2026 pe noua lege, pe grade",
    descriere: `Salarii funcționari publici 2026 în proiectul noii legi: de la ${lei(minim)} la ${lei(maxim)} lei brut, pe grade și pe trepte de populație, cu exemplu de calcul. Neadoptat.`,
    cuvantCheie: "salarii functionari publici 2026",
    raspuns,
    peScurt: [
      `Varianta din ${v.eticheta}: un consilier debutant are ${lei(deb.b)} lei brut salariu de bază, unul superior ${lei(sup.b)} lei (administrație, capitolul CI A 2).`,
      `Salariul de bază = coeficientul × valoarea de referință (${lei(VR)} lei), rotunjit în sus; vechimea aduce gradații, sporurile se adaugă peste.`,
      "În administrația locală coeficientul depinde de treapta de populație: varianta din 20 august are 5 trepte, nu 4.",
      "Legea nu a fost adoptată; în 2026 salariile se plătesc pe Legea 153/2017.",
    ],
    publicat: "2026-11-03",
    actualizat: "2026-11-03",
    corp,
    faq: [
      {
        q: "Care sunt salariile funcționarilor publici în 2026?",
        a: `În 2026 se plătesc pe Legea 153/2017. Proiectul noii legi, neadoptat, propune în varianta din ${v.eticheta} salarii de bază de la ${lei(minim)} la ${lei(maxim)} lei brut pentru funcțiile de execuție din acest ghid, în funcție de grad și de unitate.`,
      },
      {
        q: "Cum se calculează salariul unui funcționar public pe noua lege?",
        a: `Coeficientul funcției din Anexa VIII se înmulțește cu valoarea de referință (${lei(VR)} lei) și se rotunjește în sus la leu. Se adaugă gradațiile pentru vechime, apoi sporurile; din brut se scad contribuțiile și impozitul.`,
      },
      {
        q: "Unde găsesc grila de salarizare a funcționarilor publici?",
        a: "În Anexa VIII, administrație, pe pagina grilelor a calculatorului: coeficienții pe funcții, grade și trepte de populație, în toate cele trei variante ale proiectului.",
      },
      {
        q: "Cât diferă salariul între o comună și un oraș mare?",
        a: "În grilă, coeficientul aceleiași funcții crește cu treapta de populație a unității administrativ-teritoriale. Tabelul din ghid arată intervalul pentru consilier superior și referent debutant, pe cele 5 trepte din varianta din 20 august.",
      },
      {
        q: "Care e diferența dintre grad profesional și gradație?",
        a: "Gradul profesional (debutant, asistent, principal, superior) schimbă coeficientul funcției. Gradația vine din vechimea în muncă și majorează salariul de bază cu un procent.",
      },
    ],
    surse: [
      ...v.surse.map((s) => ({ titlu: s.titlu, url: s.url.startsWith("/") ? `https://romaniatransparenta.eu/registre/salarii${s.url}` : s.url })),
      { titlu: "România Transparentă: grila de salarizare, Anexa VIII administrație", url: `${SITE_URL}/grila/administratie` },
    ],
    legaturi: [
      ["/", "Calculatorul de salarii pentru bugetari"],
      ["/grila/administratie", "Grila Anexei VIII, administrație"],
      ["/ghiduri/salarii-bugetari-2026", "Salarii bugetari 2026, pe domenii"],
      ["/ghiduri/cum-se-calculeaza-salariul-de-baza", "Cum se calculează salariul de bază"],
    ],
  };
}
