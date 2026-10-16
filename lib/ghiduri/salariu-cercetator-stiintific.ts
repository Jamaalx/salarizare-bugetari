/**
 * Ghid: salariile cercetătorilor din proiectul legii salarizării (Anexa I, cap. II, cercetare științifică):
 * cercetător științific I, II, III, cercetător științific, asistent de cercetare și funcțiile de conducere din
 * institute. Rândurile se aleg după codul funcției (12.00201001–009 execuție, 12.00101001–009 conducere), se
 * potrivesc între variante pe cod, iar salariul de bază și netul se calculează cu funcțiile calculatorului.
 * Notele 1–3 de sub grilă și celula CS III din 20 august (#REF!) sunt verificate în
 * public/sources/Proiect-COEFICIENTI-1-8-20-august-2026.xlsx (foaia „I CII”).
 */
import { VARIANTE, VARIANTA_IMPLICITA, getVarianta, type Varianta } from "../variants";
import { getFunctii, type CoefEntry } from "../variants-data";
import { aplicaGradatie, calcBrut, GRADATII, SAL_MIN_BRUT, SPORURI_STANDARD } from "../tax";
import { SITE_URL, de } from "../seo";
import type { Ghid } from "./tip";

const lei = (n: number) => n.toLocaleString("ro-RO");
const coef = (n: number) => n.toLocaleString("ro-RO", { maximumFractionDigits: 6 });

/** funcțiile de execuție din cercetare, de la cea mai înaltă la cea mai mică, cu codul din grilă */
const EXECUTIE = [
  { cod: "12.00201001.01.1", nume: "cercetător științific I", titlu: "Cercetător științific I (CS I)" },
  { cod: "12.00201002.01.1", nume: "cercetător științific II", titlu: "Cercetător științific II (CS II)" },
  { cod: "12.00201003.01.1", nume: "cercetător științific III", titlu: "Cercetător științific III (CS III)" },
  { cod: "12.00201004.01.1", nume: "cercetător științific", titlu: "Cercetător științific (CS)" },
  { cod: "12.00201005.01.1", nume: "asistent de cercetare științifică", titlu: "Asistent de cercetare științifică" },
  { cod: "12.00201006.01.1", nume: "asistent de cercetare științifică stagiar", titlu: "Asistent de cercetare stagiar" },
  { cod: "12.00201007.01.1", nume: "asistent I (studii medii)", titlu: "Asistent I (studii medii)" },
  { cod: "12.00201008.01.1", nume: "asistent II (studii medii)", titlu: "Asistent II (studii medii)" },
  { cod: "12.00201009.01.1", nume: "asistent stagiar (studii medii)", titlu: "Asistent stagiar (studii medii)" },
] as const;

/** funcțiile de conducere din institutele de cercetare (cu gradul I și gradul II din grilă) */
const CONDUCERE = [
  { cod: "12.00101001.01.2", titlu: "Director general institut de cercetare" },
  { cod: "12.00101003.01.2", titlu: "Director institut de cercetare" },
  { cod: "12.00101004.01.2", titlu: "Director adjunct institut de cercetare" },
  { cod: "12.00101005.02.2", titlu: "Director centru / stațiune de cercetare" },
  { cod: "12.00101009.01.2", titlu: "Șef compartiment cercetare (laborator, departament, centru)" },
] as const;

const rand = (id: Varianta["id"], cod: string) => getFunctii(id).find((e) => e.anexa === "I" && e.cod === cod && e.coeficient > 0);
const baza = (c: number, v: Varianta, g = 0) => aplicaGradatie(c * v.valoareReferinta, g);
const net = (brut: number, v: Varianta) => calcBrut({ salariuBaza: brut, sporuri: [], valoareReferinta: v.valoareReferinta }).salariuNet;

export function ghid(): Ghid {
  const v = getVarianta(VARIANTA_IMPLICITA);
  const exec = EXECUTIE.map((f) => ({ f, e: rand(v.id, f.cod) }));
  const gasite = exec.filter((x): x is { f: (typeof EXECUTIE)[number]; e: CoefEntry } => x.e !== undefined);
  const [CS1, CS2, CS3, CS, ACS] = [0, 1, 2, 3, 4].map((i) => exec[i]!);
  if (!CS1!.e || !CS2!.e || !CS!.e || !ACS!.e) throw new Error(`ghid cercetători: lipsesc rânduri de execuție în ${v.id}`);
  if (gasite.length < 7) throw new Error(`ghid cercetători: prea puține rânduri de execuție în ${v.id}`);
  const lipsaExec = exec.filter((x) => !x.e);

  const bCS1 = baza(CS1!.e.coeficient, v);
  const nCS1 = net(bCS1, v);
  const bCS2 = baza(CS2!.e.coeficient, v);
  const bCS = baza(CS!.e.coeficient, v);
  const bACS = baza(ACS!.e.coeficient, v);
  const nACS = net(bACS, v);
  const toateExec = gasite.map((x) => baza(x.e.coeficient, v));
  const min = Math.min(...toateExec);
  const max = Math.max(...toateExec);
  const gMax = GRADATII.length - 1;
  const subMinim = gasite.filter((x) => baza(x.e.coeficient, v) < SAL_MIN_BRUT);
  const pragDeducere = SAL_MIN_BRUT + 2000;
  const cuDeducere = gasite.filter((x) => baza(x.e.coeficient, v) <= pragDeducere).length;

  // tabelul funcțiilor de execuție, la gradația 0
  const tabelExec = exec
    .map(({ f, e }) => (e ? `| ${f.titlu} | ${e.studii} | ${coef(e.coeficient)} | ${lei(baza(e.coeficient, v))} | ${lei(net(baza(e.coeficient, v), v))} |` : `| ${f.titlu} | — | — | — | — |`))
    .join("\n");

  // o funcție mai înaltă cu salariu mai mic decât cea de sub ea?
  const inversiuni: string[] = [];
  for (let i = 1; i < exec.length; i++) {
    const sus = exec[i - 1]!.e;
    const jos = exec[i]!.e;
    if (sus && jos && sus.coeficient < jos.coeficient) inversiuni.push(`${exec[i - 1]!.f.nume} (${coef(sus.coeficient)}) e sub ${exec[i]!.f.nume} (${coef(jos.coeficient)})`);
  }
  const frazaInversiuni =
    inversiuni.length === 0
      ? `Ordinea din grilă se păstrează: fiecare funcție are un coeficient mai mare decât cea de sub ea.`
      : `Un detaliu din coeficienții publicați: ${inversiuni.join("; ")}. Tabelul reproduce coeficienții, nu îi corectează.`;

  // CS III: în xlsx-ul din 20 august celula coeficientului e o eroare de formulă (#REF!)
  const sectiuneCS3 = CS3!.e
    ? ""
    : v.id === "2026-08-20"
      ? `## De ce lipsește salariul CS III în varianta din 20 august?
Pentru că fișierul oficial de coeficienți din 20 august 2026 nu are o valoare pentru el: în celula coeficientului cercetătorului științific III (codul ${EXECUTIE[2].cod}) apare o eroare de formulă („#REF!”), nu un număr. Rândul există în grilă, dar salariul lui nu se poate calcula din această variantă, nici aici, nici în calculator. Cifrele pentru CS III din variantele din 25 mai și 17 iulie sunt în comparația de mai jos, cu valoarea de referință de atunci.

`
      : `## De ce lipsește salariul CS III?
Pentru că varianta din ${v.eticheta} nu are un coeficient pentru cercetătorul științific III în datele noastre, așa că salariul lui nu se poate calcula.

`;

  // conducerea: gradul I și gradul II, cu gradația maximă inclusă (nota 1)
  const cond = CONDUCERE.map((f) => {
    const r = getFunctii(v.id).filter((e) => e.anexa === "I" && e.cod === f.cod && e.coeficient > 0);
    const g1 = r.find((e) => e.grad === "Grad I");
    const g2 = r.find((e) => e.grad === "Grad II");
    if (!g1 || !g2) throw new Error(`ghid cercetători: lipsește gradul I/II la ${f.titlu}`);
    return { f, g1, g2 };
  });
  const tabelCond = cond.map(({ f, g1, g2 }) => `| ${f.titlu} | ${lei(baza(g1.coeficient, v))} | ${lei(baza(g2.coeficient, v))} |`).join("\n");
  const dirAdj = cond.find((x) => x.f.cod === "12.00101004.01.2")!;

  // gradațiile, pe exemplul CS II
  const exGrad = CS2!.e;
  const grad = GRADATII.map((g) => `| ${g.nivel} | ${g.numeRange} | ${g.cota ? `+${g.cota.toLocaleString("ro-RO")}%` : "—"} | ${lei(baza(exGrad.coeficient, v, g.nivel))} | ${lei(net(baza(exGrad.coeficient, v, g.nivel), v))} |`).join("\n");

  // comparația între variante, pe cod
  const peVariante = (cod: string) => VARIANTE.map((x) => {
    const r = rand(x.id, cod);
    return r ? { x, r, b: baza(r.coeficient, x) } : null;
  });
  const comparate = EXECUTIE.slice(0, 6);
  const comparatie = comparate
    .map((f) => `| ${f.titlu} | ${peVariante(f.cod).map((z) => (z ? `${lei(z.b)} (${coef(z.r.coeficient)})` : "—")).join(" | ")} |`)
    .join("\n");
  const scazute = comparate.filter((f) => {
    const z = peVariante(f.cod);
    const curent = z.find((y) => y?.x.id === v.id);
    return curent && z.some((y) => y && y.x.id !== v.id && y.b > curent.b);
  });
  const frazaVariante =
    scazute.length === 0
      ? `Pentru toate funcțiile din tabel, varianta din ${v.eticheta} dă cel mai mare salariu de bază dintre cele trei.`
      : `La ${scazute.length === 1 ? "o funcție" : `${scazute.length}${de(scazute.length)} funcții`} din ${comparate.length} (${scazute.map((f) => f.nume).join(", ")}), o variantă mai veche dădea un salariu de bază mai mare decât cea din ${v.eticheta}${VARIANTE.some((x) => x.valoareReferinta > v.valoareReferinta) ? `, în parte pentru că valoarea de referință a scăzut la ${lei(v.valoareReferinta)} lei` : ""}.`;
  const crescute = comparate.filter((f) => {
    const z = peVariante(f.cod);
    const curent = z.find((y) => y?.x.id === v.id);
    return curent && z.every((y) => !y || y.x.id === v.id || y.r.coeficient < curent.r.coeficient);
  });
  const frazaCrescute = crescute.length > 0 ? ` Coeficientul a crescut față de ambele variante anterioare la: ${crescute.map((f) => f.nume).join(", ")}.` : "";

  // sporuri din lib/tax.ts relevante pentru cercetare
  const fe = SPORURI_STANDARD.find((s) => s.id === "fonduri-eu");
  if (!fe) throw new Error("ghid cercetători: lipsește sporul pentru proiecte cu fonduri europene");

  // titlul de doctor: doar ca text, din notele variantei din 20 august (nu e modelat în calculator)
  const aug = getVarianta("2026-08-20");
  const notaDoctor = aug.note.find((n) => /doctor/i.test(n));
  const sumaDoctor = notaDoctor?.match(/(\d[\d.]*) lei/)?.[1];
  const artDoctor = notaDoctor?.match(/art\. \d+/)?.[0];
  if (!sumaDoctor || !artDoctor) throw new Error("ghid cercetători: lipsește nota despre titlul de doctor");

  const raspuns = `În proiectul legii salarizării din ${v.eticheta}, un cercetător științific I (CS I) ar avea salariul de bază de ${lei(bCS1)} lei brut, adică ${lei(nCS1)} lei net, un CS II ${lei(bCS2)} lei, iar un asistent de cercetare ${lei(bACS)} lei brut, la gradația 0. Proiectul nu a fost adoptat.`;

  const corp = `## Cât ar fi salariul unui cercetător științific pe noua lege?
Un cercetător științific I (CS I) ar avea un salariu de bază de **${lei(bCS1)} lei brut pe lună** în varianta din ${v.eticheta} a proiectului, adică ${lei(nCS1)} lei net fără sporuri și fără persoane în întreținere. Suma vine din coeficientul ${coef(CS1!.e.coeficient)} înmulțit cu valoarea de referință de ${lei(v.valoareReferinta)} lei (${v.articolValoareReferinta}), cu rotunjire în sus la leu (art. 10 alin. (4) din proiect).

Pe treptele de sub el: cercetătorul științific II ar avea ${lei(bCS2)} lei, cercetătorul științific ${lei(bCS)} lei, iar asistentul de cercetare științifică ${lei(bACS)} lei brut (${lei(nACS)} lei net). Cifrele sunt la gradația 0, fără gradațiile din vechimea în muncă.

## Unde stau cercetătorii în grilă?
În Anexa I a proiectului (familia ocupațională „Învățământ și cercetare științifică”), capitolul II are grila cercetării științifice, în două părți: funcțiile de conducere din institute, centre și stațiuni de cercetare și funcțiile de execuție, de la asistentul stagiar cu studii medii până la CS I. Funcțiile de execuție nu au trepte de vechime: fiecare are un singur coeficient, pentru gradația 0.

În varianta din ${v.eticheta}, salariul de bază al funcțiilor de execuție merge de la ${lei(min)} la ${lei(max)} lei brut. Grila completă, cu toate funcțiile din învățământ și cercetare, e în [grila Anexei I](/grila/invatamant-cercetare).

## Cât ia fiecare funcție de cercetare?
Salariul de bază la gradația 0 și netul, varianta din ${v.eticheta}:

| Funcția | Studii | Coeficient | Salariu de bază (lei) | Net (lei) |
${tabelExec}

${lipsaExec.length > 0 ? "O liniuță înseamnă că varianta nu are un coeficient pentru rândul respectiv. " : ""}${frazaInversiuni}

${sectiuneCS3}## Cât adaugă gradațiile?
Gradația vine din vechimea în muncă: nota 2 de sub grilă spune că coeficienții funcțiilor de execuție sunt pentru gradația 0, iar salariile pentru gradațiile 1–5 se obțin prin majorare potrivit art. 13 din proiect. Salariul crește succesiv cu +7,5% după 3 ani de muncă, apoi cu câte +5%, +5%, +2,5% și +2,5%. Pentru un cercetător științific II:

| Gradația | Vechime în muncă | Creștere | Salariu de bază (lei) | Net (lei) |
${grad}

Cu gradația maximă, un CS I ar ajunge la ${lei(baza(CS1!.e.coeficient, v, gMax))} lei brut, iar un asistent de cercetare la ${lei(baza(ACS!.e.coeficient, v, gMax))} lei brut.

## Cât ar câștiga conducerea unui institut de cercetare?
Funcțiile de conducere au doi coeficienți, pentru gradul I și gradul II, iar nota 1 de sub grilă precizează că aceștia cuprind deja sporul de vechime în muncă la nivel maxim. De aceea, la conducere nu se mai adaugă gradații. Salariul de bază în varianta din ${v.eticheta}:

| Funcția | Gradul I (lei) | Gradul II (lei) |
${tabelCond}

Nota 3 de sub grilă adaugă o regulă pentru conducătorii de doctorat din cercetare: salariul lor de bază este egal cu cel pentru director adjunct de institut de cercetare sau director de centru de cercetare, adică ${lei(baza(dirAdj.g1.coeficient, v))}–${lei(baza(dirAdj.g2.coeficient, v))} lei brut pentru directorul adjunct de institut.

## Cât ar fi netul?
Netul din tabele folosește regulile fiscale de azi: 25% CAS, 10% CASS și 10% impozit, fără persoane în întreținere. ${cuDeducere === 0 ? `Deducerea personală (art. 77 din Codul fiscal) se acordă doar până la un brut de ${lei(pragDeducere)} lei (salariul minim + 2.000 de lei). Toate funcțiile de cercetare sunt peste acest prag, așa că netul nu depinde de persoanele în întreținere.` : `Deducerea personală (art. 77 din Codul fiscal) se acordă doar până la un brut de ${lei(pragDeducere)} lei (salariul minim + 2.000 de lei); ${cuDeducere === 1 ? "o funcție de execuție e" : `${cuDeducere}${de(cuDeducere)} funcții de execuție sunt`} sub acest prag, așa că netul ${cuDeducere === 1 ? "ei" : "lor"} depinde și de persoanele în întreținere. Pentru calculul cu persoane în întreținere, folosește [calculatorul](/).`} ${subMinim.length === 0 ? `Nicio funcție de cercetare nu e sub salariul minim brut de ${lei(SAL_MIN_BRUT)} lei.` : `${subMinim.length === 1 ? "O funcție e" : `${subMinim.length}${de(subMinim.length)} funcții sunt`} sub salariul minim brut de ${lei(SAL_MIN_BRUT)} lei; acolo se plătește salariul minim (art. 10 alin. (8)).`}

## Ce s-a schimbat între cele trei variante ale proiectului?
Ministerul Muncii a publicat trei variante: ${VARIANTE.map((x) => `${x.eticheta} (valoarea de referință ${lei(x.valoareReferinta)} lei)`).join(", ")}. Salariul de bază la gradația 0, cu coeficientul în paranteză:

| Funcția | ${VARIANTE.map((x) => x.eticheta).join(" | ")} |
${comparatie}

Rândurile sunt potrivite între variante după codul funcției din grilă. ${frazaVariante}${frazaCrescute}

## Ce sporuri și indemnizații pot primi cercetătorii?
Pe lângă gradații, două prevederi din proiect sunt des întâlnite în cercetare:

- **${fe.nume}**: pentru personalul nominalizat în echipele de proiecte finanțate din fonduri europene (art. 15 alin. (1)). Doar partea decontată din fonduri externe e exceptată de la plafonul de 20%; cofinanțarea intră în plafon. Îl poți adăuga în [calculator](/).
- **Titlul științific de doctor**: varianta din 20 august prevede o indemnizație fixă de ${sumaDoctor} lei brut pe lună, în afara plafonului sporurilor (${artDoctor} din proiect). Nu e modelată în calculator și nu apare în tabele.

Plafonul de 20% al sporurilor se calculează pe ordonatorul principal de credite, nu pe fiecare angajat (art. 21 alin. (2)). Pentru cadrele didactice din universități, vezi [salariile din învățământul superior](/ghiduri/salariu-cadre-didactice-universitare).

> Atenție: legea nu a fost adoptată. Pe 26 august 2026 partidele au anunțat că nu au ajuns la consens și s-au angajat să adopte legea până la sfârșitul anului. Cifrele de mai sus arată ce prevede proiectul, nu salariile în vigoare.`;

  return {
    slug: "salariu-cercetator-stiintific",
    categorie: "Ghid",
    titlu: "Cât ar câștiga un cercetător științific (CS I, CS II, CS III) pe noua lege",
    titluMeta: "Salariu cercetător științific CS I, CS II, CS III pe noua lege",
    descriere: `Cercetător științific I, II, III și asistent de cercetare în proiectul din ${v.eticheta}: de la ${lei(min)} la ${lei(max)} lei brut, cu net, gradații și variante.`,
    cuvantCheie: "salariu cercetator stiintific",
    raspuns,
    peScurt: [
      `CS I: ${lei(bCS1)} lei brut, ${lei(nCS1)} lei net fără sporuri; ${lei(baza(CS1!.e.coeficient, v, gMax))} lei cu gradația maximă.`,
      `CS II: ${lei(bCS2)} lei brut; cercetător științific: ${lei(bCS)} lei; asistent de cercetare: ${lei(bACS)} lei.`,
      CS3!.e
        ? `CS III: ${lei(baza(CS3!.e.coeficient, v))} lei brut.`
        : `CS III: în fișierul oficial din ${v.eticheta}, coeficientul lipsește (eroare „#REF!”), deci salariul nu se poate calcula.`,
      `Conducerea institutelor are coeficienți pe gradul I și II, cu vechimea maximă inclusă (nota 1 a grilei).`,
      `Valoarea de referință din ${v.eticheta}: ${lei(v.valoareReferinta)} lei (${v.articolValoareReferinta}).`,
    ],
    publicat: "2026-10-13",
    actualizat: "2026-10-13",
    corp,
    faq: [
      {
        q: "Cât ar câștiga net un cercetător științific I pe noua lege?",
        a: `În varianta din ${v.eticheta}: ${lei(nCS1)} lei net, din ${lei(bCS1)} lei brut, fără sporuri, fără gradații și fără persoane în întreținere.`,
      },
      {
        q: "De ce nu apare salariul pentru CS III în varianta din 20 august?",
        a: CS3!.e
          ? `Apare: ${lei(baza(CS3!.e.coeficient, v))} lei brut, la gradația 0.`
          : `Pentru că fișierul oficial de coeficienți din 20 august 2026 are în celula CS III o eroare de formulă („#REF!”), nu un număr. Rândul există, dar coeficientul nu a fost publicat.`,
      },
      {
        q: "Contează vechimea pentru salariul unui cercetător?",
        a: `Da, prin gradații. Funcțiile de execuție din cercetare au un singur coeficient, pentru gradația 0; vechimea în muncă adaugă gradațiile din art. 13 al proiectului, până la +${lei(Math.round((aplicaGradatie(10000, gMax) / 10000 - 1) * 1000) / 10)}% la peste 20 de ani.`,
      },
      {
        q: "De când s-ar aplica noile salarii în cercetare?",
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
      ["/grila/invatamant-cercetare", "Grila completă a învățământului și cercetării (Anexa I)"],
      ["/", "Calculatorul: salariul tău, cu gradație, sporuri și net"],
      ["/ghiduri/salariu-cadre-didactice-universitare", "Salariile din învățământul superior pe noua lege"],
    ],
  };
}
