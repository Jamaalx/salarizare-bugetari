/**
 * Ghid: salarii bugetari 2026 = ce prevede proiectul legii salarizării, pe domenii (anexe) și pe patru funcții-tip.
 * Intervalele vin din intervalAnexa() (lib/seo.ts), netul din calcBrut() (lib/tax.ts). Anexa IX (demnitari) are
 * coeficienți eșalonați 2027–2031 și nu intră în tabelul de intervale; solda de grad din Anexa VI nu e inclusă în interval.
 */
import { VARIANTE, VARIANTA_IMPLICITA, getVarianta } from "../variants";
import { getFunctii } from "../variants-data";
import { aplicaGradatie, calcBrut, GRADATII, SAL_MIN_BRUT } from "../tax";
import { GRILE, SITE_URL, intervalAnexa } from "../seo";
import type { Ghid } from "./tip";

const lei = (n: number) => n.toLocaleString("ro-RO");
const zec = (n: number) => n.toLocaleString("ro-RO", { maximumFractionDigits: 1 });

const EX = [
  { cod: "11.00501004.01.1", nume: "Profesor debutant (studii superioare de lungă durată)" },
  { cod: "11.00501003.01.6", nume: "Profesor cu grad didactic definitiv, vechime 1–5 ani" },
  { cod: "21.00201003.01.1", nume: "Medic specialist (spital de categoria a II-a)" },
  { cod: "81.20108002.04.1", nume: "Consilier, funcționar public superior (administrație)" },
] as const;

export function ghid(): Ghid {
  const v = getVarianta(VARIANTA_IMPLICITA);
  const VR = v.valoareReferinta;
  const baza = (c: number, g = 0) => aplicaGradatie(c * VR, g);
  const net = (b: number) => calcBrut({ salariuBaza: b, sporuri: [], valoareReferinta: VR }).salariuNet;

  const domenii = GRILE.filter((g) => g.anexa !== "IX").map((g) => {
    const i = intervalAnexa(g.anexa, v.id);
    if (!i) throw new Error(`salarii bugetari: anexa ${g.anexa} fără rânduri`);
    return { g, ...i };
  });
  const totalFunctii = domenii.reduce((s, d) => s + d.n, 0);
  const minim = Math.min(...domenii.map((d) => d.min));
  const maxim = Math.max(...domenii.map((d) => d.max));
  const subMinim = getFunctii(v.id).filter((e) => e.coeficient > 0 && e.coeficient * VR < SAL_MIN_BRUT).length;

  const ex = EX.map((x) => {
    const r = getFunctii(v.id).filter((e) => e.cod === x.cod && e.coeficient > 0);
    if (r.length !== 1) throw new Error(`salarii bugetari: codul ${x.cod} are ${r.length} rânduri`);
    const b = baza(r[0]!.coeficient);
    const b5 = baza(r[0]!.coeficient, GRADATII.length - 1);
    return { ...x, coef: r[0]!.coeficient, b, b5, n: net(b) };
  });

  const tabelDomenii = domenii
    .map((d) => `| Anexa ${d.g.anexa} | [${d.g.titlu}](/grila/${d.g.slug}) | ${lei(d.n)} | ${lei(d.min)} | ${lei(d.max)} |`)
    .join("\n");
  const tabelEx = ex
    .map((x) => `| ${x.nume} | ${x.coef.toLocaleString("ro-RO", { maximumFractionDigits: 4 })} | ${lei(x.b)} | ${lei(x.n)} | ${lei(x.b5)} |`)
    .join("\n");
  const g5 = GRADATII[GRADATII.length - 1]!;

  const raspuns = `Salariile bugetarilor din 2026 se plătesc în continuare pe Legea 153/2017. Proiectul noii legi, neadoptat, propune în varianta din ${v.eticheta} salarii de bază între ${lei(minim)} și ${lei(maxim)} de lei brut lunar, în funcție de domeniu și funcție, calculate cu o valoare de referință de ${lei(VR)} lei. Mai jos: cifrele pe domenii și pe patru funcții.`;

  const corp = `## Cât ar fi salariile bugetarilor pe noua lege?
Proiectul legii salarizării, în varianta din ${v.eticheta}, are ${lei(totalFunctii)} de funcții cu coeficient în grilele a opt anexe. Salariul de bază al fiecărei funcții, la gradația 0, se obține înmulțind coeficientul cu valoarea de referință (${lei(VR)} lei). Intervalele pe domenii, în lei brut pe lună:

| Anexa | Domeniul | Funcții în grilă | Cel mai mic salariu de bază | Cel mai mare salariu de bază |
|---|---|---|---|---|
${tabelDomenii}

Intervalele sunt late pentru că fiecare anexă cuprinde de la funcții de execuție, fără studii superioare, până la funcții de conducere. Pentru Anexa VI (militari, polițiști, penitenciare) sunt luate în calcul doar solda de funcție, fără solda de grad, care se adaugă separat. Funcțiile de demnitate publică (Anexa IX) nu sunt în tabel: au coeficienți eșalonați pe ani, 2027–2031, și se tratează separat în [grila demnitarilor](/grila/demnitate-publica).

> Atenție: legea nu a fost adoptată. Pe 26 august 2026 partidele au anunțat că nu au ajuns la consens și s-au angajat să adopte legea până la sfârșitul anului. Cifrele din acest ghid arată ce prevede proiectul, nu ce se plătește azi.

## Ce salarii se plătesc acum, în 2026?
Până la adoptarea unei legi noi, bugetarii sunt plătiți pe Legea 153/2017, cu grilele și valoarea de referință în vigoare. Acest ghid nu publică salarii pe legea actuală: nu le calculăm și nu le comparăm cu proiectul, pentru că nu avem în date grila în vigoare. Pentru o cifră exactă pe legea actuală, singura sursă sigură este statul de funcții al instituției sau decizia de salarizare primită de angajat.

## Cum se calculează salariul unui bugetar?
Formula din proiect are trei pași. Întâi, salariul de bază: coeficientul funcției înmulțit cu valoarea de referință, rotunjit în sus la leu. Apoi vechimea în muncă aduce gradații, care se aplică succesiv: după 20 de ani, salariul de bază e mai mare cu ${zec((aplicaGradatie(1000000, GRADATII.length - 1) / aplicaGradatie(1000000, 0) - 1) * 100)}% față de gradația 0 (+${zec(g5.cota)}% la ultima treaptă). În sfârșit, se adaugă sporurile, iar din brutul rezultat se scad contribuțiile și impozitul pentru a ajunge la net. Pașii, cu exemple, sunt în [ghidul despre calculul salariului de bază](/ghiduri/cum-se-calculeaza-salariul-de-baza).

Dacă salariul de bază iese sub salariul minim brut pe țară (${lei(SAL_MIN_BRUT)} lei), se plătește salariul minim (art. 10 alin. (8)). În varianta din ${v.eticheta}, ${lei(subMinim)} de funcții din grilă au coeficient × ${lei(VR)} sub această sumă, deci intervalele de mai sus încep uneori sub salariul minim, dar banii plătiți nu pot coborî sub el. Salariul minim din 2027 nu este încă stabilit.

## Cât câștigă, concret, patru bugetari-tip?
Patru funcții din domenii diferite, urmărite pe codul din grilă. Salariul de bază la gradația 0, netul pe baza lui (fără sporuri) și salariul de bază după 20 de ani de vechime în muncă:

| Funcția | Coeficient | Salariu de bază, gradația 0 (lei brut) | Net, fără sporuri (lei) | Salariu de bază, gradația 5 (lei brut) |
|---|---|---|---|---|
${tabelEx}

Netul din tabel este calculat cu regulile fiscale din calculator, fără sporuri și fără deduceri personale suplimentare. Cifra reală din fluturaș depinde de spor, de locul de muncă și de situația personală.

## Cum aflu salariul pentru funcția mea?
Cel mai direct: [calculatorul de salarii pentru bugetari](/). Alegi varianta proiectului, funcția, gradația și sporurile, iar calculatorul arată brutul și netul. Dacă vrei să vezi toată grila, cu coeficienți, pe domenii, folosește [grila de salarizare](/grila). Ghiduri pe funcții: [profesor](/ghiduri/salariu-profesor-noua-lege), [asistent medical](/ghiduri/salariu-asistent-medical-noua-lege), [medic rezident](/ghiduri/salariu-medic-rezident).

Pentru funcționarii publici de execuție (inspector, consilier, referent) grila este în [Anexa VIII, administrație](/grila/administratie). În varianta din 20 august, administrația locală are 5 trepte de populație în loc de 4, iar funcționarii publici primesc gradele noi „superior 4/3/2”.

## Care variantă a proiectului e cea bună?
Există trei variante publicate de minister, din 25 mai, 17 iulie și 20 august 2026. Valorile de referință diferă: ${VARIANTE.map((x) => `${lei(x.valoareReferinta)} lei (${x.eticheta})`).join(", ")}. Acest ghid folosește varianta din ${v.eticheta}, cea mai recentă. Diferențele dintre texte, pe anexe, sunt în [ghidul despre cele trei variante](/ghiduri/legea-salarizarii-2026-cele-trei-variante).

Pentru sănătate, varianta din 20 august calculează coeficienții pentru unitățile de categoria a II-a; cele 6 categorii și factorii pe grupe se stabilesc prin hotărâre de guvern și nu pot fi calculați. Cifrele din Anexa II sunt deci doar pentru acea categorie.

## Greșeli frecvente când citești salariile bugetarilor
- **Iei brutul drept net:** coeficientul înmulțit cu valoarea de referință dă salariul de bază brut, nu banii primiți în mână.
- **Compari variante diferite:** o cifră din știri poate fi din mai, din iulie sau din august; verifică valoarea de referință.
- **Uiți gradația și sporul:** grila arată gradația 0; vechimea în muncă și sporurile se adaugă peste ea.
- **Confunzi proiectul cu legea:** nicio dată de intrare în vigoare din proiect nu se aplică până nu e adoptat și promulgat.

> Atenție: legea nu a fost adoptată. Pe 26 august 2026 partidele au anunțat că nu au ajuns la consens și s-au angajat să adopte legea până la sfârșitul anului. Salariile de mai sus sunt calcule din proiect, nu salarii garantate.

Actualizat la 23 octombrie 2026.`;

  return {
    slug: "salarii-bugetari-2026",
    categorie: "Ghid",
    titlu: "Salarii bugetari 2026: cât ar fi pe noua lege, pe domenii",
    titluMeta: "Salarii bugetari 2026 pe noua lege, pe domenii",
    descriere: `Salarii bugetari 2026 în proiectul noii legi: de la ${lei(minim)} la ${lei(maxim)} lei brut, pe domenii și pe patru funcții, cu net calculat. Proiectul nu a fost adoptat.`,
    cuvantCheie: "salarii bugetari",
    raspuns,
    peScurt: [
      `Varianta din ${v.eticheta} a proiectului: salarii de bază între ${lei(minim)} și ${lei(maxim)} de lei brut, pe ${lei(totalFunctii)} de funcții din opt anexe.`,
      `Salariul de bază = coeficientul funcției × valoarea de referință (${lei(VR)} lei), rotunjit în sus; vechimea aduce gradații, iar sporurile se adaugă peste.`,
      `Sub salariul minim brut (${lei(SAL_MIN_BRUT)} lei) nu se plătește: se acordă salariul minim.`,
      "Legea nu a fost adoptată; în 2026 salariile se plătesc pe Legea 153/2017.",
    ],
    publicat: "2026-10-23",
    actualizat: "2026-10-23",
    corp,
    faq: [
      {
        q: "Care sunt salariile bugetarilor în 2026?",
        a: `În 2026 se plătesc pe Legea 153/2017. Proiectul noii legi, neadoptat, propune în varianta din ${v.eticheta} salarii de bază între ${lei(minim)} și ${lei(maxim)} de lei brut, în funcție de domeniu și funcție.`,
      },
      {
        q: "Cum se calculează salariul unui bugetar pe noua lege?",
        a: "Coeficientul funcției din grilă se înmulțește cu valoarea de referință și se rotunjește în sus la leu. Se adaugă gradațiile pentru vechimea în muncă, apoi sporurile; din brut se scad contribuțiile și impozitul pentru net.",
      },
      {
        q: "Care e valoarea de referință din proiect?",
        a: `În varianta din ${v.eticheta} este ${lei(VR)} lei (${v.articolValoareReferinta}), pentru ${v.perioadaValoareReferinta}. În variantele din mai și iulie era 4.100 lei.`,
      },
      {
        q: "Unde găsesc grila de salarizare a bugetarilor?",
        a: `Pe pagina grilelor a calculatorului, împărțită pe cele nouă anexe: ${GRILE.map((g) => `Anexa ${g.anexa}`).join(", ")}. Fiecare anexă arată coeficienții și salariile de bază pe funcții.`,
      },
      {
        q: "Există un salariu minim special pentru bugetari?",
        a: `Nu există un salariu minim separat pentru bugetari. Dacă salariul de bază din grilă iese sub salariul minim brut pe țară (${lei(SAL_MIN_BRUT)} lei), se plătește salariul minim (art. 10 alin. (8)).`,
      },
    ],
    surse: [
      ...v.surse.map((s) => ({ titlu: s.titlu, url: s.url.startsWith("/") ? `https://romaniatransparenta.eu/registre/salarii${s.url}` : s.url })),
      { titlu: "România Transparentă: grila de salarizare, pe anexe", url: `${SITE_URL}/grila` },
    ],
    legaturi: [
      ["/", "Calculatorul de salarii pentru bugetari"],
      ["/grila", "Grila de salarizare, pe toate anexele"],
      ["/ghiduri/cum-se-calculeaza-salariul-de-baza", "Cum se calculează salariul de bază"],
      ["/ghiduri/legea-salarizarii-2026-cele-trei-variante", "Cele trei variante ale proiectului"],
    ],
  };
}
