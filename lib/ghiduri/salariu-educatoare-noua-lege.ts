/**
 * Ghid: salariul educatoarei în proiectul legii salarizării (Anexa I). Rândurile sunt cele pe care grila
 * le numește „învățător; educatoare; educator-puericultor; maistru-instructor (cu studii de nivel liceal)”,
 * pe gradul didactic (debutant, definitiv, II, I) și vechimea în învățământ, plus rândul fără pregătire de
 * specialitate; se potrivesc între variante pe codul funcției, iar salariul de bază și netul se calculează
 * cu funcțiile calculatorului (lib/tax.ts).
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

const areEducatoare = (e: CoefEntry) => e.anexa === "I" && /educatoare/i.test(e.functie) && e.studii === "M" && !!e.cod && e.coeficient > 0;
const faraSpecialitate = (e: CoefEntry) => /fără pregătire de specialitate/i.test(e.functie);

/** rândurile educatoarei calificate (studii de nivel liceal), pe grad didactic și vechime în învățământ */
function educatoare(id: Varianta["id"]): CoefEntry[] {
  return getFunctii(id)
    .filter((e) => areEducatoare(e) && !faraSpecialitate(e) && treapta(e) !== null)
    .sort((a, b) => TREPTE.indexOf(treapta(a)!) - TREPTE.indexOf(treapta(b)!) || VECHIMI.indexOf(a.vechime) - VECHIMI.indexOf(b.vechime));
}

/** rândul „profesor; învățător; educatoare; …” cu studii de nivel liceal, fără pregătire de specialitate */
function necalificate(id: Varianta["id"]): CoefEntry[] {
  return getFunctii(id)
    .filter((e) => areEducatoare(e) && faraSpecialitate(e))
    .sort((a, b) => VECHIMI.indexOf(a.vechime) - VECHIMI.indexOf(b.vechime));
}

const baza = (e: CoefEntry, v: Varianta, g = 0) => aplicaGradatie(e.coeficient * v.valoareReferinta, g);
const net = (brut: number, v: Varianta) => calcBrut({ salariuBaza: brut, sporuri: [], valoareReferinta: v.valoareReferinta }).salariuNet;

export function ghid(): Ghid {
  const v = getVarianta(VARIANTA_IMPLICITA);
  const randuri = educatoare(v.id);
  const pe = (t: Treapta, vech?: string) => randuri.find((e) => treapta(e) === t && (vech === undefined || e.vechime === vech));
  for (const t of TREPTE) if (!pe(t)) throw new Error(`ghid educatoare: lipsește treapta ${t} în ${v.id}`);
  if (randuri.some((e) => !VECHIMI.includes(e.vechime))) throw new Error("ghid educatoare: vechime necunoscută în rânduri");
  const nec = necalificate(v.id);
  if (nec.length === 0) throw new Error("ghid educatoare: lipsește rândul fără pregătire de specialitate");

  const deb = pe("debutant")!;
  const def15 = pe("definitiv", "1-5 ani") ?? pe("definitiv")!;
  const gIMax = pe("I", "peste 25 de ani") ?? randuri.filter((e) => treapta(e) === "I").at(-1)!;
  const gMax = GRADATII.length - 1;
  const bDeb = baza(deb, v);
  const nDeb = net(bDeb, v);
  const bDef = baza(def15, v);
  const bIMax = baza(gIMax, v);
  const min = Math.min(...randuri.map((e) => baza(e, v)));
  const max = Math.max(...randuri.map((e) => baza(e, v)));
  const subMinim = randuri.filter((e) => baza(e, v) < SAL_MIN_BRUT).length;
  const pragDeducere = SAL_MIN_BRUT + 2000;
  const cuDeducere = randuri.filter((e) => baza(e, v) <= pragDeducere).length;

  // matricea: vechimea în învățământ pe rânduri, gradul didactic pe coloane
  const vechimiFolosite = VECHIMI.filter((x) => randuri.some((e) => e.vechime === x));
  const matrice = vechimiFolosite
    .map((x) => `| ${vechimeText(x)} | ${TREPTE.map((t) => { const e = pe(t, x); return e ? lei(baza(e, v)) : "—"; }).join(" | ")} |`)
    .join("\n");

  // unde un grad didactic mai mare are, la aceeași vechime, un coeficient mai mic decât gradul de sub el
  const inversiuni: string[] = [];
  for (const x of vechimiFolosite)
    for (let i = 1; i < TREPTE.length; i++) {
      const jos = pe(TREPTE[i - 1]!, x);
      const sus = pe(TREPTE[i]!, x);
      if (jos && sus && sus.coeficient < jos.coeficient)
        inversiuni.push(`la ${vechimeText(x)} în învățământ, rândul de ${NUME[TREPTE[i]!]} (${coef(sus.coeficient)}, ${lei(baza(sus, v))} lei) e sub cel de ${NUME[TREPTE[i - 1]!]} (${coef(jos.coeficient)}, ${lei(baza(jos, v))} lei)`);
    }
  const frazaInversiuni =
    inversiuni.length === 0
      ? `La aceeași vechime în învățământ, fiecare grad didactic are un salariu de bază cel puțin egal cu al gradului de sub el.`
      : `Un detaliu din coeficienții publicați: ${inversiuni.join("; ")}. Așa apare în grila variantei din ${v.eticheta}; tabelul reproduce coeficienții, nu îi corectează.`;

  // rândul fără pregătire de specialitate, comparat cu educatoarea calificată de aceeași vechime (debutantă sub 1 an)
  const calificata = (vech: string) => pe("definitiv", vech) ?? pe("debutant", vech);
  const tabelNec = nec
    .map((e) => {
      const d = calificata(e.vechime);
      return `| ${vechimeText(e.vechime)} | ${coef(e.coeficient)} | ${lei(baza(e, v))} | ${d ? lei(baza(d, v)) : "—"} |`;
    })
    .join("\n");
  const egaleCuDef = nec.filter((e) => { const d = calificata(e.vechime); return d && d.coeficient === e.coeficient; }).length;
  const cuDef = nec.filter((e) => calificata(e.vechime)).length;
  const frazaNec =
    cuDef > 0 && egaleCuDef === cuDef
      ? `În varianta din ${v.eticheta}, coeficienții acestui rând sunt identici cu ai educatoarei calificate (debutantă sau definitivă) cu aceeași vechime în învățământ: diferența apare abia la gradele didactice II și I.`
      : `În varianta din ${v.eticheta}, ${egaleCuDef === 0 ? "niciun coeficient al acestui rând nu e" : `${egaleCuDef}${de(egaleCuDef)} din ${cuDef} coeficienți ai acestui rând sunt`} identic${egaleCuDef === 1 ? "" : "i"} cu ai educatoarei calificate (debutantă sau definitivă) cu aceeași vechime în învățământ.`;

  const grad = GRADATII.map((g) => `| ${g.nivel} | ${g.numeRange} | ${g.cota ? `+${g.cota.toLocaleString("ro-RO")}%` : "—"} | ${lei(baza(def15, v, g.nivel))} | ${lei(net(baza(def15, v, g.nivel), v))} |`).join("\n");

  // comparația între variante, pe cod, pentru patru rânduri reprezentative
  const reprez = [deb, def15, pe("II", "10-15 ani") ?? pe("II")!, gIMax];
  const comparatie = reprez
    .map((e) => {
      const cel = VARIANTE.map((x) => {
        const r = getFunctii(x.id).find((y) => y.anexa === "I" && y.cod === e.cod && y.coeficient > 0);
        return r ? `${lei(baza(r, x))} (${coef(r.coeficient)})` : "—";
      });
      return `| ${NUME[treapta(e)!]}, ${vechimeText(e.vechime)} | ${cel.join(" | ")} |`;
    })
    .join("\n");
  const debPe = VARIANTE.map((x) => {
    const r = getFunctii(x.id).find((y) => y.anexa === "I" && y.cod === deb.cod && y.coeficient > 0);
    return r ? { x, b: baza(r, x) } : null;
  }).filter((z): z is { x: Varianta; b: number } => z !== null);
  const maxDeb = debPe.reduce((a, b) => (b.b > a.b ? b : a));
  const frazaVariante =
    maxDeb.x.id === v.id
      ? `Pentru educatoarea debutantă, varianta din ${v.eticheta} dă cel mai mare salariu de bază dintre cele trei.`
      : `Pentru educatoarea debutantă, cel mai mare salariu de bază dintre cele trei variante apare în cea din ${maxDeb.x.eticheta} (${lei(maxDeb.b)} lei), nu în cea din ${v.eticheta} (${lei(bDeb)} lei)${maxDeb.x.valoareReferinta === v.valoareReferinta ? "" : `: valoarea de referință a scăzut de la ${lei(maxDeb.x.valoareReferinta)} la ${lei(v.valoareReferinta)} lei`}.`;

  const sporuri = SPORURI_STANDARD.filter((s) => s.aplicabilAnexe?.includes("I") && /^Anexa I art\. \d+/.test(s.descriere ?? "") && !/superior|universit/i.test(`${s.nume} ${s.descriere ?? ""}`));
  if (sporuri.length === 0) throw new Error("ghid educatoare: fără sporuri pentru Anexa I");
  const listaSporuri = sporuri
    .map((s) => {
      const art = s.descriere?.match(/^Anexa I art\. \d+/)?.[0];
      return `- ${s.nume}${art ? ` (${art.replace("Anexa I art.", "Anexa I, art.")})` : ""}${s.inclusInPlafon20 ? "" : ": nu intră în plafonul de 20%"}.`;
    })
    .join("\n");

  const nr = randuri.length;
  const raspuns = `În proiectul legii salarizării din ${v.eticheta}, o educatoare debutantă cu studii de nivel liceal ar avea salariul de bază de ${lei(bDeb)} lei brut și ${lei(nDeb)} lei net, fără sporuri. Cu gradul didactic I și peste 25 de ani în învățământ, ar ajunge la ${lei(bIMax)} lei brut, înainte de gradații. Proiectul nu a fost adoptat.`;

  const corp = `## Cât ar fi salariul unei educatoare pe noua lege?
O educatoare debutantă ar avea un salariu de bază de **${lei(bDeb)} lei brut pe lună** în varianta din ${v.eticheta} a proiectului, adică ${lei(nDeb)} lei net fără sporuri și fără persoane în întreținere. Suma vine din coeficientul ${coef(deb.coeficient)} înmulțit cu valoarea de referință de ${lei(v.valoareReferinta)} lei (${v.articolValoareReferinta}), cu rotunjire în sus la leu (art. 10 alin. (4) din proiect).

După definitivat, cu 1–5 ani în învățământ, salariul de bază ar fi ${lei(bDef)} lei brut, iar cu gradul didactic I și peste 25 de ani în învățământ, ${lei(bIMax)} lei brut. Cifrele sunt la gradația 0, fără gradațiile din vechimea în muncă.

## Pe ce rând din grilă stă educatoarea?
Educatoarea are în Anexa I a proiectului un rând comun cu învățătorul, educatorul-puericultorul și maistrul-instructor: „învățător; educatoare; educator-puericultor; maistru-instructor (cu studii de nivel liceal)”. Pe acest rând, salariul depinde de două lucruri: gradul didactic (debutant, definitiv, II, I) și vechimea în învățământ.

În grila publicată, denumirea „educatoare” apare doar pe rândurile cu studii de nivel liceal. Educatorul-puericultor apare și pe rânduri cu studii superioare; pentru acestea, vezi [salariul profesorului pe noua lege](/ghiduri/salariu-profesor-noua-lege) și [grila învățământului](/grila/invatamant-cercetare).

## Cât ia o educatoare după gradul didactic și vechimea în învățământ?
Grila are ${nr}${de(nr)} rânduri pentru educatoarea calificată, iar salariul de bază merge de la ${lei(min)} la ${lei(max)} lei brut, la gradația 0 (lei, varianta din ${v.eticheta}):

| Vechime în învățământ | ${TREPTE.map((t) => NUME[t]).join(" | ")} |
${matrice}

O liniuță înseamnă că grila nu are rândul respectiv. ${frazaInversiuni}

${subMinim === 0 ? `Toate rândurile sunt peste salariul minim brut de ${lei(SAL_MIN_BRUT)} lei, așa că regula din art. 10 alin. (8) (se plătește cel puțin salariul minim) nu intervine aici.` : `${subMinim === 1 ? "Un rând e" : `${subMinim}${de(subMinim)} rânduri sunt`} sub salariul minim brut de ${lei(SAL_MIN_BRUT)} lei; acolo se plătește salariul minim (art. 10 alin. (8)).`}

## Cât ar fi netul unei educatoare?
Cu regulile fiscale de azi (25% CAS, 10% CASS, 10% impozit, fără persoane în întreținere): debutanta ar avea ${lei(nDeb)} lei net; educatoarea definitivă cu 1–5 ani în învățământ, ${lei(net(bDef, v))} lei net; cu gradul didactic I și peste 25 de ani, ${lei(net(bIMax, v))} lei net.

${cuDeducere === 0 ? `Deducerea personală (art. 77 din Codul fiscal) și deducerea suplimentară pentru tinerii sub 26 de ani se acordă doar până la un brut de ${lei(pragDeducere)} lei (salariul minim + 2.000 de lei). Toate rândurile educatoarei sunt peste acest prag, așa că netul nu depinde de vârstă.` : `Deducerea personală (art. 77 din Codul fiscal) se acordă doar până la un brut de ${lei(pragDeducere)} lei (salariul minim + 2.000 de lei); ${cuDeducere === 1 ? "un rând" : `${cuDeducere}${de(cuDeducere)} rânduri`} din tabel ${cuDeducere === 1 ? "e" : "sunt"} sub acest prag. Pentru calculul cu deducere, folosește [calculatorul](/).`}

## Ce înseamnă rândul „fără pregătire de specialitate”?
Grila are și un rând separat pentru profesorul, învățătorul, educatoarea, educatorul-puericultorul și maistrul-instructor cu studii de nivel liceal, fără pregătire de specialitate. Rândul nu are grad didactic, doar trepte de vechime în învățământ:

| Vechime în învățământ | Coeficient | Salariu de bază (lei) | Educatoare calificată, aceeași vechime (lei) |
${tabelNec}

${frazaNec}

## Cât adaugă gradațiile?
Gradația vine din vechimea în muncă, nu din vechimea în învățământ (art. 13 din proiect): salariul din grilă crește succesiv cu +7,5% după 3 ani de muncă, apoi cu câte +5%, +5%, +2,5% și +2,5%. Pentru educatoarea definitivă cu ${vechimeText(def15.vechime)} în învățământ:

| Gradația | Vechime în muncă | Creștere | Salariu de bază (lei) | Net (lei) |
${grad}

Cu gradul didactic I, peste 25 de ani în învățământ și gradația maximă, salariul de bază ar fi ${lei(baza(gIMax, v, gMax))} lei brut.

## Ce s-a schimbat între cele trei variante ale proiectului?
Ministerul Muncii a publicat trei variante: ${VARIANTE.map((x) => `${x.eticheta} (valoarea de referință ${lei(x.valoareReferinta)} lei)`).join(", ")}. Salariul de bază al educatoarei, la gradația 0, cu coeficientul în paranteză:

| Gradul didactic, vechimea | ${VARIANTE.map((x) => x.eticheta).join(" | ")} |
${comparatie}

Rândurile sunt potrivite între variante după codul funcției din grilă. ${frazaVariante}

## Ce sporuri se pot adăuga?
Anexa I are sporuri legate de locul și condițiile de muncă, nu de gradul didactic; le poți adăuga în calculator, dacă ești în situația respectivă:

${listaSporuri}

Plafonul de 20% al sporurilor se calculează pe ordonatorul principal de credite, nu pe fiecare angajat (art. 21 alin. (2)). Pentru salariul tău, cu gradație, sporuri și net, folosește [calculatorul](/).

> Atenție: legea nu a fost adoptată. Pe 26 august 2026 partidele au anunțat că nu au ajuns la consens și s-au angajat să adopte legea până la sfârșitul anului. Cifrele de mai sus arată ce prevede proiectul, nu salariile în vigoare.`;

  return {
    slug: "salariu-educatoare-noua-lege",
    categorie: "Ghid",
    titlu: "Cât ar câștiga o educatoare pe noua lege a salarizării",
    titluMeta: "Salariu educatoare pe noua lege a salarizării (2026)",
    descriere: `Educatoarea în proiectul din ${v.eticheta}: de la ${lei(bDeb)} lei brut (debutantă) la ${lei(bIMax)} lei (gradul I), cu net, gradații și variante.`,
    cuvantCheie: "salariu educatoare noua lege",
    raspuns,
    peScurt: [
      `Educatoare debutantă: ${lei(bDeb)} lei brut, ${lei(nDeb)} lei net fără sporuri.`,
      `Definitivă, cu 1–5 ani în învățământ: ${lei(bDef)} lei brut.`,
      `Gradul didactic I, peste 25 de ani în învățământ: ${lei(bIMax)} lei brut, ${lei(baza(gIMax, v, gMax))} lei cu gradația maximă.`,
      `Educatoarea are un rând comun cu învățătorul, educatorul-puericultorul și maistrul-instructor (studii de nivel liceal).`,
      `Valoarea de referință din ${v.eticheta}: ${lei(v.valoareReferinta)} lei (${v.articolValoareReferinta}).`,
    ],
    publicat: "2026-10-06",
    actualizat: "2026-10-06",
    autor: { nume: "Alex Mantello", url: "https://alexandru.zed-zen.com" },
    corp,
    faq: [
      {
        q: "Cât ar câștiga net o educatoare debutantă pe noua lege?",
        a: `În varianta din ${v.eticheta}: ${lei(nDeb)} lei net, din ${lei(bDeb)} lei brut, fără sporuri și fără persoane în întreținere.`,
      },
      {
        q: "Contează vechimea în învățământ sau vechimea în muncă?",
        a: `Amândouă, în feluri diferite. Vechimea în învățământ și gradul didactic aleg rândul din grilă; vechimea în muncă dă gradațiile (art. 13 din proiect), care cresc salariul din rândul ales.`,
      },
      {
        q: "De când s-ar aplica noile salarii pentru educatoare?",
        a: `Nu încă. Proiectul nu a fost adoptat. Varianta din ${v.eticheta} prevede intrarea în vigoare pe ${v.intrareInVigoareText} (${v.articolIntrareInVigoare}), dar doar dacă legea e votată și promulgată.`,
      },
      {
        q: "Ce se întâmplă dacă noul salariu e mai mic decât cel de acum?",
        a: `Proiectul prevede o diferență salarială tranzitorie (${v.articolDiferentaTranzitorie} în varianta din ${v.eticheta}), raportată la salariul din ${v.referintaDiferentaTranzitorie}. Salariile de acum, pe Legea 153/2017, nu sunt calculate aici.`,
      },
    ],
    surse: [
      ...v.surse.map((s) => ({ titlu: s.titlu, url: s.url.startsWith("/") ? `${SITE_URL}${s.url}` : s.url })),
      { titlu: "Codul fiscal, Legea 227/2015 (Portal legislativ)", url: "https://legislatie.just.ro/Public/DetaliiDocument/171282", nota: "art. 77 (deducerea personală), art. 78 (impozitul), art. 138 (CAS), art. 156 (CASS)" },
    ],
    legaturi: [
      ["/grila/invatamant-cercetare", "Grila completă a învățământului (Anexa I)"],
      ["/", "Calculatorul: salariul tău, cu gradație, sporuri și net"],
      ["/ghiduri/salariu-profesor-debutant", "Salariul cadrului didactic debutant pe noua lege"],
    ],
  };
}
