/**
 * Ghid: salariul cadrului didactic debutant din învățământul preuniversitar în proiectul legii salarizării
 * (Anexa I). Cele cinci rânduri de debutant (profesor, institutor/maistru-instructor, învățător/educatoare)
 * se aleg din grilă, se potrivesc între variante pe codul funcției și se compară cu rândul de definitiv
 * cu 1–5 ani în învățământ; salariul de bază și netul se calculează cu funcțiile calculatorului (lib/tax.ts).
 */
import { VARIANTE, VARIANTA_IMPLICITA, getVarianta, type Varianta } from "../variants";
import { getFunctii, type CoefEntry } from "../variants-data";
import { aplicaGradatie, calcBrut, GRADATII, SAL_MIN_BRUT, SPORURI_STANDARD } from "../tax";
import { de } from "../seo";
import type { Ghid } from "./tip";

const lei = (n: number) => n.toLocaleString("ro-RO");
const coef = (n: number) => n.toLocaleString("ro-RO", { maximumFractionDigits: 6 });
const STUDII: Record<string, string> = { S: "superioare de lungă durată", SSD: "superioare de scurtă durată", M: "medii (nivel liceal)" };

/** rândurile de debutant din capitolul cadrelor didactice (cod 11.00501…), cele cu cod și coeficient */
function debutanti(id: Varianta["id"]): CoefEntry[] {
  return getFunctii(id)
    .filter((e) => e.anexa === "I" && e.cod?.startsWith("11.00501") && /debutant/i.test(e.functie) && e.coeficient > 0)
    .sort((a, b) => a.cod.localeCompare(b.cod));
}

/** denumirea funcției fără studii și fără „debutant”: „Profesor; educator-puericultor; profesor-antrenor” */
const functie = (e: CoefEntry) =>
  e.functie
    .replace(/\s*[,(]?\s*(cu )?studii.*$/i, "")
    .replace(/\s*debutant\s*$/i, "")
    .replace(/\s*,\s*$/, "")
    .replace(/\s*-\s*/g, "-")
    .replace(/maistru instructor/gi, "maistru-instructor")
    .replace(/ş/g, "ș")
    .replace(/ţ/g, "ț")
    .trim();

/** rândul de definitiv cu 1–5 ani în învățământ din aceeași grupă: codul grupei de dinainte, aceeași funcție */
function definitiv(id: Varianta["id"], deb: CoefEntry): CoefEntry | undefined {
  const grupa = Number(deb.cod.slice(3, 11)) - 1;
  const pref = `11.${String(grupa).padStart(8, "0")}`;
  return getFunctii(id).find((e) => e.anexa === "I" && e.cod?.startsWith(pref) && /definitiv/i.test(e.functie) && e.vechime === "1-5 ani" && e.studii === deb.studii);
}

const baza = (e: CoefEntry, v: Varianta, g = 0) => aplicaGradatie(e.coeficient * v.valoareReferinta, g);
const net = (brut: number, v: Varianta, sub26Ani = false) =>
  calcBrut({ salariuBaza: brut, sporuri: [], valoareReferinta: v.valoareReferinta, sub26Ani }).salariuNet;

export function ghid(): Ghid {
  const v = getVarianta(VARIANTA_IMPLICITA);
  const randuri = debutanti(v.id);
  if (randuri.length < 3) throw new Error(`ghid debutant: doar ${randuri.length} rânduri de debutant în ${v.id}`);
  const prof = randuri.find((e) => /^Profesor/i.test(e.functie) && e.studii === "S");
  const invatator = randuri.find((e) => e.studii === "M");
  if (!prof || !invatator) throw new Error("ghid debutant: lipsește profesorul (S) sau învățătorul (M) debutant");
  const defProf = definitiv(v.id, prof);
  if (!defProf) throw new Error("ghid debutant: lipsește profesorul definitiv cu 1–5 ani");
  for (const e of randuri) if (!definitiv(v.id, e)) throw new Error(`ghid debutant: fără rând de definitiv pentru ${e.cod}`);

  const bProf = baza(prof, v);
  const nProf = net(bProf, v);
  const bInv = baza(invatator, v);
  const min = Math.min(...randuri.map((e) => baza(e, v)));
  const max = Math.max(...randuri.map((e) => baza(e, v)));
  const subMinim = randuri.filter((e) => baza(e, v) < SAL_MIN_BRUT).length;
  const pragDeducere = SAL_MIN_BRUT + 2000;
  const cuDeducere = randuri.filter((e) => baza(e, v) <= pragDeducere).length;
  const n26 = net(bProf, v, true);

  const tabel = randuri
    .map((e) => `| ${functie(e)} | ${STUDII[e.studii] ?? e.studii} | ${coef(e.coeficient)} | ${lei(baza(e, v))} | ${lei(net(baza(e, v), v))} |`)
    .join("\n");

  const tabelDefinitiv = randuri
    .map((e) => {
      const d = definitiv(v.id, e)!;
      const dif = baza(d, v) - baza(e, v);
      return `| ${functie(e)}, studii ${STUDII[e.studii] ?? e.studii} | ${lei(baza(e, v))} | ${lei(baza(d, v))} | ${dif >= 0 ? "+" : ""}${lei(dif)} |`;
    })
    .join("\n");
  const difProf = baza(defProf, v) - bProf;

  const grad = GRADATII.map((g) => `| ${g.nivel} | ${g.numeRange} | ${g.cota ? `+${g.cota.toLocaleString("ro-RO")}%` : "—"} | ${lei(baza(prof, v, g.nivel))} | ${lei(net(baza(prof, v, g.nivel), v))} |`).join("\n");

  // comparația între variante, pe cod
  const peCod = new Map(VARIANTE.map((x) => [x.id, new Map(debutanti(x.id).map((e) => [e.cod, e]))]));
  const comparatie = randuri
    .map((e) => {
      const cel = VARIANTE.map((x) => {
        const r = peCod.get(x.id)!.get(e.cod);
        return r ? `${lei(baza(r, x))} (${coef(r.coeficient)})` : "—";
      });
      return `| ${functie(e)}, ${e.studii} | ${cel.join(" | ")} |`;
    })
    .join("\n");
  const profPe = VARIANTE.map((x) => {
    const r = peCod.get(x.id)!.get(prof.cod);
    return r ? { x, b: baza(r, x), c: r.coeficient } : null;
  }).filter((z): z is { x: Varianta; b: number; c: number } => z !== null);
  const maxPe = profPe.reduce((a, b) => (b.b > a.b ? b : a));
  const frazaVariante =
    maxPe.x.id === v.id
      ? `Pentru profesorul debutant cu studii superioare de lungă durată, varianta din ${v.eticheta} dă cel mai mare salariu de bază dintre cele trei.`
      : `Pentru profesorul debutant cu studii superioare de lungă durată, cel mai mare salariu de bază dintre cele trei variante apare în cea din ${maxPe.x.eticheta} (${lei(maxPe.b)} lei), chiar dacă varianta din ${v.eticheta} are coeficientul ${coef(prof.coeficient)}: valoarea de referință ${maxPe.x.valoareReferinta === v.valoareReferinta ? "e aceeași" : `a scăzut de la ${lei(maxPe.x.valoareReferinta)} la ${lei(v.valoareReferinta)} lei`}.`;

  const sporuri = SPORURI_STANDARD.filter((s) => s.aplicabilAnexe?.includes("I") && /^Anexa I art\. \d+/.test(s.descriere ?? "") && !/superior|universit/i.test(`${s.nume} ${s.descriere ?? ""}`));
  if (sporuri.length === 0) throw new Error("ghid debutant: fără sporuri pentru Anexa I");
  const listaSporuri = sporuri
    .map((s) => {
      const art = s.descriere?.match(/^Anexa I art\. \d+/)?.[0];
      return `- ${s.nume}${art ? ` (${art.replace("Anexa I art.", "Anexa I, art.")})` : ""}${s.inclusInPlafon20 ? "" : ": nu intră în plafonul de 20%"}.`;
    })
    .join("\n");

  const nr = randuri.length;
  const raspuns = `În proiectul legii salarizării din ${v.eticheta}, un profesor debutant cu studii superioare de lungă durată ar avea salariul de bază de ${lei(bProf)} lei brut (coeficient ${coef(prof.coeficient)} × ${lei(v.valoareReferinta)} lei) și ${lei(nProf)} lei net, fără sporuri. Învățătorul sau educatoarea debutantă cu studii medii: ${lei(bInv)} lei brut. Proiectul nu a fost adoptat.`;

  const corp = `## Cât ar fi salariul unui profesor debutant pe noua lege?
Un profesor debutant cu studii superioare de lungă durată ar avea un salariu de bază de **${lei(bProf)} lei brut pe lună** în varianta din ${v.eticheta} a proiectului, adică ${lei(nProf)} lei net fără sporuri și fără persoane în întreținere. Suma vine din coeficientul ${coef(prof.coeficient)} înmulțit cu valoarea de referință de ${lei(v.valoareReferinta)} lei (${v.articolValoareReferinta}), cu rotunjire în sus la leu (art. 10 alin. (4) din proiect).

Debutantul are un singur rând în grilă, pentru o vechime în învățământ de până la 1 an. Pe același rând stau, în Anexa I a proiectului, profesorul, educatorul-puericultorul și profesorul-antrenor. Ghidul de față se ocupă doar de debutanți; pentru toate gradele didactice, vezi [salariul profesorului pe noua lege](/ghiduri/salariu-profesor-noua-lege).

## Cât ia un debutant, după funcție și studii?
Grila are ${nr}${de(nr)} rânduri de debutant pentru cadrele didactice din preuniversitar, iar salariul de bază merge de la ${lei(min)} la ${lei(max)} lei brut, la gradația 0:

| Funcția | Studii | Coeficient | Salariu de bază (lei) | Net (lei) |
${tabel}

${subMinim === 0 ? `Toate rândurile sunt peste salariul minim brut de ${lei(SAL_MIN_BRUT)} lei, așa că regula din art. 10 alin. (8) (se plătește cel puțin salariul minim) nu intervine aici.` : `${subMinim === 1 ? "Un rând e" : `${subMinim}${de(subMinim)} rânduri sunt`} sub salariul minim brut de ${lei(SAL_MIN_BRUT)} lei; acolo se plătește salariul minim (art. 10 alin. (8)).`} Netul e calculat cu regulile fiscale de azi: 25% CAS, 10% CASS și 10% impozit pe venit, fără persoane în întreținere.

## Primește un debutant tânăr deducerea pentru cei sub 26 de ani?
${cuDeducere === 0 ? `Nu, la aceste salarii nu se aplică. Codul fiscal (art. 77 alin. (10) lit. a)) dă tinerilor sub 26 de ani o deducere suplimentară de 15% din salariul minim, dar doar până la un brut de ${lei(pragDeducere)} lei (salariul minim + 2.000 de lei). Toate rândurile de debutant din tabel sunt peste acest prag, așa că netul unui profesor debutant de 24 de ani e același: ${lei(n26)} lei.` : `Doar la ${cuDeducere === 1 ? "un rând" : `${cuDeducere}${de(cuDeducere)} rânduri`} din tabel. Codul fiscal (art. 77 alin. (10) lit. a)) dă tinerilor sub 26 de ani o deducere suplimentară de 15% din salariul minim, dar doar până la un brut de ${lei(pragDeducere)} lei (salariul minim + 2.000 de lei). Pentru profesorul debutant cu studii superioare de lungă durată, netul ar fi ${lei(n26)} lei cu deducerea pentru tineri, față de ${lei(nProf)} lei fără ea.`} La fel, deducerea personală obișnuită (art. 77) dispare peste ${lei(pragDeducere)} lei brut.

## Cât crește salariul după definitivat?
După definitivare, rândul din grilă se schimbă: profesorul definitiv cu 1–5 ani în învățământ și studii superioare de lungă durată are coeficientul ${coef(defProf.coeficient)}, adică ${lei(baza(defProf, v))} lei brut, cu ${lei(Math.abs(difProf))}${de(Math.abs(difProf))} lei ${difProf >= 0 ? "mai mult" : "mai puțin"} decât debutantul. Pentru fiecare rând de debutant, comparat cu rândul de definitiv cu 1–5 ani în învățământ, din aceeași funcție și cu aceleași studii:

| Funcția și studiile | Debutant (lei) | Definitiv, 1–5 ani (lei) | Diferența (lei) |
${tabelDefinitiv}

Treptele următoare (gradul didactic II și I, plus vechimea în învățământ) sunt în [grila învățământului](/grila/invatamant-cercetare).

## Are un debutant drept la gradație?
Da, dacă are deja ani de muncă: gradația vine din vechimea în muncă, nu din vechimea în învățământ (art. 13 din proiect). Un profesor debutant care a lucrat înainte în alt domeniu intră tot pe rândul de debutant, dar salariul din grilă crește succesiv cu +7,5% după 3 ani de muncă, apoi cu câte +5%, +5%, +2,5% și +2,5%:

| Gradația | Vechime în muncă | Creștere | Salariu de bază (lei) | Net (lei) |
${grad}

Gradul didactic (debutant, definitiv, II, I) schimbă rândul din grilă; gradația doar înmulțește salariul din rândul ales.

## Ce s-a schimbat între cele trei variante ale proiectului?
Ministerul Muncii a publicat trei variante: ${VARIANTE.map((x) => `${x.eticheta} (valoarea de referință ${lei(x.valoareReferinta)} lei)`).join(", ")}. Salariul de bază al debutanților, la gradația 0, cu coeficientul în paranteză:

| Funcția, studii | ${VARIANTE.map((x) => x.eticheta).join(" | ")} |
${comparatie}

Rândurile sunt potrivite între variante după codul funcției din grilă. ${frazaVariante}

## Ce sporuri se pot adăuga pentru un debutant?
Anexa I are sporuri legate de locul și condițiile de muncă, nu de gradul didactic. Dacă lucrezi în situația respectivă, le poți adăuga în calculator peste salariul de bază:

${listaSporuri}

Plafonul de 20% al sporurilor se calculează pe ordonatorul principal de credite, nu pe fiecare angajat (art. 21 alin. (2)). Pentru salariul tău, cu gradație, sporuri și net, folosește [calculatorul](/).

> Atenție: legea nu a fost adoptată. Pe 26 august 2026 partidele au anunțat că nu au ajuns la consens și s-au angajat să adopte legea până la sfârșitul anului. Cifrele de mai sus arată ce prevede proiectul, nu salariile în vigoare.`;

  const gMax = GRADATII.length - 1;
  return {
    slug: "salariu-profesor-debutant",
    categorie: "Ghid",
    titlu: "Salariul profesorului debutant pe noua lege a salarizării",
    titluMeta: "Salariu profesor debutant 2026 pe noua lege a salarizării",
    descriere: `Profesor debutant în proiectul din ${v.eticheta}: ${lei(bProf)} lei brut, ${lei(nProf)} lei net. Toți debutanții din grilă, creșterea după definitivat și variantele.`,
    cuvantCheie: "salariu profesor debutant 2026",
    raspuns,
    peScurt: [
      `Profesor debutant cu studii superioare de lungă durată: ${lei(bProf)} lei brut, ${lei(nProf)} lei net fără sporuri.`,
      `Învățător, educatoare, maistru-instructor debutant cu studii medii: ${lei(bInv)} lei brut.`,
      `După definitivat (1–5 ani în învățământ), profesorul trece la ${lei(baza(defProf, v))} lei brut.`,
      `Cu ani de muncă dinainte, debutantul primește gradații: până la ${lei(baza(prof, v, gMax))} lei brut cu gradația maximă.`,
      `Valoarea de referință din ${v.eticheta}: ${lei(v.valoareReferinta)} lei (${v.articolValoareReferinta}).`,
    ],
    publicat: "2026-10-02",
    actualizat: "2026-10-02",
    autor: { nume: "Alex Mantello", url: "https://alexandru.zed-zen.com" },
    corp,
    faq: [
      {
        q: "Cât ar câștiga net un profesor debutant pe noua lege?",
        a: `În varianta din ${v.eticheta}: ${lei(nProf)} lei net, din ${lei(bProf)} lei brut, pentru un debutant cu studii superioare de lungă durată, fără sporuri și fără persoane în întreținere.`,
      },
      {
        q: "Cât ar câștiga o educatoare sau un învățător debutant?",
        a: `Cu studii medii (nivel liceal), rândul de debutant are coeficientul ${coef(invatator.coeficient)}, adică ${lei(bInv)} lei brut și ${lei(net(bInv, v))} lei net în varianta din ${v.eticheta}.`,
      },
      {
        q: "De când s-ar aplica noile salarii pentru debutanți?",
        a: `Nu încă. Proiectul nu a fost adoptat. Varianta din ${v.eticheta} prevede intrarea în vigoare pe ${v.intrareInVigoareText} (${v.articolIntrareInVigoare}), dar doar dacă legea e votată și promulgată.`,
      },
      {
        q: "Ce se întâmplă dacă noul salariu e mai mic decât cel de acum?",
        a: `Proiectul prevede o diferență salarială tranzitorie (${v.articolDiferentaTranzitorie} în varianta din ${v.eticheta}), raportată la salariul din ${v.referintaDiferentaTranzitorie}. Salariile de acum, pe Legea 153/2017, nu sunt calculate aici.`,
      },
    ],
    surse: [
      ...v.surse.map((s) => ({ titlu: s.titlu, url: s.url.startsWith("/") ? `https://salarii.romaniatransparenta.eu${s.url}` : s.url })),
      { titlu: "Codul fiscal, Legea 227/2015 (Portal legislativ)", url: "https://legislatie.just.ro/Public/DetaliiDocument/171282", nota: "art. 77 (deducerea personală și deducerea pentru tinerii sub 26 de ani), art. 78 (impozitul), art. 138 (CAS), art. 156 (CASS)" },
    ],
    legaturi: [
      ["/grila/invatamant-cercetare", "Grila completă a învățământului (Anexa I)"],
      ["/", "Calculatorul: salariul tău, cu gradație, sporuri și net"],
      ["/ghiduri/salariu-profesor-noua-lege", "Cât ar câștiga un profesor pe noua lege (toate gradele didactice)"],
    ],
  };
}
