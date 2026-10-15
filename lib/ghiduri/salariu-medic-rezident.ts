/**
 * Ghid: salariul medicului rezident în proiectul legii salarizării (Anexa II, cap. I, unități sanitare),
 * pe ani de rezidențiat. În 20 august anul de rezidențiat e în câmpul `grad`, înainte în denumire; rândurile
 * se potrivesc între variante pe cod (anul V din 20 august n-are cod: înainte, anii IV și V erau pe un singur
 * rând). Nota *1) (se aplică și medicilor dentiști rezidenți) și nota 1 (gradația 0, art. 13) sunt verificate
 * în public/sources/Proiect-COEFICIENTI-1-8-20-august-2026.xlsx (foaia „II CI 2”).
 */
import { VARIANTE, VARIANTA_IMPLICITA, getVarianta, type Varianta } from "../variants";
import { getFunctii, type CoefEntry } from "../variants-data";
import { aplicaGradatie, calcBrut, GRADATII, SAL_MIN_BRUT } from "../tax";
import { SITE_URL, de } from "../seo";
import type { Ghid } from "./tip";

const lei = (n: number) => n.toLocaleString("ro-RO");
const coef = (n: number) => n.toLocaleString("ro-RO", { maximumFractionDigits: 6 });
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];

const randuri = (id: Varianta["id"]) => getFunctii(id).filter((e) => e.anexa === "II" && e.capitol === "CI 2" && e.coeficient > 0);
/** anul de rezidențiat din rând („anul IV-V” → „IV-V”), din grad (aug.) sau din denumire (mai, iul.) */
const anul = (e: CoefEntry) => `${e.functie} ${e.grad}`.match(/anul\s+([IVX]+(?:\s*-\s*[IVX]+)?)/i)?.[1]?.replace(/\s/g, "") ?? "";
const primulAn = (a: string) => ROMAN.indexOf(a.split("-")[0]!);
/** medicii rezidenți (fără „dentist” în denumire: în aug. nota *1) îi acoperă pe amândoi) */
const rezidenti = (id: Varianta["id"]) =>
  randuri(id)
    .filter((e) => /^Medic rezident/i.test(e.functie) && anul(e))
    .sort((a, b) => primulAn(anul(a)) - primulAn(anul(b)));
const farmacisti = (id: Varianta["id"]) =>
  randuri(id)
    .filter((e) => /^Farmacist rezident/i.test(e.functie) && anul(e))
    .sort((a, b) => primulAn(anul(a)) - primulAn(anul(b)));
/** medicul după rezidențiat: primar, specialist, fără grad (pe cod, stabil între variante) */
const MEDIC = [
  { cod: "21.00201014.01.1", nume: "medic (fără grad)" },
  { cod: "21.00201003.01.1", nume: "medic specialist" },
  { cod: "21.00201001.01.1", nume: "medic primar" },
] as const;

const baza = (c: number, v: Varianta, g = 0) => aplicaGradatie(c * v.valoareReferinta, g);
const net = (brut: number, v: Varianta) => calcBrut({ salariuBaza: brut, sporuri: [], valoareReferinta: v.valoareReferinta }).salariuNet;

export function ghid(): Ghid {
  const v = getVarianta(VARIANTA_IMPLICITA);
  const rez = rezidenti(v.id);
  if (rez.length < 5) throw new Error(`ghid medic rezident: doar ${rez.length} rânduri în ${v.id}`);
  const r1 = rez[0]!;
  const rUltim = rez.at(-1)!;
  if (primulAn(anul(r1)) !== 0) throw new Error("ghid medic rezident: lipsește anul I");
  const b1 = baza(r1.coeficient, v);
  const n1 = net(b1, v);
  const bU = baza(rUltim.coeficient, v);
  const nU = net(bU, v);
  const gMax = GRADATII.length - 1;
  const pragDeducere = SAL_MIN_BRUT + 2000;
  const cuDeducere = rez.filter((e) => baza(e.coeficient, v) <= pragDeducere).length;
  const subMinim = rez.filter((e) => baza(e.coeficient, v) < SAL_MIN_BRUT).length;

  const tabel = rez
    .map((e) => `| Anul ${anul(e)} | ${coef(e.coeficient)} | ${lei(baza(e.coeficient, v))} | ${lei(net(baza(e.coeficient, v), v))} |`)
    .join("\n");

  // diferența de la an la an
  const pasi = rez.slice(1).map((e, i) => baza(e.coeficient, v) - baza(rez[i]!.coeficient, v));
  const pasMin = Math.min(...pasi);
  const pasMax = Math.max(...pasi);
  const crescator = pasi.every((p) => p > 0);

  // medicul după rezidențiat
  const medici = MEDIC.map((m) => ({ m, e: randuri(v.id).find((e) => e.cod === m.cod) }));
  if (medici.some((x) => !x.e)) throw new Error(`ghid medic rezident: lipsește un rând de medic în ${v.id}`);
  const [mFara, mSpec, mPrimar] = medici.map((x) => x.e!) as [CoefEntry, CoefEntry, CoefEntry];
  const tabelMedici = medici.map(({ m, e }) => `| ${m.nume[0]!.toUpperCase()}${m.nume.slice(1)} | ${coef(e!.coeficient)} | ${lei(baza(e!.coeficient, v))} |`).join("\n");

  // gradațiile, pe rezidentul din anul I
  const grad = GRADATII.map((g) => `| ${g.nivel} | ${g.numeRange} | ${g.cota ? `+${g.cota.toLocaleString("ro-RO")}%` : "—"} | ${lei(baza(r1.coeficient, v, g.nivel))} | ${lei(net(baza(r1.coeficient, v, g.nivel), v))} |`).join("\n");

  // comparația între variante, pe cod
  const cuCod = rez.filter((e) => e.cod);
  const faraCod = rez.filter((e) => !e.cod);
  const comparatie = cuCod
    .map((e) => {
      const cel = VARIANTE.map((x) => {
        const r = rezidenti(x.id).find((y) => y.cod === e.cod);
        return r ? `${lei(baza(r.coeficient, x))} (anul ${anul(r)})` : "—";
      });
      return `| Anul ${anul(e)} | ${cel.join(" | ")} |`;
    })
    .join("\n");
  const idx = VARIANTE.findIndex((x) => x.id === v.id);
  const ant = idx > 0 ? VARIANTE[idx - 1]! : null;
  const egale = ant ? cuCod.filter((e) => rezidenti(ant.id).find((y) => y.cod === e.cod)?.coeficient === e.coeficient).length : 0;
  const scazute = ant ? cuCod.filter((e) => {
    const r = rezidenti(ant.id).find((y) => y.cod === e.cod);
    return r && baza(r.coeficient, ant) > baza(e.coeficient, v);
  }) : [];
  const frazaVariante = ant
    ? `Față de varianta din ${ant.eticheta}, ${egale === cuCod.length ? "toți coeficienții rezidenților potriviți pe cod au rămas la fel" : `${egale} din ${cuCod.length} coeficienți potriviți pe cod au rămas la fel`}, iar valoarea de referință ${ant.valoareReferinta === v.valoareReferinta ? `a rămas ${lei(v.valoareReferinta)} lei` : `a trecut de la ${lei(ant.valoareReferinta)} la ${lei(v.valoareReferinta)} lei`}. ${scazute.length === 0 ? `Niciun an din tabel nu are un salariu de bază mai mic decât în ${ant.eticheta}.` : `Rezultatul: ${scazute.length === cuCod.length ? `la toți cei ${cuCod.length} ani din tabel` : `la ${scazute.length === 1 ? "un an" : `${scazute.length}${de(scazute.length)} ani`} de rezidențiat din ${cuCod.length} (${scazute.map((e) => `anul ${anul(e)}`).join(", ")})`}, salariul de bază din varianta din ${v.eticheta} e mai mic decât în cea din ${ant.eticheta}.`}`
    : "";
  const frazaFaraCod =
    faraCod.length > 0
      ? ` În varianta din ${v.eticheta}, ${faraCod.map((e) => `anul ${anul(e)} (coeficient ${coef(e.coeficient)}, ${lei(baza(e.coeficient, v))} lei)`).join(", ")} ${faraCod.length === 1 ? "nu are cod de funcție" : "nu au cod de funcție"} în grilă, așa că nu ${faraCod.length === 1 ? "apare" : "apar"} în tabel; în variantele anterioare, anii IV și V erau pe un singur rând.`
      : "";

  // farmaciștii rezidenți
  const farm = farmacisti(v.id);
  if (farm.length < 3) throw new Error(`ghid medic rezident: lipsesc farmaciștii rezidenți în ${v.id}`);
  const tabelFarm = farm.map((e) => `| Anul ${anul(e)} | ${coef(e.coeficient)} | ${lei(baza(e.coeficient, v))} | ${lei(net(baza(e.coeficient, v), v))} |`).join("\n");

  const raspuns = `În proiectul legii salarizării din ${v.eticheta}, un medic rezident ar avea salariul de bază de ${lei(b1)} lei brut în anul I (${lei(n1)} lei net) și ${lei(bU)} lei brut în anul ${anul(rUltim)}, la gradația 0, fără gărzi și sporuri, într-un spital de categoria a II-a. Proiectul nu a fost adoptat.`;

  const corp = `## Cât ar fi salariul unui medic rezident pe noua lege?
Un medic rezident în anul I ar avea un salariu de bază de **${lei(b1)} lei brut pe lună** în varianta din ${v.eticheta} a proiectului, adică ${lei(n1)} lei net fără sporuri și fără persoane în întreținere. Suma vine din coeficientul ${coef(r1.coeficient)} înmulțit cu valoarea de referință de ${lei(v.valoareReferinta)} lei (${v.articolValoareReferinta}), cu rotunjire în sus la leu (art. 10 alin. (4) din proiect).

În ultimul an de rezidențiat din grilă, anul ${anul(rUltim)}, salariul de bază ar fi de ${lei(bU)} lei brut (${lei(nU)} lei net). Cifrele sunt la gradația 0, fără gărzi, fără sporuri și fără gradațiile din vechimea în muncă.

## Unde stau rezidenții în grilă?
Medicii rezidenți sunt în Anexa II a proiectului (familia ocupațională „Sănătate și asistență socială”), capitolul I, la personalul de specialitate medico-sanitar din unitățile sanitare. În varianta din ${v.eticheta}, rezidenții au câte un rând pentru fiecare an de rezidențiat, iar nota *1) de sub grilă precizează că aceiași coeficienți se aplică și medicilor rezidenți din medicina dentară.

**Important:** în varianta din 20 august, coeficienții din grilă sunt cei pentru unitățile sanitare de **categoria a II-a**. Proiectul împarte unitățile în 6 categorii și adaugă factori de multiplicare pe grupe de personal (minimum 8%, 6%, 4% și 2%), stabiliți anual prin hotărâre de guvern. Până la acea hotărâre, salariul unui rezident dintr-un spital de altă categorie nu poate fi calculat: cifrele de aici sunt pentru categoria a II-a.

## Cât ia un rezident în fiecare an de rezidențiat?
Salariul de bază la gradația 0 și netul, varianta din ${v.eticheta}:

| Anul de rezidențiat | Coeficient | Salariu de bază (lei) | Net (lei) |
${tabel}

${crescator ? `Salariul crește în fiecare an de rezidențiat, cu ${pasMin === pasMax ? `${lei(pasMin)}${de(pasMin)} lei` : `${lei(pasMin)}–${lei(pasMax)}${de(pasMax)} lei`} brut de la un an la altul.` : "Coeficienții publicați nu cresc în fiecare an; tabelul îi reproduce, nu îi corectează."} ${subMinim === 0 ? `Toate rândurile sunt peste salariul minim brut de ${lei(SAL_MIN_BRUT)} lei.` : `${subMinim === 1 ? "Un rând e" : `${subMinim}${de(subMinim)} rânduri sunt`} sub salariul minim brut de ${lei(SAL_MIN_BRUT)} lei; acolo se plătește salariul minim (art. 10 alin. (8)).`}

## Cât ar câștiga după rezidențiat?
După confirmare, medicul trece pe rândurile de medic din aceeași grilă: fără grad, specialist sau primar. Salariul de bază la gradația 0, în varianta din ${v.eticheta}:

| Funcția | Coeficient | Salariu de bază (lei) |
${tabelMedici}

Un medic specialist ar avea deci ${lei(baza(mSpec.coeficient, v))} lei brut, cu ${lei(baza(mSpec.coeficient, v) - bU)}${de(baza(mSpec.coeficient, v) - bU)} lei mai mult decât un rezident în anul ${anul(rUltim)}. Gradul de medic primar urcă salariul de bază la ${lei(baza(mPrimar.coeficient, v))} lei, iar medicul fără grad ar avea ${lei(baza(mFara.coeficient, v))} lei. Toate rândurile sunt pe [grila sănătății](/grila/sanatate-asistenta-sociala).

## Cât contează vechimea în muncă?
Nota 1 de sub grilă spune că acești coeficienți sunt pentru gradația 0, iar salariile pentru gradațiile 1–5 se obțin prin majorare potrivit art. 13 din proiect. Gradația vine din vechimea în muncă, nu din anul de rezidențiat: +7,5% după 3 ani, apoi câte +5%, +5%, +2,5% și +2,5%. Pentru un rezident în anul I:

| Gradația | Vechime în muncă | Creștere | Salariu de bază (lei) | Net (lei) |
${grad}

Cu gradația maximă, un rezident în anul ${anul(rUltim)} ar ajunge la ${lei(baza(rUltim.coeficient, v, gMax))} lei brut. Anul de rezidențiat schimbă coeficientul din grilă; vechimea în muncă adaugă gradația peste el.

## Cât ar fi netul?
Netul din tabele folosește regulile fiscale de azi: 25% CAS, 10% CASS și 10% impozit pe venit, fără persoane în întreținere. Deducerea personală (art. 77 din Codul fiscal) se acordă doar până la un brut de ${lei(pragDeducere)} lei (salariul minim + 2.000 de lei). ${cuDeducere === 0 ? "Toți rezidenții sunt peste acest prag, așa că netul nu depinde de persoanele în întreținere." : `${cuDeducere === 1 ? "Un an de rezidențiat e" : `${cuDeducere}${de(cuDeducere)} ani de rezidențiat sunt`} sub acest prag; acolo netul depinde și de persoanele în întreținere.`} Pentru un calcul cu sporurile tale, folosește [calculatorul](/).

## Ce s-a schimbat între cele trei variante ale proiectului?
Ministerul Muncii a publicat trei variante: ${VARIANTE.map((x) => `${x.eticheta} (valoarea de referință ${lei(x.valoareReferinta)} lei)`).join(", ")}. Salariul de bază la gradația 0, cu anul de rezidențiat din fiecare variantă în paranteză:

| Anul (${v.eticheta}) | ${VARIANTE.map((x) => x.eticheta).join(" | ")} |
${comparatie}

Rândurile sunt potrivite între variante după codul funcției din grilă.${frazaFaraCod} ${frazaVariante}

## Ce primesc farmaciștii rezidenți?
Farmaciștii rezidenți au rânduri separate în aceeași grilă, pe trei ani. Varianta din ${v.eticheta}:

| Anul de rezidențiat | Coeficient | Salariu de bază (lei) | Net (lei) |
${tabelFarm}

## Ce se adaugă peste salariul de bază?
Gărzile și sporurile specifice sănătății sunt în Anexa II, capitolul II. Gărzile pentru completarea normei se plătesc la tariful orar al salariului de bază, iar gărzile peste norma legală se fac prin contract separat. Pe lângă ele: munca în trei ture (10%, în afara plafonului), orele din weekend și de sărbători (+10% din tariful orar), sporurile pentru condiții de muncă și sporul pentru radiații, pe categorii. Le poți adăuga pe cele pe care le ai în [calculator](/), cu orele tale de gardă.

Plafonul de 20% al sporurilor se calculează pe ordonatorul principal de credite, nu pe fiecare angajat (art. 21 alin. (2)). Dacă salariul pe legea nouă ar ieși mai mic decât cel de acum, proiectul prevede o diferență salarială tranzitorie (${v.articolDiferentaTranzitorie} în varianta din ${v.eticheta}), raportată la salariul din ${v.referintaDiferentaTranzitorie}. Salariile plătite azi în spitale, pe Legea 153/2017, sunt pe [romaniatransparenta.eu/registre/spitale/salarii](https://romaniatransparenta.eu/registre/spitale/salarii); pentru asistenți, vezi [ghidul asistentului medical](/ghiduri/salariu-asistent-medical-noua-lege).

> Atenție: legea nu a fost adoptată. Pe 26 august 2026 partidele au anunțat că nu au ajuns la consens și s-au angajat să adopte legea până la sfârșitul anului. Cifrele de mai sus arată ce prevede proiectul, nu salariile în vigoare.`;

  return {
    slug: "salariu-medic-rezident",
    categorie: "Ghid",
    titlu: "Cât ar câștiga un medic rezident pe noua lege, pe ani de rezidențiat",
    titluMeta: "Salariu medic rezident pe noua lege, pe ani de rezidențiat",
    descriere: `Salariul medicului rezident în proiectul din ${v.eticheta}: de la ${lei(b1)} lei brut în anul I la ${lei(bU)} lei în anul ${anul(rUltim)}, cu net, gradații și variante.`,
    cuvantCheie: "salariu medic rezident noua lege",
    raspuns,
    peScurt: [
      `Rezident anul I: ${lei(b1)} lei brut, ${lei(n1)} lei net fără gărzi și sporuri.`,
      `Rezident anul ${anul(rUltim)}: ${lei(bU)} lei brut, ${lei(nU)} lei net.`,
      `După rezidențiat: medic specialist ${lei(baza(mSpec.coeficient, v))} lei, medic primar ${lei(baza(mPrimar.coeficient, v))} lei brut.`,
      `Coeficienții din ${v.eticheta} sunt pentru spitalele de categoria a II-a; celelalte categorii depind de o hotărâre de guvern.`,
      `Valoarea de referință din ${v.eticheta}: ${lei(v.valoareReferinta)} lei (${v.articolValoareReferinta}).`,
    ],
    publicat: "2026-10-16",
    actualizat: "2026-10-16",
    autor: { nume: "Alex Mantello", url: "https://alexandru.zed-zen.com" },
    corp,
    faq: [
      {
        q: "Cât ar câștiga net un medic rezident în anul I pe noua lege?",
        a: `În varianta din ${v.eticheta}: ${lei(n1)} lei net, din ${lei(b1)} lei brut, fără gărzi, fără sporuri și fără gradații, într-un spital de categoria a II-a.`,
      },
      {
        q: "Medicii dentiști rezidenți au aceeași grilă?",
        a: `Da. În varianta din ${v.eticheta}, nota *1) de sub grilă spune că rândurile de medic rezident se aplică și medicilor rezidenți din medicina dentară. În variantele din 25 mai și 17 iulie aveau rânduri separate.`,
      },
      {
        q: "Se pot calcula salariile rezidenților din spitalele de altă categorie?",
        a: "Nu încă. Coeficienții din varianta din 20 august sunt pentru unitățile de categoria a II-a. Cele 6 categorii și factorii de multiplicare pe grupe se stabilesc prin hotărâre de guvern, care nu există.",
      },
      {
        q: "De când s-ar aplica noile salarii pentru rezidenți?",
        a: `Nu încă. Proiectul nu a fost adoptat. Varianta din ${v.eticheta} prevede intrarea în vigoare pe ${v.intrareInVigoareText} (${v.articolIntrareInVigoare}), dar doar dacă legea e votată și promulgată.`,
      },
      {
        q: "Gărzile intră în salariul din tabel?",
        a: "Nu. Tabelele arată salariul de bază din grilă. Gărzile se plătesc separat, la tariful orar al salariului de bază, după regulile din Anexa II; în calculator le poți adăuga cu orele tale.",
      },
    ],
    surse: [
      ...v.surse.map((s) => ({ titlu: s.titlu, url: s.url.startsWith("/") ? `${SITE_URL}${s.url}` : s.url })),
      { titlu: "Anexa II, capitolul II: reglementări specifice sănătății (docx, copie locală)", url: `${SITE_URL}/sources/ANEXA-II-Cap-II-REGLEMENTARI-specifice-varianta-20-mai-2026.docx` },
      { titlu: "Codul fiscal, Legea 227/2015 (Portal legislativ)", url: "https://legislatie.just.ro/Public/DetaliiDocument/171282", nota: "art. 77 (deducerea personală), art. 78 (impozitul), art. 138 (CAS), art. 156 (CASS)" },
    ],
    legaturi: [
      ["/grila/sanatate-asistenta-sociala", "Grila completă a sănătății (Anexa II)"],
      ["/", "Calculatorul: salariul tău, cu gradație, gărzi, sporuri și net"],
      ["/ghiduri/salariu-asistent-medical-noua-lege", "Cât ar câștiga un asistent medical pe noua lege"],
    ],
  };
}
