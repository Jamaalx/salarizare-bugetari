/**
 * Ghid: salariile cadrelor didactice universitare în proiectul legii salarizării (Anexa I, cap. I lit. A,
 * pct. 4): asistent universitar, șef lucrări (lector universitar), conferențiar universitar și profesor
 * universitar, pe vechimea în învățământ. Rândurile se aleg după codul funcției (11.00401001–004), se
 * potrivesc între variante pe cod, iar salariul de bază și netul se calculează cu funcțiile calculatorului.
 * Notele 4 și 5 de sub grilă sunt verificate în public/sources/Proiect-COEFICIENTI-1-8-20-august-2026.xlsx.
 */
import { VARIANTE, VARIANTA_IMPLICITA, getVarianta, type Varianta } from "../variants";
import { getFunctii, type CoefEntry } from "../variants-data";
import { aplicaGradatie, calcBrut, GRADATII, SAL_MIN_BRUT, SPORURI_STANDARD } from "../tax";
import { SITE_URL, de } from "../seo";
import type { Ghid } from "./tip";

const lei = (n: number) => n.toLocaleString("ro-RO");
const coef = (n: number) => n.toLocaleString("ro-RO", { maximumFractionDigits: 6 });

/** funcțiile din grilă, de la prima treaptă la cea mai înaltă, cu prefixul codului */
const FUNCTII = [
  { cod: "11.00401004", nume: "asistent universitar", titlu: "Asistent universitar" },
  { cod: "11.00401003", nume: "șef de lucrări (lector universitar)", titlu: "Lector (șef lucrări)" },
  { cod: "11.00401002", nume: "conferențiar universitar", titlu: "Conferențiar" },
  { cod: "11.00401001", nume: "profesor universitar", titlu: "Profesor universitar" },
] as const;
type Functie = (typeof FUNCTII)[number];

const VECHIMI = ["până la 3 ani", "3-5 ani", "5-10 ani", "10-15 ani", "15-20 ani", "20-25 ani", "peste 25 de ani"];
const vechimeText = (x: string) => x.replace(/(\d+)-(\d+)/, "$1–$2");

/** rândurile unei funcții universitare, de la vechimea cea mai mică la cea mai mare */
function randuri(id: Varianta["id"], f: Functie): CoefEntry[] {
  return getFunctii(id)
    .filter((e) => e.anexa === "I" && e.cod.startsWith(`${f.cod}.`) && e.coeficient > 0)
    .sort((a, b) => VECHIMI.indexOf(a.vechime) - VECHIMI.indexOf(b.vechime));
}

const baza = (e: CoefEntry, v: Varianta, g = 0) => aplicaGradatie(e.coeficient * v.valoareReferinta, g);
const net = (brut: number, v: Varianta) => calcBrut({ salariuBaza: brut, sporuri: [], valoareReferinta: v.valoareReferinta }).salariuNet;

export function ghid(): Ghid {
  const v = getVarianta(VARIANTA_IMPLICITA);
  const grila = FUNCTII.map((f) => ({ f, r: randuri(v.id, f) }));
  for (const { f, r } of grila) {
    if (r.length === 0) throw new Error(`ghid universitar: lipsește ${f.nume} în ${v.id}`);
    if (r.some((e) => !VECHIMI.includes(e.vechime))) throw new Error(`ghid universitar: vechime necunoscută la ${f.nume}`);
  }
  const fn = (i: number) => grila[i]!;
  const prima = (i: number) => fn(i).r[0]!;
  const ultima = (i: number) => fn(i).r.at(-1)!;
  const pe = (i: number, vech: string) => fn(i).r.find((e) => e.vechime === vech);

  const [ASIST, LECTOR, CONF, PROF] = [0, 1, 2, 3];
  const bAsist = baza(prima(ASIST), v);
  const bLector = baza(prima(LECTOR), v);
  const nLector = net(bLector, v);
  const bConf = baza(prima(CONF), v);
  const bProf = baza(prima(PROF), v);
  const bProfMax = baza(ultima(PROF), v);
  const toate = grila.flatMap((x) => x.r);
  const min = Math.min(...toate.map((e) => baza(e, v)));
  const max = Math.max(...toate.map((e) => baza(e, v)));
  const gMax = GRADATII.length - 1;
  const subMinim = toate.filter((e) => baza(e, v) < SAL_MIN_BRUT).length;
  const pragDeducere = SAL_MIN_BRUT + 2000;
  const cuDeducere = toate.filter((e) => baza(e, v) <= pragDeducere).length;

  // matricea: vechimea în învățământ pe rânduri, funcția pe coloane
  const vechimiFolosite = VECHIMI.filter((x) => toate.some((e) => e.vechime === x));
  const matrice = vechimiFolosite
    .map((x) => `| ${vechimeText(x)} | ${FUNCTII.map((_, i) => { const e = pe(i, x); return e ? lei(baza(e, v)) : "—"; }).join(" | ")} |`)
    .join("\n");

  // prima și ultima treaptă a fiecărei funcții, cu netul
  const tabelNet = grila
    .flatMap(({ f, r }) => [r[0]!, ...(r.length > 1 ? [r.at(-1)!] : [])].map((e) => `| ${f.titlu} | ${vechimeText(e.vechime)} | ${coef(e.coeficient)} | ${lei(baza(e, v))} | ${lei(net(baza(e, v), v))} |`))
    .join("\n");

  // la aceeași vechime, funcția mai înaltă are un salariu mai mic decât cea de sub ea?
  const inversiuni: string[] = [];
  for (const x of vechimiFolosite)
    for (let i = 1; i < FUNCTII.length; i++) {
      const jos = pe(i - 1, x);
      const sus = pe(i, x);
      if (jos && sus && sus.coeficient < jos.coeficient)
        inversiuni.push(`la ${vechimeText(x)} în învățământ, ${FUNCTII[i]!.nume} (${coef(sus.coeficient)}) e sub ${FUNCTII[i - 1]!.nume} (${coef(jos.coeficient)})`);
    }
  const frazaInversiuni =
    inversiuni.length === 0
      ? `La aceeași vechime în învățământ, fiecare funcție are un salariu de bază cel puțin egal cu al funcției de sub ea.`
      : `Un detaliu din coeficienții publicați: ${inversiuni.join("; ")}. Tabelul reproduce coeficienții, nu îi corectează.`;

  // diferența dintre treptele vecine, la aceeași vechime (cea mai mare vechime comună tuturor)
  const comuna = [...vechimiFolosite].reverse().find((x) => FUNCTII.every((_, i) => pe(i, x)));
  const frazaTrepte = comuna
    ? `La ${vechimeText(comuna)} în învățământ, diferențele dintre trepte sunt: de la asistent la lector ${lei(baza(pe(LECTOR, comuna)!, v) - baza(pe(ASIST, comuna)!, v))} lei, de la lector la conferențiar ${lei(baza(pe(CONF, comuna)!, v) - baza(pe(LECTOR, comuna)!, v))} lei, iar de la conferențiar la profesor universitar ${lei(baza(pe(PROF, comuna)!, v) - baza(pe(CONF, comuna)!, v))} lei brut pe lună.`
    : "";

  const exGrad = pe(LECTOR, "5-10 ani") ?? prima(LECTOR);
  const grad = GRADATII.map((g) => `| ${g.nivel} | ${g.numeRange} | ${g.cota ? `+${g.cota.toLocaleString("ro-RO")}%` : "—"} | ${lei(baza(exGrad, v, g.nivel))} | ${lei(net(baza(exGrad, v, g.nivel), v))} |`).join("\n");

  // comparația între variante, pe cod: prima și ultima treaptă a fiecărei funcții
  const reprez = grila.flatMap(({ f, r }) => [{ f, e: r[0]! }, { f, e: r.at(-1)! }]);
  const pePeVariante = (e: CoefEntry) =>
    VARIANTE.map((x) => {
      const r = getFunctii(x.id).find((y) => y.anexa === "I" && y.cod === e.cod && y.coeficient > 0);
      return r ? { x, r, b: baza(r, x) } : null;
    });
  const comparatie = reprez
    .map(({ f, e }) => `| ${f.titlu}, ${vechimeText(e.vechime)} | ${pePeVariante(e).map((z) => (z ? `${lei(z.b)} (${coef(z.r.coeficient)})` : "—")).join(" | ")} |`)
    .join("\n");
  const lipsesc = reprez.filter(({ e }) => pePeVariante(e).some((z) => z === null));
  const sub = reprez.filter(({ e }) => {
    const z = pePeVariante(e).filter((y): y is NonNullable<typeof y> => y !== null);
    return z.some((y) => y.b > (z.find((w) => w.x.id === v.id)?.b ?? Infinity));
  });
  const frazaVariante = [
    sub.length === 0
      ? `Pentru toate rândurile din tabel, varianta din ${v.eticheta} dă cel mai mare salariu de bază dintre cele trei.`
      : `La ${sub.length === 1 ? "un rând" : `${sub.length}${de(sub.length)} rânduri`} din ${reprez.length} (${sub.map(({ f, e }) => `${f.titlu.toLowerCase()}, ${vechimeText(e.vechime)}`).join("; ")}), o variantă mai veche dădea un salariu de bază mai mare decât cea din ${v.eticheta}${VARIANTE.some((x) => x.valoareReferinta > v.valoareReferinta) ? `, în parte pentru că valoarea de referință a scăzut la ${lei(v.valoareReferinta)} lei` : ""}.`,
    lipsesc.length > 0 ? `O liniuță înseamnă că varianta respectivă nu avea rândul (de exemplu, ${lipsesc.map(({ f, e }) => `${f.nume} cu ${vechimeText(e.vechime)}`).join(", ")}).` : "",
  ]
    .filter(Boolean)
    .join(" ");

  // sporurile învățământului superior din Anexa I (lib/tax.ts)
  const sporuri = ["salarii-diferentiate-univ", "conducator-doctorat"].map((id) => SPORURI_STANDARD.find((s) => s.id === id));
  if (sporuri.some((s) => !s || !/^Anexa I art\. \d+/.test(s.descriere ?? ""))) throw new Error("ghid universitar: lipsesc sporurile învățământului superior");
  const listaSporuri = sporuri
    .map((s) => {
      const art = s!.descriere!.match(/^Anexa I art\. \d+/)![0].replace("Anexa I art.", "Anexa I, art.");
      const detaliu = s!.descriere!.replace(/^Anexa I art\. \d+\s*—\s*/, "").replace(/\s*Editează procentul.*$/, "").replace(/sal\. bază/g, "din salariul de bază");
      return `- **${s!.nume}**, ${art}: ${detaliu}${s!.inclusInPlafon20 ? " Intră în plafonul de 20%." : " Nu intră în plafonul de 20%."}`;
    })
    .join("\n");

  // titlul de doctor: doar ca text, din notele variantei din 20 august (nu e modelat în calculator)
  const aug = getVarianta("2026-08-20");
  const notaDoctor = aug.note.find((n) => /doctor/i.test(n));
  const sumaDoctor = notaDoctor?.match(/(\d[\d.]*) lei/)?.[1];
  const artDoctor = notaDoctor?.match(/art\. \d+/)?.[0];
  if (!sumaDoctor || !artDoctor) throw new Error("ghid universitar: lipsește nota despre titlul de doctor");

  const nrRanduri = toate.length;
  const raspuns = `În proiectul legii salarizării din ${v.eticheta}, un lector universitar (șef de lucrări) la prima treaptă de vechime ar avea salariul de bază de ${lei(bLector)} lei brut, adică ${lei(nLector)} lei net, iar un profesor universitar cu peste 25 de ani în învățământ, ${lei(bProfMax)} lei brut, înainte de gradații. Proiectul nu a fost adoptat.`;

  const corp = `## Cât ar fi salariul unui lector universitar pe noua lege?
Un lector universitar (în grilă: „șef lucrări (lector universitar)”) cu ${vechimeText(prima(LECTOR).vechime)} în învățământ ar avea un salariu de bază de **${lei(bLector)} lei brut pe lună** în varianta din ${v.eticheta} a proiectului, adică ${lei(nLector)} lei net fără sporuri și fără persoane în întreținere. Suma vine din coeficientul ${coef(prima(LECTOR).coeficient)} înmulțit cu valoarea de referință de ${lei(v.valoareReferinta)} lei (${v.articolValoareReferinta}), cu rotunjire în sus la leu (art. 10 alin. (4) din proiect).

Pentru celelalte funcții didactice universitare, la prima treaptă de vechime din grilă: asistentul universitar ar avea ${lei(bAsist)} lei, conferențiarul ${lei(bConf)} lei, iar profesorul universitar ${lei(bProf)} lei brut. Cifrele sunt la gradația 0, fără gradațiile din vechimea în muncă.

## Unde stau cadrele didactice universitare în grilă?
În Anexa I a proiectului (familia ocupațională „Învățământ și cercetare științifică”), capitolul I litera A, punctul 4 are coeficienții pentru învățământul universitar: patru funcții, fiecare pe trepte de vechime în învățământ. Nota 1 de sub grilă precizează că aceste funcții se ocupă potrivit Legii învățământului superior nr. 199/2023.

Grila are ${nrRanduri}${de(nrRanduri)} rânduri pentru cele patru funcții, iar salariul de bază merge de la ${lei(min)} la ${lei(max)} lei brut, la gradația 0. Funcțiile de conducere din universități (rector, prorector, decan și celelalte) au rânduri separate, în [grila învățământului](/grila/invatamant-cercetare).

## Cât ia fiecare funcție, după vechimea în învățământ?
Salariul de bază la gradația 0, în lei, varianta din ${v.eticheta}:

| Vechime în învățământ | ${FUNCTII.map((f) => f.titlu).join(" | ")} |
${matrice}

O liniuță înseamnă că grila nu are rândul respectiv. Prima treaptă de vechime din grilă e „${vechimeText(prima(ASIST).vechime)}” pentru asistentul universitar, „${vechimeText(prima(LECTOR).vechime)}” pentru lector, „${vechimeText(prima(CONF).vechime)}” pentru conferențiar și „${vechimeText(prima(PROF).vechime)}” pentru profesorul universitar. ${frazaInversiuni}

${frazaTrepte}

## Ce se întâmplă cu asistentul universitar fără doctorat?
Nota 5 de sub grila din 20 august 2026 prevede că asistentul universitar care nu deține titlul științific de doctor primește coeficienții corespunzători vechimii sale în învățământ, diminuați cu 0,1. Calculatorul nu modelează această diminuare, așa că cifrele din tabele sunt pentru asistentul cu doctorat.

În sens invers, varianta din 20 august prevede pentru titlul științific de doctor o indemnizație fixă de ${sumaDoctor} lei brut pe lună, în afara plafonului sporurilor (${artDoctor} din proiect). Nici ea nu e inclusă în cifrele de aici și nici în calculator.

## Cât ar fi netul?
Cu regulile fiscale de azi (25% CAS, 10% CASS, 10% impozit, fără persoane în întreținere), la prima și la ultima treaptă de vechime a fiecărei funcții:

| Funcția | Vechime în învățământ | Coeficient | Salariu de bază (lei) | Net (lei) |
${tabelNet}

${cuDeducere === 0 ? `Deducerea personală (art. 77 din Codul fiscal) se acordă doar până la un brut de ${lei(pragDeducere)} lei (salariul minim + 2.000 de lei). Toate rândurile universitare sunt peste acest prag, așa că netul nu depinde de vârstă sau de persoanele în întreținere.` : `Deducerea personală (art. 77 din Codul fiscal) se acordă doar până la un brut de ${lei(pragDeducere)} lei (salariul minim + 2.000 de lei); ${cuDeducere === 1 ? "un rând" : `${cuDeducere}${de(cuDeducere)} rânduri`} din grilă ${cuDeducere === 1 ? "e" : "sunt"} sub acest prag. Pentru calculul cu deducere, folosește [calculatorul](/).`} ${subMinim === 0 ? `Niciun rând nu e sub salariul minim brut de ${lei(SAL_MIN_BRUT)} lei.` : `${subMinim === 1 ? "Un rând e" : `${subMinim}${de(subMinim)} rânduri sunt`} sub salariul minim brut de ${lei(SAL_MIN_BRUT)} lei; acolo se plătește salariul minim (art. 10 alin. (8)).`}

## Cât adaugă gradațiile?
Gradația vine din vechimea în muncă, nu din vechimea în învățământ: nota 4 de sub grilă spune că coeficienții sunt pentru gradația 0, iar salariile pentru gradațiile 1–5 se obțin prin majorare potrivit art. 13 din proiect. Salariul crește succesiv cu +7,5% după 3 ani de muncă, apoi cu câte +5%, +5%, +2,5% și +2,5%. Pentru un lector cu ${vechimeText(exGrad.vechime)} în învățământ:

| Gradația | Vechime în muncă | Creștere | Salariu de bază (lei) | Net (lei) |
${grad}

Cu peste 25 de ani în învățământ și gradația maximă, profesorul universitar ar ajunge la ${lei(baza(ultima(PROF), v, gMax))} lei brut, iar conferențiarul la ${lei(baza(ultima(CONF), v, gMax))} lei brut.

## Ce s-a schimbat între cele trei variante ale proiectului?
Ministerul Muncii a publicat trei variante: ${VARIANTE.map((x) => `${x.eticheta} (valoarea de referință ${lei(x.valoareReferinta)} lei)`).join(", ")}. Salariul de bază la gradația 0, cu coeficientul în paranteză, pentru prima și ultima treaptă de vechime:

| Funcția, vechimea | ${VARIANTE.map((x) => x.eticheta).join(" | ")} |
${comparatie}

Rândurile sunt potrivite între variante după codul funcției din grilă. ${frazaVariante}

## Ce sporuri au cadrele didactice universitare?
Pe lângă gradații, Anexa I are două sporuri specifice învățământului superior, pe care le poți adăuga în [calculator](/):

${listaSporuri}

Plafonul de 20% al sporurilor se calculează pe ordonatorul principal de credite, nu pe fiecare angajat (art. 21 alin. (2)). Pentru preuniversitar, vezi [salariul profesorului pe noua lege](/ghiduri/salariu-profesor-noua-lege).

> Atenție: legea nu a fost adoptată. Pe 26 august 2026 partidele au anunțat că nu au ajuns la consens și s-au angajat să adopte legea până la sfârșitul anului. Cifrele de mai sus arată ce prevede proiectul, nu salariile în vigoare.`;

  return {
    slug: "salariu-cadre-didactice-universitare",
    categorie: "Ghid",
    titlu: "Cât ar câștiga un lector, un conferențiar și un profesor universitar pe noua lege",
    titluMeta: "Salariu lector universitar și profesor universitar pe noua lege",
    descriere: `Asistent, lector, conferențiar și profesor universitar în proiectul din ${v.eticheta}: de la ${lei(min)} la ${lei(max)} lei brut, cu net, gradații și variante.`,
    cuvantCheie: "salariu lector universitar",
    raspuns,
    peScurt: [
      `Lector universitar (șef lucrări), ${vechimeText(prima(LECTOR).vechime)} în învățământ: ${lei(bLector)} lei brut, ${lei(nLector)} lei net fără sporuri.`,
      `Asistent universitar: de la ${lei(bAsist)} lei brut; fără doctorat, coeficientul scade cu 0,1 (nota 5 din grila din 20 august).`,
      `Conferențiar: de la ${lei(bConf)} la ${lei(baza(ultima(CONF), v))} lei brut, după vechimea în învățământ.`,
      `Profesor universitar: de la ${lei(bProf)} la ${lei(bProfMax)} lei brut, ${lei(baza(ultima(PROF), v, gMax))} lei cu gradația maximă.`,
      `Valoarea de referință din ${v.eticheta}: ${lei(v.valoareReferinta)} lei (${v.articolValoareReferinta}).`,
    ],
    publicat: "2026-10-09",
    actualizat: "2026-10-09",
    autor: { nume: "Alex Mantello", url: "https://alexandru.zed-zen.com" },
    corp,
    faq: [
      {
        q: "Cât ar câștiga net un lector universitar pe noua lege?",
        a: `În varianta din ${v.eticheta}, la ${vechimeText(prima(LECTOR).vechime)} în învățământ: ${lei(nLector)} lei net, din ${lei(bLector)} lei brut, fără sporuri, fără gradații și fără persoane în întreținere.`,
      },
      {
        q: "Contează vechimea în învățământ sau vechimea în muncă?",
        a: `Amândouă, în feluri diferite. Funcția didactică și vechimea în învățământ aleg rândul din grilă; vechimea în muncă dă gradațiile (art. 13 din proiect), care cresc salariul din rândul ales.`,
      },
      {
        q: "Este inclusă indemnizația pentru titlul de doctor?",
        a: `Nu. Varianta din 20 august prevede ${sumaDoctor} lei brut pe lună pentru titlul științific de doctor (${artDoctor}), dar suma nu e modelată în calculator și nu apare în tabele.`,
      },
      {
        q: "De când s-ar aplica noile salarii în universități?",
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
      ["/ghiduri/salariu-profesor-noua-lege", "Salariul profesorului din preuniversitar pe noua lege"],
    ],
  };
}
