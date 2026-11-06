/**
 * Ghid: salariul asistentului social în proiectul legii salarizării (Anexa II, capitolul I, punctul 3).
 * Coeficienții vin din seturile variantelor (lib/variants-data.ts), potriviți între variante pe codul funcției;
 * salariul de bază și netul se calculează cu aceleași funcții ca în calculator (lib/tax.ts).
 */
import { VARIANTE, VARIANTA_IMPLICITA, getVarianta, type Varianta } from "../variants";
import { getFunctii, type CoefEntry } from "../variants-data";
import { aplicaGradatie, calcBrut, GRADATII, SAL_MIN_BRUT } from "../tax";
import { SITE_URL } from "../seo";
import type { Ghid } from "./tip";

const lei = (n: number) => n.toLocaleString("ro-RO");
const coef = (n: number) => n.toLocaleString("ro-RO", { maximumFractionDigits: 6 });

const COD_TREAPTA: Record<string, string> = {
  "21.00303001.01.1": "principal",
  "21.00303002.01.1": "specialist",
  "21.00303003.01.1": "practicant",
  "21.00303004.01.1": "debutant",
};
const COD_MEDII = ["21.00303028.06.1", "21.00303029.06.1", "21.00303030.06.1"];
const COD_PERSONAL = "21.00303045.04.1";

/** rândurile din Anexa II, capitolul I punctul 3, după cod (același cod în toate variantele) */
function randuri(id: Varianta["id"], coduri: string[]): CoefEntry[] {
  const lista = getFunctii(id).filter((e) => e.anexa === "II" && e.capitol === "CI 3" && coduri.includes(e.cod) && e.coeficient > 0);
  return coduri.map((c) => lista.find((e) => e.cod === c)).filter((e): e is CoefEntry => !!e);
}

const baza = (e: CoefEntry, v: Varianta, g = 0) => {
  const b = aplicaGradatie(e.coeficient * v.valoareReferinta, g);
  return Math.max(b, SAL_MIN_BRUT);
};
const net = (brut: number, v: Varianta) => calcBrut({ salariuBaza: brut, sporuri: [], valoareReferinta: v.valoareReferinta }).salariuNet;

export function ghid(): Ghid {
  const v = getVarianta(VARIANTA_IMPLICITA);
  const trepte = randuri(v.id, Object.keys(COD_TREAPTA));
  if (trepte.length !== 4) throw new Error(`ghid asistent social: ${trepte.length} trepte în ${v.id}`);
  const medii = randuri(v.id, COD_MEDII);
  const personal = randuri(v.id, [COD_PERSONAL])[0];
  if (medii.length !== 3 || !personal) throw new Error("ghid asistent social: lipsesc rândurile de studii medii / personal");

  const [principal, specialist, practicant, debutant] = trepte as [CoefEntry, CoefEntry, CoefEntry, CoefEntry];
  const g5 = GRADATII.length - 1;
  const treapta = (e: CoefEntry) => COD_TREAPTA[e.cod]!;

  const tabel = trepte
    .map((e) => `| ${treapta(e)} | ${coef(e.coeficient)} | ${lei(baza(e, v))} | ${lei(baza(e, v, g5))} | ${lei(net(baza(e, v), v))} |`)
    .join("\n");
  const grad = GRADATII.map((g) => `| ${g.nivel} | ${g.numeRange} | ${g.cota ? `+${g.cota.toLocaleString("ro-RO")}%` : "—"} | ${lei(baza(debutant, v, g.nivel))} | ${lei(baza(principal, v, g.nivel))} |`).join("\n");

  const cuvariante = VARIANTE.map((x) => ({ x, r: randuri(x.id, Object.keys(COD_TREAPTA)) }));
  const comparatie = Object.keys(COD_TREAPTA)
    .map((cod, i) => `| ${COD_TREAPTA[cod]} | ${cuvariante.map(({ x, r }) => (r[i] ? lei(baza(r[i]!, x)) : "—")).join(" | ")} |`)
    .join("\n");

  const idx = VARIANTE.findIndex((x) => x.id === v.id);
  const ant = idx > 0 ? VARIANTE[idx - 1] : null;
  const antR = ant ? randuri(ant.id, Object.keys(COD_TREAPTA)) : [];
  const egale = antR.filter((e, i) => e.coeficient === trepte[i]?.coeficient).length;
  const frazaVariante = ant
    ? `Față de varianta din ${ant.eticheta}, ${egale} din ${trepte.length} coeficienți ai asistenților sociali au rămas la fel, iar valoarea de referință ${ant.valoareReferinta === v.valoareReferinta ? `a rămas ${lei(v.valoareReferinta)} lei` : `a trecut de la ${lei(ant.valoareReferinta)} la ${lei(v.valoareReferinta)} lei`}.`
    : "";

  const tabelMedii = medii
    .map((e, i) => `| ${["tehnician de asistență socială, principal", "tehnician de asistență socială", "tehnician de asistență socială, debutant"][i]} | ${coef(e.coeficient)} | ${lei(baza(e, v))} | ${lei(net(baza(e, v), v))} |`)
    .join("\n");

  const raspuns = `În proiectul legii salarizării din ${v.eticheta}, un asistent social debutant ar avea salariul de bază de ${lei(baza(debutant, v))} lei brut (coeficient ${coef(debutant.coeficient)} × ${lei(v.valoareReferinta)} lei), iar unul principal ${lei(baza(principal, v))} lei, la gradația 0 și fără sporuri. Proiectul nu a fost adoptat.`;

  const corp = `## Cât ar fi salariul unui asistent social pe noua lege?
Un asistent social ar avea un salariu de bază între **${lei(baza(debutant, v))} și ${lei(baza(principal, v))} lei brut pe lună** la gradația 0, în varianta din ${v.eticheta} a proiectului, după treaptă: debutant, practicant, specialist sau principal. Se obține înmulțind coeficientul din grilă cu valoarea de referință de ${lei(v.valoareReferinta)} lei (${v.articolValoareReferinta}), cu rotunjire în sus la leu. Net, fără sporuri și fără persoane în întreținere, rămân ${lei(net(baza(debutant, v), v))} lei la debutant și ${lei(net(baza(principal, v), v))} lei la principal.

Cifrele sunt pentru asistenții sociali din unitățile de asistență socială încadrate în Anexa II (sănătate și asistență socială), capitolul I, punctul 3. Grila completă a anexei e pe [pagina grilei de sănătate și asistență socială](/grila/sanatate-asistenta-sociala).

## Cât ia un asistent social, după treaptă?
Grila are patru trepte pentru asistentul social cu studii superioare. Funcția apare în același rând cu asistentul de sprijin pentru victime:

| Treapta | Coeficient | Salariu de bază, gradația 0 (lei) | Cu peste 20 de ani vechime (lei) | Net la gradația 0 (lei) |
${tabel}

Netul e calculat cu regulile fiscale de azi: 25% CAS, 10% CASS și 10% impozit pe venit, cu deducerea personală din Codul fiscal (art. 77), fără persoane în întreținere. Deducerea personală se acordă doar până la un brut de ${lei(SAL_MIN_BRUT + 2000)} lei (salariul minim de ${lei(SAL_MIN_BRUT)} lei + 2.000 de lei), așa că la rândurile de mai sus e zero.

## Cât contează vechimea în muncă?
Vechimea în muncă aduce gradații care se aplică succesiv peste salariul din grilă (art. 13 din proiect): +7,5% după 3 ani, apoi câte +5%, +5%, +2,5% și +2,5%. Pentru asistentul social debutant și pentru cel principal:

| Gradația | Vechime în muncă | Creștere | Debutant, salariu de bază (lei) | Principal, salariu de bază (lei) |
${grad}

Treapta (debutant, practicant, specialist, principal) este altceva decât gradația: treapta schimbă coeficientul din grilă, gradația adaugă procente la salariul rezultat.

## Și tehnicianul de asistență socială, cât ar câștiga?
Tehnicianul de asistență socială, cu studii medii, e în același capitol al grilei, într-un rând comun cu alte funcții de nivel mediu (educator, asistent medical, asistent BFT). Salariul de bază la gradația 0:

| Funcția | Coeficient | Salariu de bază (lei) | Net (lei) |
${tabelMedii}

Părintele social, îngrijitorul la domiciliu și asistentul personal au coeficientul ${coef(personal.coeficient)}, adică ${lei(personal.coeficient * v.valoareReferinta)} lei brut înainte de rotunjire și comparare cu salariul minim. ${personal.coeficient * v.valoareReferinta < SAL_MIN_BRUT ? `Cum e sub salariul minim brut de ${lei(SAL_MIN_BRUT)} lei, se plătește salariul minim (art. 10 alin. (8) din proiect): ${lei(baza(personal, v))} lei brut.` : ""}

## Ce s-a schimbat între cele trei variante ale proiectului?
Ministerul Muncii a publicat trei variante: ${VARIANTE.map((x) => `${x.eticheta} (valoarea de referință ${lei(x.valoareReferinta)} lei)`).join(", ")}. Salariul de bază la gradația 0 al asistentului social, pe trepte, potrivit după codul funcției din grilă:

| Treapta | ${VARIANTE.map((x) => x.eticheta).join(" | ")} |
${comparatie}

${frazaVariante}

## Asistentul social din primărie sau din consiliul județean e în aceeași grilă?
Nu neapărat. Funcția de asistent social apare și în Anexa VIII (administrația publică locală), cu alte rânduri și alți coeficienți, pe niveluri ale unității administrativ-teritoriale. Care grilă se aplică depinde de încadrarea postului în statul de funcții al instituției. Pentru Anexa VIII vezi [grila administrației](/grila/administratie), iar pentru funcționarii publici, [ghidul despre salariile funcționarilor publici](/ghiduri/salarii-functionari-publici-2026).

## Ce sporuri se adaugă peste salariul de bază?
Sporurile specifice sănătății și asistenței sociale sunt în Anexa II, capitolul II. În calculator le poți adăuga pe cele pe care le primești. Plafonul de 20% al sporurilor se calculează pe ordonatorul principal de credite, nu pe fiecare angajat (art. 21 alin. (2)): un angajat poate avea sporuri de peste 20% din salariul lui, cât timp media pe instituție nu trece de plafon.

## Ce se întâmplă dacă noul salariu e mai mic decât cel de acum?
Proiectul prevede o diferență salarială tranzitorie (${v.articolDiferentaTranzitorie} în varianta din ${v.eticheta}), raportată la salariul din ${v.referintaDiferentaTranzitorie}: dacă salariul pe legea nouă iese mai mic, diferența se plătește în continuare. Calculatorul o estimează în modul ghidat, pornind de la salariul tău de acum.

> Atenție: legea nu a fost adoptată. Pe 26 august 2026 partidele au anunțat că nu au ajuns la consens și s-au angajat să adopte legea până la sfârșitul anului. Cifrele de mai sus arată ce prevede proiectul, nu salariile în vigoare.`;

  return {
    slug: "salariu-asistent-social-noua-lege",
    categorie: "Ghid",
    titlu: "Noua grilă de salarizare în asistența socială 2026: cât ar câștiga un asistent social",
    titluMeta: "Grila de salarizare asistență socială 2026: asistent social",
    descriere: `Asistent social pe noua lege a salarizării: ${lei(baza(debutant, v))}–${lei(baza(principal, v))} lei brut la gradația 0, pe trepte, cu gradații, net și comparația dintre variantele proiectului.`,
    cuvantCheie: "noua grila de salarizare in asistenta sociala 2026",
    raspuns,
    peScurt: [
      `Asistent social debutant: ${lei(baza(debutant, v))} lei brut la gradația 0, ${lei(net(baza(debutant, v), v))} lei net fără sporuri.`,
      `Asistent social principal: ${lei(baza(principal, v))} lei brut la gradația 0 și ${lei(baza(principal, v, g5))} lei cu peste 20 de ani vechime.`,
      `Coeficienții merg de la ${coef(debutant.coeficient)} (debutant) la ${coef(principal.coeficient)} (principal), înmulțiți cu valoarea de referință de ${lei(v.valoareReferinta)} lei.`,
      `Părintele social, îngrijitorul la domiciliu și asistentul personal ar primi salariul minim brut, ${lei(SAL_MIN_BRUT)} lei, dacă grila dă mai puțin.`,
      "Proiectul nu a fost adoptat: cifrele sunt calcule din grilă, nu salarii în vigoare.",
    ],
    publicat: "2026-11-06",
    actualizat: "2026-11-06",
    corp,
    faq: [
      {
        q: "Cât ar fi salariul unui asistent social debutant pe noua lege?",
        a: `În varianta din ${v.eticheta}: ${lei(baza(debutant, v))} lei brut la gradația 0 (coeficient ${coef(debutant.coeficient)}), adică ${lei(net(baza(debutant, v), v))} lei net, fără sporuri.`,
      },
      {
        q: "Cum arată noua grilă de salarizare în asistența socială?",
        a: `Asistenții sociali sunt în Anexa II, capitolul I, punctul 3, pe patru trepte: debutant (${coef(debutant.coeficient)}), practicant (${coef(practicant.coeficient)}), specialist (${coef(specialist.coeficient)}) și principal (${coef(principal.coeficient)}). Grila completă e pe pagina grilei de sănătate și asistență socială.`,
      },
      {
        q: "Se aplică noile salarii în asistența socială din 2026?",
        a: `Nu încă. Proiectul nu a fost adoptat. Varianta din ${v.eticheta} prevede intrarea în vigoare pe ${v.intrareInVigoareText} (${v.articolIntrareInVigoare}), dar doar dacă legea e votată și promulgată.`,
      },
      {
        q: "Gradația se adaugă la salariul din grilă?",
        a: "Da. Vechimea în muncă aduce +7,5% după 3 ani, apoi câte +5%, +5%, +2,5% și +2,5%, aplicate succesiv peste salariul de bază (art. 13 din proiect).",
      },
    ],
    surse: [
      ...v.surse.map((s) => ({ titlu: s.titlu, url: s.url.startsWith("/") ? `${SITE_URL}${s.url}` : s.url })),
      { titlu: "Codul fiscal, Legea 227/2015 (Portal legislativ)", url: "https://legislatie.just.ro/Public/DetaliiDocument/171282", nota: "art. 77 (deducerea personală), art. 78 (impozitul), art. 138 (CAS), art. 156 (CASS)" },
    ],
    legaturi: [
      ["/grila/sanatate-asistenta-sociala", "Grila completă a sănătății și asistenței sociale (Anexa II)"],
      ["/", "Calculatorul de salarii: salariul tău, cu gradație, sporuri și net"],
      ["/ghiduri/salariu-asistent-medical-noua-lege", "Ghid: salariul asistentului medical"],
    ],
  };
}
