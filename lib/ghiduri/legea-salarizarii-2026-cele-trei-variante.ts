/**
 * Ghid: legea salarizării 2026 = proiectul MMFTSS, în trei variante (25 mai, 17 iulie, 20 august 2026).
 * Parametrii (valoare de referință, intrare în vigoare, diferență tranzitorie) vin din data/variants/index.json;
 * comparația pe anexe se face pe codul funcției, doar pe codurile care apar o singură dată (cu coeficient > 0)
 * în fiecare dintre cele trei variante, ca să nu amestecăm rânduri diferite cu același cod. Anexele VI, VII și IX
 * nu au coduri comparabile (solda de grad, secțiuni noi, coeficienți eșalonați): nu intră în tabel.
 */
import { ANEXE, VARIANTE, VARIANTA_IMPLICITA, getVarianta, type Varianta } from "../variants";
import { getFunctii, type CoefEntry } from "../variants-data";
import { aplicaGradatie, calcBrut } from "../tax";
import { GRILE, SITE_URL, de } from "../seo";
import type { Ghid } from "./tip";

const lei = (n: number) => n.toLocaleString("ro-RO");
const proc = (n: number) => `${n > 0 ? "+" : ""}${n.toLocaleString("ro-RO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
const baza = (c: number, v: Varianta) => aplicaGradatie(c * v.valoareReferinta, 0);
const net = (brut: number, v: Varianta) => calcBrut({ salariuBaza: brut, sporuri: [], valoareReferinta: v.valoareReferinta }).salariuNet;

type Id = Varianta["id"];
const [V1, V2, V3] = VARIANTE as [Varianta, Varianta, Varianta];

/** rândurile cu cod unic și coeficient > 0 dintr-o variantă, pe cod */
function pecod(id: Id): Map<string, CoefEntry> {
  const vazute = new Map<string, CoefEntry | null>();
  for (const e of getFunctii(id)) {
    if (!e.cod || !(e.coeficient > 0)) continue;
    vazute.set(e.cod, vazute.has(e.cod) ? null : e);
  }
  const rez = new Map<string, CoefEntry>();
  for (const [k, e] of vazute) if (e) rez.set(k, e);
  return rez;
}

export function ghid(): Ghid {
  const v = getVarianta(VARIANTA_IMPLICITA);
  if (VARIANTE.length !== 3 || v.id !== V3.id) throw new Error("ghid variante: se așteaptă exact trei variante, ultima implicită");
  const [m1, m2, m3] = [pecod(V1.id), pecod(V2.id), pecod(V3.id)];

  // comparația pe anexe
  const anexe = GRILE.map((g) => {
    const cm = [...m1.keys()].filter((c) => m2.has(c) && m3.has(c) && m3.get(c)!.anexa === g.anexa);
    const sch12 = cm.filter((c) => m1.get(c)!.coeficient !== m2.get(c)!.coeficient).length;
    const sch23 = cm.filter((c) => m2.get(c)!.coeficient !== m3.get(c)!.coeficient).length;
    const medie = (a: Map<string, CoefEntry>, va: Varianta, b: Map<string, CoefEntry>, vb: Varianta) =>
      cm.length === 0 ? 0 : (100 * cm.reduce((s, c) => s + (b.get(c)!.coeficient * vb.valoareReferinta) / (a.get(c)!.coeficient * va.valoareReferinta) - 1, 0)) / cm.length;
    return { g, n: cm.length, sch12, sch23, d12: medie(m1, V1, m2, V2), d23: medie(m2, V2, m3, V3) };
  }).filter((x) => x.n >= 10);
  if (anexe.length < 5) throw new Error(`ghid variante: doar ${anexe.length} anexe comparabile`);
  const totalComparate = anexe.reduce((s, x) => s + x.n, 0);
  const tabelAnexe = anexe
    .map((x) => `| Anexa ${x.g.anexa} | ${x.g.titlu} | ${lei(x.n)} | ${lei(x.sch12)} | ${lei(x.sch23)} | ${proc(x.d12)} | ${proc(x.d23)} |`)
    .join("\n");
  const sch12Tot = anexe.reduce((s, x) => s + x.sch12, 0);
  const sch23Tot = anexe.reduce((s, x) => s + x.sch23, 0);
  const pct = (a: number, b: number) => Math.round((100 * a) / b);
  const maiMult12 = [...anexe].sort((a, b) => b.d12 - a.d12)[0]!;
  const maiMult23Scad = [...anexe].sort((a, b) => a.d23 - b.d23)[0]!;
  const maiMult23Cres = [...anexe].sort((a, b) => b.d23 - a.d23)[0]!;

  // parametrii variantelor
  const param = (f: (x: Varianta) => string) => VARIANTE.map(f).join(" | ");
  const tabelParam = [
    `| Valoarea de referință | ${param((x) => `${lei(x.valoareReferinta)} lei (${x.articolValoareReferinta})`)} |`,
    `| Pentru perioada | ${param((x) => x.perioadaValoareReferinta)} |`,
    `| Intrarea în vigoare | ${param((x) => `${x.intrareInVigoareText} (${x.articolIntrareInVigoare})`)} |`,
    `| Diferența salarială tranzitorie, raportată la | ${param((x) => `${x.referintaDiferentaTranzitorie} (${x.articolDiferentaTranzitorie})`)} |`,
    `| Limita diferenței tranzitorii | ${param((x) => x.limitaDiferentaTranzitorie ?? "fără dată-limită în text")} |`,
    `| Articole în proiect | ${param((x) => lei(x.numarArticole))} |`,
    `| Rânduri de funcții în grilă | ${param((x) => lei(getFunctii(x.id).length))} |`,
  ].join("\n");

  // patru funcții, urmărite pe cod prin cele trei variante
  const EX = [
    { cod: "11.00501004.01.1", nume: "Profesor debutant (studii superioare de lungă durată)" },
    { cod: "11.00501003.01.6", nume: "Profesor cu grad didactic definitiv, vechime 1–5 ani" },
    { cod: "21.00201003.01.1", nume: "Medic specialist (spital de categoria a II-a)" },
    { cod: "81.20108002.04.1", nume: "Consilier, funcționar public superior (administrație)" },
  ] as const;
  const exemple = EX.map((x) => {
    const r = [m1, m2, m3].map((m) => m.get(x.cod));
    if (r.some((e) => !e)) throw new Error(`ghid variante: lipsește codul ${x.cod} într-o variantă`);
    const b = r.map((e, i) => baza(e!.coeficient, VARIANTE[i]!));
    return { ...x, e: r as CoefEntry[], b };
  });
  const tabelExemple = exemple.map((x) => `| ${x.nume} | ${x.b.map((s) => lei(s)).join(" | ")} | ${lei(net(x.b[2]!, V3))} |`).join("\n");
  const tabelCoef = exemple.map((x) => `| ${x.nume} | ${x.e.map((e) => e.coeficient.toLocaleString("ro-RO", { maximumFractionDigits: 6 })).join(" | ")} |`).join("\n");
  const scazuteAug = exemple.filter((x) => x.b[2]! < x.b[1]!).length;

  const diferentaVR = V2.valoareReferinta - V3.valoareReferinta;
  const raspuns = `Legea salarizării 2026 este un proiect al Ministerului Muncii, publicat în trei variante: 25 mai, 17 iulie și 20 august 2026. Cea din urmă fixează valoarea de referință la ${lei(v.valoareReferinta)} lei (${lei(diferentaVR)}${de(diferentaVR)} lei mai puțin decât în iulie) și intrarea în vigoare la ${v.intrareInVigoareText}. Proiectul nu a fost adoptat.`;

  const corp = `## Ce este legea salarizării 2026 și în ce stadiu e?
„Legea salarizării 2026” este proiectul de lege a salarizării pentru personalul plătit din fonduri publice, redactat de Ministerul Muncii, Familiei, Tineretului și Solidarității Sociale (MMFTSS). Ministerul a publicat până acum trei texte, cu grilele de coeficienți aferente: ${VARIANTE.map((x) => x.eticheta).join(", ")}. Cu coeficienții din grile se calculează salariile de bază pe funcție, în nouă anexe, de la învățământ la funcțiile de demnitate publică.

Proiectul **nu a fost adoptat**. Pe 26 august 2026 partidele au anunțat că nu au ajuns la consens și s-au angajat să adopte legea până la sfârșitul anului. Până atunci salariile se plătesc pe legea în vigoare (Legea 153/2017), iar cifrele din acest ghid arată doar ce prevede fiecare variantă a proiectului.

## Ce prevede fiecare variantă?
Trei lucruri se schimbă de la un text la altul: valoarea de referință (cuantumul cu care se înmulțește coeficientul din grilă), data intrării în vigoare și regula diferenței tranzitorii. Parametrii, așa cum sunt în text:

| Parametrul | ${VARIANTE.map((x) => x.eticheta).join(" | ")} |
|---|---|---|---|
${tabelParam}

Salariul de bază al unei funcții este coeficientul din grilă înmulțit cu valoarea de referință, rotunjit în sus la leu (art. 10 alin. (4), la fel în toate variantele). Cum se ajunge de la coeficient la salariu, pas cu pas, e în [ghidul despre salariul de bază](/ghiduri/cum-se-calculeaza-salariul-de-baza).

## Ce s-a schimbat în grile, pe anexe?
Am potrivit funcțiile între cele trei variante după codul din grilă, nu după denumire, pentru că denumirile se schimbă de la un text la altul. Au intrat în comparație ${lei(totalComparate)} de funcții care au un cod unic în toate cele trei variante. Din ele, ${lei(sch12Tot)} (${pct(sch12Tot, totalComparate)}%) au alt coeficient în iulie față de mai, iar ${lei(sch23Tot)} (${pct(sch23Tot, totalComparate)}%) au alt coeficient în august față de iulie.

Ultimele două coloane compară salariul de bază mediu, deci țin cont și de valoarea de referință (4.100 lei în mai și iulie, ${lei(V3.valoareReferinta)} lei în august):

| Anexa | Domeniul | Funcții comparate | Coeficient schimbat, mai → iulie | Coeficient schimbat, iulie → august | Salariu de bază mediu, iulie față de mai | Salariu de bază mediu, august față de iulie |
|---|---|---|---|---|---|---|
${tabelAnexe}

Trecerea de la mai la iulie a urcat cel mai mult salariile de bază din Anexa ${maiMult12.g.anexa} (${proc(maiMult12.d12)} în medie). Trecerea de la iulie la august le-a scăzut cel mai mult în Anexa ${maiMult23Scad.g.anexa} (${proc(maiMult23Scad.d23)}), iar cel mai mult le-a crescut în Anexa ${maiMult23Cres.g.anexa} (${proc(maiMult23Cres.d23)}). Mediile sunt simple, pe funcții, fără a ține cont de câți angajați are fiecare funcție.

Anexele VI (apărare, ordine publică), VII (instituții din venituri proprii) și IX (demnitari) nu intră în tabel: solda de grad din Anexa VI și coeficienții eșalonați 2027–2031 din Anexa IX nu se potrivesc rând cu rând între variante, iar Anexa VII a primit secțiuni noi în iulie.

## Cum arată diferența pe patru funcții?
Aceleași funcții, urmărite pe cod prin cele trei variante. Salariul de bază la gradația 0, în lei brut, cu valoarea de referință din fiecare variantă:

| Funcția | ${VARIANTE.map((x) => x.eticheta).join(" | ")} | Net în august (lei) |
|---|---|---|---|---|
${tabelExemple}

Coeficienții din spatele acestor salarii:

| Funcția | ${VARIANTE.map((x) => x.eticheta).join(" | ")} |
|---|---|---|---|
${tabelCoef}

${scazuteAug === 0 ? "Niciuna dintre cele patru funcții nu are un salariu de bază mai mic în august decât în iulie." : `${scazuteAug === exemple.length ? "Toate cele patru funcții au" : scazuteAug === 1 ? "O funcție din cele patru are" : `${scazuteAug}${de(scazuteAug)} funcții din cele patru au`} un salariu de bază mai mic în august decât în iulie, deși coeficientul a rămas la fel sau a crescut: valoarea de referință mai mică (${lei(V3.valoareReferinta)} lei față de ${lei(V2.valoareReferinta)} lei) se aplică tuturor.`} Netul din ultima coloană folosește regulile fiscale de azi (25% CAS, 10% CASS, 10% impozit pe venit), fără sporuri și fără persoane în întreținere. Pentru fiecare funcție în parte avem ghiduri separate: [profesorul](/ghiduri/salariu-profesor-noua-lege), [profesorul debutant](/ghiduri/salariu-profesor-debutant) și [asistentul medical](/ghiduri/salariu-asistent-medical-noua-lege).

## Ce a rămas la fel în toate variantele?
Mai multe reguli de calcul nu s-au schimbat între texte. Gradațiile din vechimea în muncă sunt cele din art. 13: +7,5% după 3 ani, apoi +5%, +5%, +2,5% și +2,5%, aplicate succesiv. Plafonul de 20% pentru sporuri (art. 21) se calculează pe ordonatorul principal de credite, nu pe fiecare angajat. Dacă salariul de bază din grilă ar ieși sub salariul minim, se plătește salariul minim (art. 10 alin. (8)). Diferența salarială tranzitorie protejează salariații al căror venit pe legea nouă ar ieși mai mic decât cel de dinainte; ce se schimbă e luna de raportare și dacă există o dată-limită, cum arată tabelul de mai sus.

## Ce aduce varianta din 20 august?
Pe lângă valoarea de referință de ${lei(V3.valoareReferinta)} lei, pe care Guvernul o poate modifica prin hotărâre în 2027 (art. 38 alin. (4)), textul din august schimbă grila în mai multe locuri:

- **Sănătate (Anexa II):** coeficienții din grilă sunt pentru unitățile de categoria a II-a; proiectul împarte unitățile în 6 categorii și adaugă factori de multiplicare pe grupe, stabiliți anual prin hotărâre de guvern. Fără acea hotărâre, salariile din celelalte categorii **nu pot fi calculate**. Detalii în ghidul despre [medicul rezident](/ghiduri/salariu-medic-rezident).
- **Administrație locală (Anexa VIII):** 5 trepte de populație în loc de 4 (au apărut treptele 120.001–200.000 și 50.001–120.000 de locuitori), iar funcționarii publici primesc gradele noi „superior 4/3/2”.
- **Demnitari (Anexa IX):** coeficienți eșalonați din 2026/2027 până în 2031, iar aleșii locali sunt detaliați pe 28 de trepte de populație.
- **Titlul de doctor:** o indemnizație fixă de 500 lei brut pe lună, în afara plafonului (art. 39). Calculatorul nu o modelează.
- **Cultură (Anexa III):** capitolul V (case de cultură, cămine culturale) lipsește din fișierul de coeficienți publicat în august.

## Unde găsesc grila de salarizare 2026 pe anexe?
Grila completă a fiecărei anexe, cu coeficienții și salariile de bază din cele trei variante, e pe pagina [grila de salarizare](/grila), împărțită pe domenii: ${GRILE.map((g) => `[Anexa ${g.anexa}](/grila/${g.slug})`).join(", ")}. Pentru funcționarii publici și administrația locală, grila e la [Anexa VIII](/grila/administratie).

## Cum aflu cât ar fi salariul meu pe legea nouă?
Cel mai simplu e [calculatorul de salarii pentru bugetari](/): alegi varianta (25 mai, 17 iulie sau 20 august), funcția, gradația și sporurile, iar calculatorul arată salariul brut și net. Pentru învățământ, sănătate, funcții publice, militari sau diplomați, aceleași calcule sunt în același loc, cu cele trei variante una lângă alta.

## Greșeli frecvente când citești proiectul
- **Confunzi varianta:** o cifră văzută într-o știre poate fi din mai, din iulie sau din august. Verifică data textului și valoarea de referință.
- **Compari salariul net cu cel brut:** coeficientul înmulțit cu valoarea de referință dă salariul de bază brut, nu banii primiți în mână.
- **Uiți de spor și gradație:** grila arată gradația 0; vechimea în muncă și sporurile se adaugă peste ea.
- **Iei un proiect drept lege:** nicio dată de intrare în vigoare din text nu se aplică până când legea nu e adoptată și promulgată.

> Atenție: legea nu a fost adoptată. Pe 26 august 2026 partidele au anunțat că nu au ajuns la consens și s-au angajat să adopte legea până la sfârșitul anului. Cifrele de mai sus arată ce prevede fiecare variantă a proiectului, nu salariile în vigoare.

Actualizat la 20 octombrie 2026.`;

  return {
    slug: "legea-salarizarii-2026-cele-trei-variante",
    categorie: "Analiză",
    titlu: "Legea salarizării 2026: ce prevăd cele trei variante ale proiectului",
    titluMeta: "Legea salarizării 2026: cele trei variante ale proiectului",
    descriere: `Legea salarizării 2026, pe înțelesul tuturor: ce s-a schimbat între variantele din mai, iulie și august, cu valoarea de referință de ${lei(v.valoareReferinta)} lei și grilele pe anexe.`,
    cuvantCheie: "legea salarizarii 2026",
    raspuns,
    peScurt: [
      `Legea salarizării 2026 e un proiect MMFTSS, în trei variante: ${VARIANTE.map((x) => x.eticheta).join(", ")}. Nu a fost adoptat.`,
      `Valoarea de referință: ${VARIANTE.map((x) => `${lei(x.valoareReferinta)} lei`).join(" → ")}.`,
      `Intrarea în vigoare: ${V1.intrareInVigoareText} în prima variantă, ${V2.intrareInVigoareText} în următoarele două.`,
      `Din ${lei(totalComparate)} de funcții comparate pe cod, ${lei(sch12Tot)} au alt coeficient în iulie față de mai și ${lei(sch23Tot)} în august față de iulie.`,
      "Gradațiile (art. 13), plafonul de 20% al sporurilor (art. 21) și rotunjirea (art. 10) sunt aceleași în toate variantele.",
    ],
    publicat: "2026-10-20",
    actualizat: "2026-10-20",
    corp,
    faq: [
      {
        q: "Care e legea salarizării din 2026?",
        a: `Nu există încă o lege nouă. „Legea salarizării 2026” este proiectul MMFTSS, publicat în trei variante (${VARIANTE.map((x) => x.eticheta).join(", ")}). Salariile se plătesc în continuare pe Legea 153/2017, până la adoptarea unei legi noi.`,
      },
      {
        q: "A fost adoptat proiectul legii salarizării 2026?",
        a: "Nu. Pe 26 august 2026 partidele au anunțat că nu au ajuns la consens și s-au angajat să adopte legea până la sfârșitul anului. Nu există o dată sigură de adoptare.",
      },
      {
        q: "Ce valoare de referință are ultima variantă a proiectului?",
        a: `${lei(v.valoareReferinta)} lei pentru ${v.perioadaValoareReferinta} (${v.articolValoareReferinta}). În variantele din mai și iulie era 4.100 lei. Salariul de bază se obține înmulțind coeficientul din grilă cu această valoare.`,
      },
      {
        q: "Care sunt anexele legii salarizării 2026?",
        a: `Sunt nouă anexe: ${ANEXE.map((a) => `${a.anexa} (${a.nume.toLowerCase()})`).join(", ")}. Grilele lor sunt pe pagina de grile a calculatorului.`,
      },
      {
        q: "De când s-ar aplica noile salarii?",
        a: `Varianta din ${v.eticheta} prevede intrarea în vigoare pe ${v.intrareInVigoareText} (${v.articolIntrareInVigoare}), dar doar dacă legea e adoptată și promulgată. Prima variantă, din mai, prevedea 1 ianuarie 2027.`,
      },
      {
        q: "Unde văd grila de salarizare 2026 pentru funcționarii publici?",
        a: "În Anexa VIII (administrație), pe pagina de grile a calculatorului. Acolo sunt coeficienții funcțiilor publice și ai personalului contractual, pe treptele de populație ale localităților, din toate cele trei variante.",
      },
    ],
    surse: [
      ...VARIANTE.flatMap((x) => x.surse.slice(0, 2)).map((s) => ({ titlu: s.titlu, url: s.url.startsWith("/") ? `${SITE_URL}${s.url}` : s.url })),
      ...v.surse.filter((s) => s.url.startsWith("/")).map((s) => ({ titlu: s.titlu, url: `${SITE_URL}${s.url}` })),
    ].filter((s, i, a) => a.findIndex((y) => y.url === s.url) === i),
    legaturi: [
      ["/", "Calculatorul de salarii pentru bugetari, cu cele trei variante"],
      ["/grila", "Grila de salarizare pe toate anexele"],
      ["/ghiduri/cum-se-calculeaza-salariul-de-baza", "Cum se calculează salariul de bază"],
    ],
  };
}
