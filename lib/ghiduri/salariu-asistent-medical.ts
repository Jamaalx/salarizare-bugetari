/**
 * Ghid: salariul asistentului medical în proiectul legii salarizării. Coeficienții vin din seturile
 * variantelor (data/variants, prin lib/variants-data.ts), potriviți între variante pe codul funcției;
 * salariul de bază și netul se calculează cu aceleași funcții ca în calculator (lib/tax.ts).
 */
import { VARIANTE, VARIANTA_IMPLICITA, getVarianta, type Varianta } from "../variants";
import { getFunctii, type CoefEntry } from "../variants-data";
import { aplicaGradatie, calcBrut, GRADATII, SAL_MIN_BRUT } from "../tax";
import type { Ghid } from "./tip";

const lei = (n: number) => n.toLocaleString("ro-RO");
const coef = (n: number) => n.toLocaleString("ro-RO", { maximumFractionDigits: 6 });
const STUDII: Record<string, string> = { S: "superioare (licență)", SSD: "superioare de scurtă durată", PL: "postliceale", M: "medii" };
const ORDINE = ["S", "SSD", "PL", "M"];

/** treapta din rând: „principal”, „debutant” sau fără (asistent medical) — în aug. e în coloana grad, înainte în denumire */
function treapta(e: CoefEntry): "principal" | "debutant" | "" {
  const t = `${e.grad} ${e.functie}`.toLowerCase();
  if (/principal/.test(t)) return "principal";
  if (/debutant/.test(t)) return "debutant";
  return "";
}

/** rândurile de asistent medical din unitățile sanitare (Anexa II, capitolul I 2), după cod */
function asistenti(id: Varianta["id"]): CoefEntry[] {
  return getFunctii(id).filter((e) => e.anexa === "II" && e.capitol === "CI 2" && /^Asistent medical/i.test(e.functie) && e.cod && e.coeficient > 0);
}

const baza = (e: CoefEntry, v: Varianta, g = 0) => aplicaGradatie(e.coeficient * v.valoareReferinta, g);
const net = (brut: number, v: Varianta) => calcBrut({ salariuBaza: brut, sporuri: [], valoareReferinta: v.valoareReferinta }).salariuNet;

export function ghid(): Ghid {
  const v = getVarianta(VARIANTA_IMPLICITA);
  const randuri = asistenti(v.id).sort(
    (a, b) => ORDINE.indexOf(a.studii) - ORDINE.indexOf(b.studii) || ["principal", "", "debutant"].indexOf(treapta(a)) - ["principal", "", "debutant"].indexOf(treapta(b)),
  );
  if (randuri.length < 6) throw new Error(`ghid asistent medical: doar ${randuri.length} rânduri în ${v.id}`);
  const peCod = new Map(VARIANTE.map((x) => [x.id, new Map(asistenti(x.id).map((e) => [e.cod, e]))]));

  const rs = randuri.find((e) => e.studii === "S" && treapta(e) === "")!;
  const rm = randuri.find((e) => e.studii === "M" && treapta(e) === "debutant") ?? randuri.at(-1)!;
  const rsp = randuri.find((e) => e.studii === "S" && treapta(e) === "principal") ?? rs;
  const g5 = GRADATII.length - 1;
  const min = Math.min(...randuri.map((e) => baza(e, v)));
  const max = Math.max(...randuri.map((e) => baza(e, v)));
  const sefi = getFunctii(v.id).filter((e) => e.anexa === "II" && e.capitol === "CI 1" && /^Asistent medical/i.test(e.functie) && e.coeficient > 0);

  const cuDeducere = randuri.filter((e) => baza(e, v) <= SAL_MIN_BRUT + 2000).length;
  const numeTreapta = (e: CoefEntry) => (treapta(e) === "" ? "asistent medical" : treapta(e));
  const tabel = randuri
    .map((e) => `| ${STUDII[e.studii] ?? e.studii} | ${numeTreapta(e)} | ${coef(e.coeficient)} | ${lei(baza(e, v))} | ${lei(baza(e, v, g5))} | ${lei(net(baza(e, v), v))} |`)
    .join("\n");

  const grad = GRADATII.map((g) => `| ${g.nivel} | ${g.numeRange} | ${g.cota ? `+${g.cota.toLocaleString("ro-RO")}%` : "—"} | ${lei(baza(rs, v, g.nivel))} | ${lei(net(baza(rs, v, g.nivel), v))} |`).join("\n");

  const comparatie = randuri
    .filter((e) => treapta(e) === "")
    .map((e) => {
      const cel = VARIANTE.map((x) => {
        const r = peCod.get(x.id)!.get(e.cod);
        return r ? lei(baza(r, x)) : "—";
      });
      return `| ${STUDII[e.studii] ?? e.studii} | ${cel.join(" | ")} |`;
    })
    .join("\n");

  // comparația cu varianta anterioară: câți coeficienți au rămas la fel și cum s-a mișcat valoarea de referință
  const idx = VARIANTE.findIndex((x) => x.id === v.id);
  const ant = idx > 0 ? VARIANTE[idx - 1] : null;
  const egale = ant ? randuri.filter((e) => peCod.get(ant.id)!.get(e.cod)?.coeficient === e.coeficient).length : 0;
  const frazaVariante = ant
    ? `Față de varianta din ${ant.eticheta}, ${egale === randuri.length ? "toți coeficienții asistenților au rămas la fel" : `${egale} din ${randuri.length} coeficienți ai asistenților au rămas la fel`}, iar valoarea de referință ${ant.valoareReferinta === v.valoareReferinta ? `a rămas ${lei(v.valoareReferinta)} lei` : `a trecut de la ${lei(ant.valoareReferinta)} la ${lei(v.valoareReferinta)} lei`}${ant.valoareReferinta > v.valoareReferinta && egale === randuri.length ? ", așa că salariul de bază iese mai mic" : ""}.`
    : "";

  const raspuns = `În proiectul legii salarizării din ${v.eticheta}, un asistent medical cu studii superioare dintr-un spital ar avea salariul de bază de ${lei(baza(rs, v))} lei brut la începutul carierei (coeficient ${coef(rs.coeficient)} × ${lei(v.valoareReferinta)} lei) și ${lei(baza(rs, v, g5))} lei cu peste 20 de ani vechime, fără sporuri. Proiectul nu a fost adoptat.`;

  const corp = `## Cât ar fi salariul unui asistent medical pe noua lege?
Salariul de bază al unui asistent medical cu studii superioare, fără gradul de principal, ar fi de **${lei(baza(rs, v))} lei brut pe lună** la gradația 0, în varianta din ${v.eticheta} a proiectului. Se obține înmulțind coeficientul din grilă, ${coef(rs.coeficient)}, cu valoarea de referință de ${lei(v.valoareReferinta)} lei (${v.articolValoareReferinta}), cu rotunjire în sus la leu. Net, fără sporuri și fără persoane în întreținere, rămân ${lei(net(baza(rs, v), v))} lei.

Cifrele sunt pentru asistenții medicali din unitățile sanitare (Anexa II, capitolul I, punctul 2 din grilă). Asistenții medicali din unitățile de asistență socială au rânduri separate, cu alți coeficienți, pe [grila sănătății](/grila/sanatate-asistenta-sociala).

## Cât ia un asistent medical, după studii și treaptă?
Grila are câte trei trepte (debutant, asistent medical, principal) pentru fiecare nivel de studii. La gradația 0, salariul de bază merge de la ${lei(min)} la ${lei(max)} lei brut:

| Studii | Treapta | Coeficient | Salariu de bază, gradația 0 (lei) | Cu peste 20 de ani vechime (lei) | Net la gradația 0 (lei) |
${tabel}

Netul e calculat cu regulile fiscale de azi: 25% CAS, 10% CASS și 10% impozit pe venit, cu deducerea personală din Codul fiscal (art. 77), fără persoane în întreținere. Deducerea personală se acordă doar până la un brut de ${lei(SAL_MIN_BRUT + 2000)} lei (salariul minim de ${lei(SAL_MIN_BRUT)} lei + 2.000 de lei), așa că ${cuDeducere === 0 ? "la toate rândurile de mai sus e zero" : `apare doar la ${cuDeducere === 1 ? "un rând" : `${cuDeducere} rânduri`} din tabel, iar la celelalte e zero`}.

## Cât contează vechimea în muncă?
Vechimea în muncă aduce gradații care se aplică succesiv peste salariul din grilă (art. 13 din proiect): +7,5% după 3 ani, apoi câte +5%, +5%, +2,5% și +2,5%. Pentru asistentul medical cu studii superioare:

| Gradația | Vechime în muncă | Creștere | Salariu de bază (lei) | Net (lei) |
${grad}

Gradul de principal e altceva decât gradația: se obține prin examen și schimbă coeficientul din grilă (${coef(rsp.coeficient)} în loc de ${coef(rs.coeficient)}, adică ${lei(baza(rsp, v))} lei la gradația 0).

## Ce s-a schimbat între cele trei variante ale proiectului?
Ministerul Muncii a publicat trei variante: ${VARIANTE.map((x) => `${x.eticheta} (valoarea de referință ${lei(x.valoareReferinta)} lei)`).join(", ")}. Salariul de bază la gradația 0, pentru asistentul medical fără grad de principal:

| Studii | ${VARIANTE.map((x) => x.eticheta).join(" | ")} |
${comparatie}

Rândurile sunt potrivite între variante după codul funcției din grilă. ${frazaVariante}

## Ce e diferit pentru spitale în varianta din 20 august?
În varianta din 20 august, coeficienții din grilă sunt cei pentru unitățile sanitare de **categoria a II-a**. Proiectul împarte unitățile în 6 categorii și adaugă factori de multiplicare pe grupe de personal (minimum 8%, 6%, 4% și 2%), stabiliți anual prin hotărâre de guvern. Până la acea hotărâre, salariul exact într-un spital de altă categorie nu poate fi calculat: cifrele de aici sunt pentru categoria a II-a.

## Ce sporuri se adaugă peste salariul de bază?
Sporurile specifice sănătății sunt în Anexa II, capitolul II. În calculator le poți adăuga pe cele pe care le primești: munca în trei ture, orele lucrate în weekend și de sărbători (la tariful orar majorat), gărzile (plătite la tariful orar), sporurile pentru condiții de muncă (care nu se cumulează între ele) și sporul pentru radiații, pe categorii.

Plafonul de 20% al sporurilor se calculează pe ordonatorul principal de credite, nu pe fiecare angajat (art. 21 alin. (2)): un asistent poate avea sporuri de peste 20% din salariul lui, cât timp media pe instituție nu trece de plafon. Unele sporuri, cum e cel pentru munca în trei ture, nu intră în plafon.

## Ce se întâmplă dacă noul salariu e mai mic decât cel de acum?
Proiectul prevede o diferență salarială tranzitorie (${v.articolDiferentaTranzitorie} în varianta din ${v.eticheta}), raportată la salariul din ${v.referintaDiferentaTranzitorie}: dacă salariul pe legea nouă iese mai mic, diferența se plătește în continuare. Calculatorul o estimează în modul ghidat, pornind de la salariul tău de acum.

## Cât câștigă azi un asistent medical?
Pe legea în vigoare (Legea 153/2017), salariile reale depind de spital, de sporuri și de vechime. Salariile plătite efectiv, din listele publicate de spitalele publice, sunt pe [spitale.romaniatransparenta.eu/salarii](https://spitale.romaniatransparenta.eu/salarii). Pentru salariul tău pe proiect, cu gradație, sporuri și net, folosește [calculatorul](/).

> Atenție: legea nu a fost adoptată. Pe 26 august 2026 partidele au anunțat că nu au ajuns la consens și s-au angajat să adopte legea până la sfârșitul anului. Cifrele de mai sus arată ce prevede proiectul, nu salariile în vigoare.`;

  return {
    slug: "salariu-asistent-medical-noua-lege",
    categorie: "Ghid",
    titlu: "Cât ar câștiga un asistent medical pe noua lege a salarizării",
    titluMeta: "Salariu asistent medical 2026 pe noua lege a salarizării",
    descriere: `Salariul de bază al asistentului medical în proiectul din ${v.eticheta}: ${lei(min)}–${lei(max)} lei brut la debut, pe studii și trepte, cu gradații, net și comparația între variante.`,
    cuvantCheie: "salariu asistent medical noua lege",
    raspuns,
    peScurt: [
      `Asistent medical cu studii superioare: ${lei(baza(rs, v))} lei brut la gradația 0, ${lei(net(baza(rs, v), v))} lei net fără sporuri.`,
      `Cu peste 20 de ani vechime: ${lei(baza(rs, v, g5))} lei brut (gradațiile din art. 13).`,
      `Debutant cu studii medii: ${lei(baza(rm, v))} lei brut.`,
      `Coeficienții din ${v.eticheta} sunt pentru spitalele de categoria a II-a; celelalte categorii depind de o hotărâre de guvern.`,
      `Asistent medical-șef: ${sefi.length ? `${lei(Math.min(...sefi.map((e) => baza(e, v))))}–${lei(Math.max(...sefi.map((e) => baza(e, v))))} lei brut` : "fără rând în această variantă"}.`,
    ],
    publicat: "2026-09-24",
    actualizat: "2026-09-24",
    corp,
    faq: [
      {
        q: "Cât ar fi salariul unui asistent medical debutant pe noua lege?",
        a: `În varianta din ${v.eticheta}: ${lei(baza(rm, v))} lei brut pentru un debutant cu studii medii și ${lei(baza(randuri.find((e) => e.studii === "S" && treapta(e) === "debutant") ?? rs, v))} lei pentru un debutant cu studii superioare, fără sporuri.`,
      },
      {
        q: "Cât câștigă un asistent medical principal?",
        a: `Cu studii superioare și gradul de principal, coeficientul e ${coef(rsp.coeficient)}: ${lei(baza(rsp, v))} lei brut la gradația 0 și ${lei(baza(rsp, v, g5))} lei cu peste 20 de ani vechime.`,
      },
      {
        q: "Se aplică noile salarii pentru asistenți din 2026?",
        a: `Nu încă. Proiectul nu a fost adoptat. Varianta din ${v.eticheta} prevede intrarea în vigoare pe ${v.intrareInVigoareText} (${v.articolIntrareInVigoare}), dar doar dacă legea e votată și promulgată.`,
      },
      {
        q: "Sporurile se adaugă la salariul din grilă?",
        a: "Da. Grila dă salariul de bază; sporurile pentru ture, weekend, gărzi, condiții de muncă și radiații se calculează separat, după regulile din Anexa II. Plafonul de 20% se verifică pe instituție, nu pe persoană.",
      },
    ],
    surse: [
      ...v.surse.map((s) => ({ titlu: s.titlu, url: s.url.startsWith("/") ? `https://salarii.romaniatransparenta.eu${s.url}` : s.url })),
      { titlu: "Anexa II, capitolul II: reglementări specifice sănătății (docx, copie locală)", url: "https://salarii.romaniatransparenta.eu/sources/ANEXA-II-Cap-II-REGLEMENTARI-specifice-varianta-20-mai-2026.docx" },
      { titlu: "Codul fiscal, Legea 227/2015 (Portal legislativ)", url: "https://legislatie.just.ro/Public/DetaliiDocument/171282", nota: "art. 77 (deducerea personală), art. 78 (impozitul), art. 138 (CAS), art. 156 (CASS)" },
    ],
    legaturi: [
      ["/grila/sanatate-asistenta-sociala", "Grila completă a sănătății (Anexa II)"],
      ["/", "Calculatorul: salariul tău, cu gradație, sporuri și net"],
    ],
  };
}
