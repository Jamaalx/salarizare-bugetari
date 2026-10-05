/**
 * Ghid: salariul profesorului din învățământul preuniversitar în proiectul legii salarizării (Anexa I).
 * Rândurile se aleg după gradul didactic (debutant, definitiv, II, I) și vechimea în învățământ, se
 * potrivesc între variante pe codul funcției; salariul de bază și netul se calculează cu funcțiile
 * calculatorului (lib/tax.ts).
 */
import { VARIANTE, VARIANTA_IMPLICITA, getVarianta, type Varianta } from "../variants";
import { getFunctii, type CoefEntry } from "../variants-data";
import { aplicaGradatie, calcBrut, GRADATII, SAL_MIN_BRUT, SPORURI_STANDARD } from "../tax";
import { SITE_URL, de } from "../seo";
import type { Ghid } from "./tip";

const lei = (n: number) => n.toLocaleString("ro-RO");
const coef = (n: number) => n.toLocaleString("ro-RO", { maximumFractionDigits: 6 });

type Treapta = "debutant" | "definitiv" | "II" | "I";
const TREPTE: readonly Treapta[] = ["debutant", "definitiv", "II", "I"];
const NUME: Record<Treapta, string> = { debutant: "debutant", definitiv: "definitiv", II: "gradul didactic II", I: "gradul didactic I" };
const VECHIMI = ["până la 1 an", "1-5 ani", "5-10 ani", "10-15 ani", "15-20 ani", "20-25 ani", "peste 25 de ani"];
const vechimeText = (x: string) => x.replace(/(\d+)-(\d+)/, "$1–$2");

/** gradul didactic din denumire: „… debutant”, „… grad didactic definitiv / II / I” */
function treapta(e: CoefEntry): Treapta | null {
  if (/debutant/i.test(e.functie)) return "debutant";
  const m = e.functie.match(/grad didactic (definitiv|II|I)\b/i);
  return m ? (m[1]!.toLowerCase() === "definitiv" ? "definitiv" : (m[1]!.toUpperCase() as Treapta)) : null;
}

/** profesorii din preuniversitar (Anexa I), pe studii: S = superioare de lungă durată, SSD = de scurtă durată, M = medii */
function profesori(id: Varianta["id"], studii: "S" | "SSD" | "M"): CoefEntry[] {
  return getFunctii(id)
    .filter((e) => e.anexa === "I" && /^Profesor;/i.test(e.functie) && e.studii === studii && e.cod && e.coeficient > 0)
    .filter((e) => studii === "M" || treapta(e) !== null)
    .sort((a, b) => TREPTE.indexOf(treapta(a)!) - TREPTE.indexOf(treapta(b)!) || VECHIMI.indexOf(a.vechime) - VECHIMI.indexOf(b.vechime));
}

const baza = (e: CoefEntry, v: Varianta, g = 0) => aplicaGradatie(e.coeficient * v.valoareReferinta, g);
const net = (brut: number, v: Varianta) => calcBrut({ salariuBaza: brut, sporuri: [], valoareReferinta: v.valoareReferinta }).salariuNet;

export function ghid(): Ghid {
  const v = getVarianta(VARIANTA_IMPLICITA);
  const randuri = profesori(v.id, "S");
  const pe = (t: Treapta, vech?: string) => randuri.find((e) => treapta(e) === t && (vech === undefined || e.vechime === vech));
  for (const t of TREPTE) if (!pe(t)) throw new Error(`ghid profesor: lipsește treapta ${t} în ${v.id}`);
  if (randuri.some((e) => !VECHIMI.includes(e.vechime))) throw new Error("ghid profesor: vechime necunoscută în rânduri");

  const deb = pe("debutant")!;
  const defMin = pe("definitiv", "1-5 ani") ?? pe("definitiv")!;
  const gIMax = pe("I", "peste 25 de ani") ?? randuri.filter((e) => treapta(e) === "I").at(-1)!;
  const g5 = GRADATII.length - 1;
  const min = Math.min(...randuri.map((e) => baza(e, v)));
  const max = Math.max(...randuri.map((e) => baza(e, v)));
  const cuDeducere = randuri.filter((e) => baza(e, v) <= SAL_MIN_BRUT + 2000).length;

  const tabel = randuri
    .map((e) => `| ${NUME[treapta(e)!]} | ${vechimeText(e.vechime)} | ${coef(e.coeficient)} | ${lei(baza(e, v))} | ${lei(net(baza(e, v), v))} |`)
    .join("\n");

  const interval = (r: CoefEntry[], t: Treapta) => {
    const x = r.filter((e) => treapta(e) === t).map((e) => baza(e, v));
    if (!x.length) return "—";
    const [a, b] = [Math.min(...x), Math.max(...x)];
    return a === b ? lei(a) : `${lei(a)}–${lei(b)}`;
  };
  const ssd = profesori(v.id, "SSD");
  const tabelSsd = TREPTE.map((t) => `| ${NUME[t]} | ${interval(randuri, t)} | ${interval(ssd, t)} |`).join("\n");
  const medii = profesori(v.id, "M");
  const frazaMedii = medii.length
    ? `Pentru rândul cu studii medii (profesor, învățător, educatoare, educator-puericultor sau maistru-instructor cu studii de nivel liceal, fără pregătire de specialitate), salariul de bază merge de la ${lei(Math.min(...medii.map((e) => baza(e, v))))} la ${lei(Math.max(...medii.map((e) => baza(e, v))))} lei, după vechimea în învățământ.`
    : "";

  const grad = GRADATII.map((g) => `| ${g.nivel} | ${g.numeRange} | ${g.cota ? `+${g.cota.toLocaleString("ro-RO")}%` : "—"} | ${lei(baza(defMin, v, g.nivel))} | ${lei(net(baza(defMin, v, g.nivel), v))} |`).join("\n");

  // comparația între variante, pe cod: debutantul și câte un rând din fiecare grad didactic
  const peCod = new Map(VARIANTE.map((x) => [x.id, new Map(profesori(x.id, "S").map((e) => [e.cod, e]))]));
  const exemple = [deb, defMin, pe("II", "1-5 ani") ?? pe("II")!, pe("I", "10-15 ani") ?? pe("I")!, gIMax];
  const comparatie = exemple
    .map((e) => {
      const cel = VARIANTE.map((x) => {
        const r = peCod.get(x.id)!.get(e.cod);
        return r ? lei(baza(r, x)) : "—";
      });
      return `| ${NUME[treapta(e)!]}, ${vechimeText(e.vechime)} | ${cel.join(" | ")} |`;
    })
    .join("\n");
  const idx = VARIANTE.findIndex((x) => x.id === v.id);
  const ant = idx > 0 ? VARIANTE[idx - 1]! : null;
  const egale = ant ? randuri.filter((e) => peCod.get(ant.id)!.get(e.cod)?.coeficient === e.coeficient).length : 0;
  const frazaVariante = ant
    ? `Față de varianta din ${ant.eticheta}, ${egale === randuri.length ? "toți coeficienții profesorilor cu studii superioare de lungă durată au rămas la fel" : `${egale} din ${randuri.length} coeficienți ai profesorilor cu studii superioare de lungă durată au rămas la fel, ceilalți s-au schimbat`}, iar valoarea de referință ${ant.valoareReferinta === v.valoareReferinta ? `a rămas ${lei(v.valoareReferinta)} lei` : `a trecut de la ${lei(ant.valoareReferinta)} la ${lei(v.valoareReferinta)} lei`}. De aceea, un coeficient mai mare nu înseamnă automat un salariu mai mare: contează și valoarea de referință.`
    : "";

  // sporurile specifice învățământului preuniversitar, din calculator (Anexa I, fără cele pentru universități)
  const sporuri = SPORURI_STANDARD.filter((s) => s.aplicabilAnexe?.includes("I") && /^Anexa I art\. \d+/.test(s.descriere ?? "") && !/superior|universit/i.test(`${s.nume} ${s.descriere ?? ""}`));
  const listaSporuri = sporuri
    .map((s) => {
      const art = s.descriere?.match(/^Anexa I art\. \d+/)?.[0];
      return `- ${s.nume}${art ? ` (${art.replace("Anexa I art.", "Anexa I, art.")})` : ""}${s.inclusInPlafon20 ? "" : ": nu intră în plafonul de 20%"}.`;
    })
    .join("\n");
  if (sporuri.length === 0) throw new Error("ghid profesor: fără sporuri pentru Anexa I");

  const raspuns = `În proiectul legii salarizării din ${v.eticheta}, un profesor debutant cu studii superioare ar avea salariul de bază de ${lei(baza(deb, v))} lei brut (coeficient ${coef(deb.coeficient)} × ${lei(v.valoareReferinta)} lei), iar unul cu gradul didactic I și peste 25 de ani în învățământ ${lei(baza(gIMax, v))} lei, fără gradații și sporuri. Proiectul nu a fost adoptat.`;

  const corp = `## Cât ar fi salariul unui profesor pe noua lege?
Un profesor debutant cu studii superioare de lungă durată ar avea un salariu de bază de **${lei(baza(deb, v))} lei brut pe lună** în varianta din ${v.eticheta} a proiectului, iar un profesor cu gradul didactic I și peste 25 de ani în învățământ ar ajunge la ${lei(baza(gIMax, v))} lei, înainte de gradațiile pentru vechimea în muncă. Salariul se obține înmulțind coeficientul din grilă cu valoarea de referință de ${lei(v.valoareReferinta)} lei (${v.articolValoareReferinta}), cu rotunjire în sus la leu. Net, fără sporuri și fără persoane în întreținere, debutantul ar primi ${lei(net(baza(deb, v), v))} lei.

Cifrele sunt pentru profesorii din învățământul preuniversitar (Anexa I a proiectului), pe rândul comun „profesor; educator-puericultor; profesor-antrenor”. Cadrele didactice universitare au rânduri separate, cu alți coeficienți, pe [grila învățământului](/grila/invatamant-cercetare).

## Cât ia un profesor, după gradul didactic și vechimea în învățământ?
În grilă, rândul se alege după două lucruri: gradul didactic (debutant, definitiv, gradul II, gradul I) și vechimea în învățământ. Pentru studii superioare de lungă durată, la gradația 0, salariul de bază merge de la ${lei(min)} la ${lei(max)} lei brut:

| Gradul didactic | Vechime în învățământ | Coeficient | Salariu de bază (lei) | Net (lei) |
${tabel}

Netul e calculat cu regulile fiscale de azi: 25% CAS, 10% CASS și 10% impozit pe venit, cu deducerea personală din Codul fiscal (art. 77), fără persoane în întreținere. Deducerea personală se acordă doar până la un brut de ${lei(SAL_MIN_BRUT + 2000)} lei (salariul minim de ${lei(SAL_MIN_BRUT)} lei + 2.000 de lei), așa că ${cuDeducere === 0 ? "la toate rândurile de mai sus e zero" : `apare doar la ${cuDeducere === 1 ? "un rând" : `${cuDeducere}${de(cuDeducere)} rânduri`} din tabel`}.

## Cât ar câștiga un profesor debutant?
Profesorul debutant cu studii superioare de lungă durată are un singur rând în grilă, pentru o vechime în învățământ de până la 1 an: coeficientul ${coef(deb.coeficient)}, adică ${lei(baza(deb, v))} lei brut și ${lei(net(baza(deb, v), v))} lei net. După definitivare, rândul se schimbă: profesorul definitiv cu 1–5 ani în învățământ are coeficientul ${coef(defMin.coeficient)}, adică ${lei(baza(defMin, v))} lei brut.

## Ce se schimbă pentru studiile superioare de scurtă durată sau medii?
Profesorii cu studii superioare de scurtă durată au rânduri proprii, cu aceleași grade didactice. Intervalele de mai jos cuprind toate treptele de vechime în învățământ, la gradația 0 (debutantul are un singur rând):

| Gradul didactic | Studii superioare de lungă durată (lei) | Studii superioare de scurtă durată (lei) |
${tabelSsd}

${frazaMedii}

## Cât contează vechimea în muncă?
Pe lângă vechimea în învățământ, care alege rândul din grilă, vechimea în muncă aduce gradații aplicate succesiv peste salariul din grilă (art. 13 din proiect): +7,5% după 3 ani, apoi câte +5%, +5%, +2,5% și +2,5%. Pentru profesorul definitiv cu 1–5 ani în învățământ:

| Gradația | Vechime în muncă | Creștere | Salariu de bază (lei) | Net (lei) |
${grad}

Gradul didactic e altceva decât gradația: el schimbă rândul din grilă, deci coeficientul. Gradația vine doar din anii de muncă.

## Ce s-a schimbat între cele trei variante ale proiectului?
Ministerul Muncii a publicat trei variante: ${VARIANTE.map((x) => `${x.eticheta} (valoarea de referință ${lei(x.valoareReferinta)} lei)`).join(", ")}. Salariul de bază la gradația 0, pentru câteva rânduri de profesor cu studii superioare de lungă durată:

| Gradul didactic, vechime în învățământ | ${VARIANTE.map((x) => x.eticheta).join(" | ")} |
${comparatie}

Rândurile sunt potrivite între variante după codul funcției din grilă. ${frazaVariante}

## Ce sporuri se pot adăuga pentru un profesor?
Anexa I are sporuri specifice învățământului, pe care le poți adăuga în calculator, peste salariul de bază:

${listaSporuri}

Plafonul de 20% al sporurilor se calculează pe ordonatorul principal de credite, nu pe fiecare angajat (art. 21 alin. (2)). Indemnizația pentru titlul științific de doctor (500 de lei brut pe lună, în varianta din 20 august) nu este modelată în calculator.

## Ce se întâmplă dacă noul salariu e mai mic decât cel de acum?
Proiectul prevede o diferență salarială tranzitorie (${v.articolDiferentaTranzitorie} în varianta din ${v.eticheta}), raportată la salariul din ${v.referintaDiferentaTranzitorie}: dacă salariul pe legea nouă iese mai mic, diferența se plătește în continuare. Salariile de acum, pe Legea 153/2017, nu sunt calculate aici. Pentru salariul tău pe proiect, cu gradație, sporuri și net, folosește [calculatorul](/).

> Atenție: legea nu a fost adoptată. Pe 26 august 2026 partidele au anunțat că nu au ajuns la consens și s-au angajat să adopte legea până la sfârșitul anului. Cifrele de mai sus arată ce prevede proiectul, nu salariile în vigoare.`;

  return {
    slug: "salariu-profesor-noua-lege",
    categorie: "Ghid",
    titlu: "Cât ar câștiga un profesor pe noua lege a salarizării",
    titluMeta: "Salariu profesor 2026 pe noua lege a salarizării",
    descriere: `Salariul de bază al profesorului în proiectul din ${v.eticheta}: ${lei(min)}–${lei(max)} lei brut, pe grad didactic și vechime, cu gradații, net și variante.`,
    cuvantCheie: "salariu profesor noua lege",
    raspuns,
    peScurt: [
      `Profesor debutant cu studii superioare: ${lei(baza(deb, v))} lei brut, ${lei(net(baza(deb, v), v))} lei net fără sporuri.`,
      `Profesor definitiv cu 1–5 ani în învățământ: ${lei(baza(defMin, v))} lei brut la gradația 0.`,
      `Gradul didactic I, peste 25 de ani în învățământ: ${lei(baza(gIMax, v))} lei brut, ${lei(baza(gIMax, v, g5))} lei cu gradația maximă.`,
      "Rândul din grilă depinde de gradul didactic și de vechimea în învățământ; gradațiile vin din vechimea în muncă.",
      `Valoarea de referință din ${v.eticheta}: ${lei(v.valoareReferinta)} lei (${v.articolValoareReferinta}).`,
    ],
    publicat: "2026-09-29",
    actualizat: "2026-09-29",
    corp,
    faq: [
      {
        q: "Cât ar fi salariul unui profesor debutant pe noua lege?",
        a: `În varianta din ${v.eticheta}: ${lei(baza(deb, v))} lei brut și ${lei(net(baza(deb, v), v))} lei net pentru un debutant cu studii superioare de lungă durată, fără sporuri.`,
      },
      {
        q: "Cât câștigă un profesor cu gradul didactic I?",
        a: `Între ${lei(Math.min(...randuri.filter((e) => treapta(e) === "I").map((e) => baza(e, v))))} și ${lei(Math.max(...randuri.filter((e) => treapta(e) === "I").map((e) => baza(e, v))))} lei brut la gradația 0, după vechimea în învățământ. Cu peste 25 de ani în învățământ și gradația maximă din vechimea în muncă: ${lei(baza(gIMax, v, g5))} lei brut.`,
      },
      {
        q: "Se aplică noile salarii pentru profesori din 2026?",
        a: `Nu încă. Proiectul nu a fost adoptat. Varianta din ${v.eticheta} prevede intrarea în vigoare pe ${v.intrareInVigoareText} (${v.articolIntrareInVigoare}), dar doar dacă legea e votată și promulgată.`,
      },
      {
        q: "Care e diferența dintre vechimea în învățământ și gradație?",
        a: "Vechimea în învățământ alege rândul din grilă, împreună cu gradul didactic. Gradația vine din vechimea în muncă și crește salariul din grilă cu procentele din art. 13 al proiectului.",
      },
    ],
    surse: [
      ...v.surse.map((s) => ({ titlu: s.titlu, url: s.url.startsWith("/") ? `${SITE_URL}${s.url}` : s.url })),
      { titlu: "Anexa I, capitolul I B: reglementări specifice învățământului (doc, copie locală)", url: `${SITE_URL}/sources/Anexa-I-cap-I-B-Reglem-spec-invat-20-mai-2026.doc` },
      { titlu: "Codul fiscal, Legea 227/2015 (Portal legislativ)", url: "https://legislatie.just.ro/Public/DetaliiDocument/171282", nota: "art. 77 (deducerea personală), art. 78 (impozitul), art. 138 (CAS), art. 156 (CASS)" },
    ],
    legaturi: [
      ["/grila/invatamant-cercetare", "Grila completă a învățământului (Anexa I)"],
      ["/", "Calculatorul: salariul tău, cu gradație, sporuri și net"],
      ["/ghiduri/cum-se-calculeaza-salariul-de-baza", "Cum se calculează salariul de bază"],
    ],
  };
}
