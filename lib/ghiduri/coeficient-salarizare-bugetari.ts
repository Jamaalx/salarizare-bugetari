/**
 * Ghid: coeficientul de salarizare al bugetarilor = numărul din grilă care, înmulțit cu valoarea de referință,
 * dă salariul de bază. Intervalele de coeficienți pe anexe vin din getFunctii() (lib/variants-data.ts), comparația
 * între variante din același set de date. Anexa IX (demnitari) are coeficienți eșalonați 2027–2031 și nu intră în
 * tabelul de intervale; rândurile soldei de grad din Anexa VI nu sunt funcții și sunt excluse de getFunctii().
 */
import { VARIANTE, VARIANTA_IMPLICITA, getVarianta } from "../variants";
import { getFunctii, type CoefEntry } from "../variants-data";
import { aplicaGradatie, SAL_MIN_BRUT } from "../tax";
import { GRILE, SITE_URL } from "../seo";
import type { Ghid } from "./tip";

const lei = (n: number) => n.toLocaleString("ro-RO");
const zec = (n: number, z = 2) => n.toLocaleString("ro-RO", { maximumFractionDigits: z });
const de = (n: number) => (n % 100 === 0 || n % 100 >= 20 ? " de" : "");

/** cheia de potrivire între variante: codul funcției + studii + grad + vechime (codul singur nu e unic) */
const cheie = (e: CoefEntry) => [e.cod, e.studii, e.grad, e.vechime].join("|");

export function ghid(): Ghid {
  const v = getVarianta(VARIANTA_IMPLICITA);
  const VR = v.valoareReferinta;
  const baza = (c: number) => aplicaGradatie(c * VR, 0);
  const rinduri = getFunctii(v.id).filter((e) => e.coeficient > 0);

  const domenii = GRILE.filter((g) => g.anexa !== "IX").map((g) => {
    const r = rinduri.filter((e) => e.anexa === g.anexa);
    if (r.length === 0) throw new Error(`coeficient salarizare: anexa ${g.anexa} fără rânduri`);
    const min = r.reduce((a, b) => (b.coeficient < a.coeficient ? b : a));
    const max = r.reduce((a, b) => (b.coeficient > a.coeficient ? b : a));
    return { g, n: r.length, min, max };
  });
  const total = domenii.reduce((s, d) => s + d.n, 0);
  const cMin = Math.min(...domenii.map((d) => d.min.coeficient));
  const cMax = Math.max(...domenii.map((d) => d.max.coeficient));
  const sub = rinduri.filter((e) => e.anexa !== "IX" && e.coeficient * VR < SAL_MIN_BRUT).length;

  const unRand = (cod: string) => {
    const r = rinduri.filter((e) => e.cod === cod);
    if (r.length !== 1) throw new Error(`coeficient salarizare: codul ${cod} are ${r.length} rânduri`);
    return r[0]!;
  };
  const medic = unRand("21.00201003.01.1");
  const consilieri = ["81.20108002.04.4", "81.20108002.04.3", "81.20108002.04.2", "81.20108002.04.1"].map(unRand);

  // comparația cu varianta din 25 mai, pe rânduri care se potrivesc și sunt unice în ambele seturi
  const unice = (id: typeof v.id) => {
    const m = new Map<string, number>();
    const dup = new Set<string>();
    for (const e of getFunctii(id).filter((x) => x.coeficient > 0 && x.cod && x.anexa !== "IX")) {
      const k = cheie(e);
      if (m.has(k)) dup.add(k);
      m.set(k, e.coeficient);
    }
    for (const k of dup) m.delete(k);
    return m;
  };
  const vechi = VARIANTE[0]!;
  const mVechi = unice(vechi.id);
  const mNou = unice(v.id);
  let potrivite = 0;
  let mai = 0;
  let mici = 0;
  let egale = 0;
  for (const [k, c] of mNou) {
    const x = mVechi.get(k);
    if (x === undefined) continue;
    potrivite++;
    if (c > x) mai++;
    else if (c < x) mici++;
    else egale++;
  }
  if (potrivite < 100) throw new Error("coeficient salarizare: prea puține rânduri potrivite între variante");

  const tabelDomenii = domenii
    .map(
      (d) =>
        `| Anexa ${d.g.anexa} | [${d.g.titlu}](/grila/${d.g.slug}) | ${lei(d.n)} | ${zec(d.min.coeficient)} | ${zec(d.max.coeficient)} |`,
    )
    .join("\n");
  const tabelConsilier = consilieri
    .map((e) => `| ${e.grad} | ${zec(e.coeficient)} | ${zec(e.coeficient)} × ${lei(VR)} = ${lei(baza(e.coeficient))} |`)
    .join("\n");
  const cDeb = consilieri[0]!.coeficient;
  const cSup = consilieri[3]!.coeficient;

  const raspuns = `Coeficientul de salarizare e numărul din grila fiecărei funcții care, înmulțit cu valoarea de referință, dă salariul de bază. În varianta din ${v.eticheta} a proiectului legii, neadoptat, coeficienții merg de la ${zec(cMin)} la ${zec(cMax)}, iar valoarea de referință e ${lei(VR)} lei: un coeficient de ${zec(medic.coeficient)} înseamnă ${lei(baza(medic.coeficient))} lei brut.`;

  const corp = `## Ce este coeficientul de salarizare al bugetarilor?
Coeficientul de salarizare este numărul din grila unei anexe, trecut în dreptul fiecărei funcții, care arată de câte ori e mai mare salariul de bază al funcției față de valoarea de referință. Salariul de bază se obține înmulțind coeficientul cu valoarea de referință și se rotunjește în sus, la leu (art. 10 alin. (4) din varianta din ${v.eticheta}).

Exemplu: funcția de medic specialist are în grilă coeficientul ${zec(medic.coeficient)}, deci ${zec(medic.coeficient)} × ${lei(VR)} = **${lei(baza(medic.coeficient))} lei brut**, la gradația 0. Numărul diferă de la o funcție la alta, iar grila fiecărei anexe îl arată pe fiecare rând. Formula completă, cu gradațiile și trecerea de la brut la net, e în ghidul [cum se calculează salariul de bază](/ghiduri/cum-se-calculeaza-salariul-de-baza).

## Cât sunt coeficienții, pe anexe?
Varianta din ${v.eticheta} are ${lei(total)}${de(total)} funcții cu coeficient în grilele a opt anexe (Anexa IX, a demnitarilor, e tratată separat mai jos). Cel mai mic și cel mai mare coeficient din fiecare anexă:

| Anexa | Domeniul | Funcții în grilă | Coeficient minim | Coeficient maxim |
|---|---|---|---|---|
${tabelDomenii}

Ca să afli salariul în lei, înmulțești cu ${lei(VR)}: la coeficientul minim din tot proiectul (${zec(cMin)}) iese ${lei(baza(cMin))} lei, la cel maxim (${zec(cMax)}) iese ${lei(baza(cMax))} lei. Grila completă, cu fiecare funcție, e pe pagina fiecărei anexe, iar [calculatorul](/) face înmulțirea și adaugă gradațiile.

## De ce depinde coeficientul unei funcții?
Coeficientul depinde de funcție, de nivelul studiilor (S sau SSD pentru studii superioare, M pentru studii medii, G sau PL pentru treptele inferioare), de gradul sau treapta profesională și, în unele anexe, de vechimea în funcție sau în specialitate. Nu include vechimea în muncă: aceea aduce gradațiile, care se aplică peste salariul de bază.

Un exemplu din Anexa VIII, funcția de consilier cu studii superioare, pe cele patru trepte profesionale:

| Treapta | Coeficient | Salariul de bază (lei brut) |
|---|---|---|
${tabelConsilier}

Trecerea de la treapta debutant la cea superior mută coeficientul de la ${zec(cDeb)} la ${zec(cSup)}, adică salariul de bază cu ${lei(baza(cSup) - baza(cDeb))} de lei brut. Treptele și gradele diferă ca denumire de la o anexă la alta: la învățământ contează gradul didactic și vechimea, la sănătate specialitatea. De aceea cauți funcția în grila anexei tale, nu într-o listă generală.

## Cum s-au schimbat coeficienții între variantele proiectului?
Cele trei variante publicate nu folosesc aceiași coeficienți. Am comparat varianta din ${v.eticheta} cu cea din ${vechi.eticheta} pe rândurile care se pot potrivi sigur (același cod de funcție, aceleași studii, același grad și aceeași vechime, rânduri unice în ambele seturi): ${lei(potrivite)} de rânduri. Dintre ele, ${lei(mai)} au azi un coeficient mai mare, ${lei(mici)} unul mai mic și ${lei(egale)} unul neschimbat.

Atenție la comparația în lei: valoarea de referință a coborât de la ${lei(vechi.valoareReferinta)} lei (${vechi.eticheta}) la ${lei(VR)} lei (${v.eticheta}), deci același coeficient dă acum un salariu mai mic cu ${zec((1 - VR / vechi.valoareReferinta) * 100, 1)}%. Pentru o funcție anume, compară mereu coeficientul și valoarea de referință, nu doar unul dintre ele. Cum arată toate diferențele, pe anexe, e explicat în ghidul [cele trei variante ale legii salarizării](/ghiduri/legea-salarizarii-2026-cele-trei-variante).

## Ce nu intră în coeficient?
- **Gradațiile de vechime în muncă.** Coeficienții din grilă sunt la gradația 0; fiecare gradație crește salariul de bază cu un procent, aplicat succesiv.
- **Sporurile.** Se calculează separat, ca procent din salariul de bază, și intră într-un plafon de 20% la nivelul ordonatorului de credite.
- **Anexa IX (demnitari).** Coeficienții sunt eșalonați pe ani, din 2027 până în 2031: pentru aceeași funcție, coeficientul crește de la un an la altul, în loc să rămână unul singur.
- **Solda de grad din Anexa VI.** Militarii și polițiștii au un coeficient pentru funcție și unul separat pentru gradul militar, care se adună.
- **Salariul minim.** Dacă ${lei(sub)}${de(sub)} ${sub === 1 ? "funcție are" : "funcții au"} coeficient × ${lei(VR)} sub salariul minim brut de azi (${lei(SAL_MIN_BRUT)} lei), se plătește salariul minim, nu produsul.

## Unde îți găsești coeficientul?
1. Alegi anexa domeniului tău din [pagina grilelor](/grila).
2. Cauți funcția, apoi rândul cu studiile, gradul și vechimea tale.
3. Înmulțești coeficientul cu ${lei(VR)} (sau cu valoarea variantei care te interesează) sau introduci funcția în [calculator](/), care o face pentru toate cele trei variante.

> Atenție: legea nu a fost adoptată. Pe 26 august 2026 partidele au anunțat că nu au ajuns la consens și s-au angajat să adopte legea până la sfârșitul anului. Coeficienții din acest ghid sunt cei din proiect; salariile de azi se calculează încă pe Legea 153/2017.`;

  return {
    slug: "coeficient-salarizare-bugetari",
    categorie: "Ghid",
    titlu: "Coeficient de salarizare bugetari: ce înseamnă și cât sunt pe anexe",
    titluMeta: "Coeficient salarizare bugetari: valori pe fiecare anexă",
    descriere: `Coeficienții de salarizare ai bugetarilor în proiectul legii: de la ${zec(cMin)} la ${zec(cMax)}, pe fiecare anexă, ce intră în ei și cum se transformă în salariu de bază.`,
    cuvantCheie: "coeficient salarizare bugetari",
    raspuns,
    peScurt: [
      `Salariul de bază = coeficientul funcției × valoarea de referință (${lei(VR)} lei în varianta din ${v.eticheta}), rotunjit în sus la leu.`,
      `Coeficienții din grilele celor opt anexe merg de la ${zec(cMin)} la ${zec(cMax)} (fără Anexa IX).`,
      `Coeficientul depinde de funcție, studii, grad sau treaptă și, uneori, de vechimea în funcție, nu de vechimea în muncă.`,
      `Între varianta din ${vechi.eticheta} și cea din ${v.eticheta}, din ${lei(potrivite)} de rânduri comparabile, ${lei(mai)} au coeficient mai mare și ${lei(mici)} mai mic.`,
      `Proiectul nu a fost adoptat: salariile de azi se calculează pe Legea 153/2017.`,
    ],
    publicat: "2026-10-27",
    actualizat: "2026-10-27",
    corp,
    faq: [
      {
        q: "Cum se calculează salariul din coeficient?",
        a: `Se înmulțește coeficientul cu valoarea de referință și se rotunjește în sus la leu. În varianta din ${v.eticheta}, un coeficient de ${zec(2)} dă ${lei(baza(2))} lei brut la gradația 0. Peste el se adaugă gradațiile de vechime și sporurile.`,
      },
      {
        q: "Care e cel mai mare și cel mai mic coeficient din grilă?",
        a: `În varianta din ${v.eticheta}, fără Anexa IX, cel mai mic coeficient e ${zec(cMin)} (${lei(baza(cMin))} lei brut), iar cel mai mare e ${zec(cMax)} (${lei(baza(cMax))} lei brut). Intervalul pe fiecare anexă e în tabelul din ghid.`,
      },
      {
        q: "Coeficientul include vechimea în muncă?",
        a: "Nu. Coeficienții din grilă sunt la gradația 0. Vechimea în muncă aduce gradații de 7,5%, 5%, 5%, 2,5% și 2,5%, aplicate succesiv peste salariul de bază (art. 13 din proiect). Excepții: justiția, demnitarii și funcțiile de conducere, unde gradația e inclusă în coeficient sau nu se aplică.",
      },
      {
        q: "Coeficienții sunt aceiași în toate variantele proiectului?",
        a: `Nu. Din ${lei(potrivite)} de rânduri comparabile între varianta din ${vechi.eticheta} și cea din ${v.eticheta}, doar ${lei(egale)} au rămas neschimbate. Valoarea de referință a coborât de la ${lei(vechi.valoareReferinta)} la ${lei(VR)} lei.`,
      },
      {
        q: "Se aplică deja acești coeficienți?",
        a: "Nu. Proiectul legii salarizării nu a fost adoptat. Până atunci, salariile se calculează după grilele Legii 153/2017.",
      },
    ],
    surse: [
      { titlu: "Proiectul legii salarizării, varianta din 20 august 2026 (pdf, copie locală)", url: `${SITE_URL}/sources/Proiect-lege-20-august-2026.pdf`, nota: "art. 10 și 13" },
      { titlu: "Publisind: Legea salarizării, varianta III (20 august 2026)", url: "https://publisind.ro/legea-salarizarii-varianta-iii-20-august-2026/" },
      { titlu: "MMFTSS: pagina „Legea salarizării”", url: "https://mmuncii.gov.ro/legea-salarizarii/", nota: "variantele din mai și iulie, cu anexele de coeficienți" },
    ],
    legaturi: [
      ["/grila", "Grilele de salarizare, pe anexe"],
      ["/", "Calculatorul: salariul tău, pe oricare variantă"],
      ["/ghiduri/salarii-bugetari-2026", "Salariile bugetarilor pe noua lege, pe domenii"],
    ],
  };
}
