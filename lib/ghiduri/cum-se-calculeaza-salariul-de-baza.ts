/**
 * Ghid: cum se calculează salariul de bază în proiectul legii salarizării (coeficient × valoarea de
 * referință, gradații, excepții, brut → net). Cifrele: data/variants (lib/variants*.ts) și lib/tax.ts;
 * articolele citate sunt cele verificate în docs/verificare-calcule-2026-09-24.md.
 */
import { VARIANTE, VARIANTA_IMPLICITA, getVarianta } from "../variants";
import { getFunctii } from "../variants-data";
import { aplicaGradatie, calcBrut, GRADATII, GRADATII_APARARE, SAL_MIN_BRUT } from "../tax";
import type { Ghid } from "./tip";

const lei = (n: number) => n.toLocaleString("ro-RO");
const zec = (n: number, z = 2) => n.toLocaleString("ro-RO", { maximumFractionDigits: z });
const de = (n: number) => (n % 100 === 0 || n % 100 >= 20 ? " de" : "");

export function ghid(): Ghid {
  const v = getVarianta(VARIANTA_IMPLICITA);
  const VR = v.valoareReferinta;
  const exCoef = 2;
  const ex = (g: number) => aplicaGradatie(exCoef * VR, g);
  const g5 = GRADATII.length - 1;
  const factor5 = ex(g5) / ex(0);
  const r = calcBrut({ salariuBaza: ex(0), sporuri: [], valoareReferinta: VR });

  const functii = getFunctii(v.id).filter((e) => e.coeficient > 0);
  const subMinim = functii.filter((e) => e.coeficient * VR < SAL_MIN_BRUT).length;
  const colonel = v.soldeGrad.find((s) => /^Colonel/.test(s.label));
  const gAp = GRADATII_APARARE.length - 1;

  const raspuns = `În proiectul noii legi a salarizării, salariul de bază = coeficientul funcției din grilă × valoarea de referință, rotunjit în sus la leu. În varianta din ${v.eticheta}, valoarea de referință e ${lei(VR)} lei, deci un coeficient de ${zec(exCoef)} înseamnă ${lei(ex(0))} lei brut. Peste el se adaugă gradațiile de vechime, apoi sporurile.`;

  const corp = `## Care e formula salariului de bază?
Salariul de bază se calculează înmulțind **coeficientul funcției** din grila anexei cu **valoarea de referință**, iar rezultatul se rotunjește din leu în leu, în favoarea salariatului (art. 10 alin. (4) din proiect). Coeficientul depinde de funcție, de studii, de grad sau treaptă și, la unele funcții, de vechimea în funcție. Grilele pe domenii sunt pe [pagina grilelor](/grila).

Exemplu, în varianta din ${v.eticheta}: o funcție cu coeficientul ${zec(exCoef)} are un salariu de bază de ${zec(exCoef)} × ${lei(VR)} = **${lei(ex(0))} lei brut**, la gradația 0.

## Cât este valoarea de referință?
Valoarea de referință e o sumă în lei, aceeași pentru toate funcțiile, fixată prin lege. Cele trei variante oficiale ale proiectului au propus:

| Varianta | Valoarea de referință (lei) | Articolul | Pentru perioada | Intrarea în vigoare propusă |
${VARIANTE.map((x) => `| ${x.eticheta} | ${lei(x.valoareReferinta)} | ${x.articolValoareReferinta} | ${x.perioadaValoareReferinta} | ${x.intrareInVigoareText} |`).join("\n")}

În varianta din 20 august, Guvernul poate modifica valoarea de referință prin hotărâre în 2027 (art. 38 alin. (4)). Pentru că toate salariile se calculează din ea, o schimbare de 100 de lei a valorii de referință mută fiecare salariu de bază cu 100 × coeficientul: la coeficientul ${zec(exCoef)}, cu ${lei(100 * exCoef)} de lei brut.

## Cum se adaugă vechimea în muncă?
Coeficienții din grilă sunt la gradația 0. Vechimea în muncă aduce gradații, care se aplică **succesiv**, fiecare peste suma de dinainte (art. 13 alin. (2), (3) și (5)):

| Gradația | Vechime în muncă | Creștere | Salariu de bază la coeficientul ${zec(exCoef)} (lei) |
${GRADATII.map((g) => `| ${g.nivel} | ${g.numeRange} | ${g.cota ? `+${zec(g.cota)}%` : "—"} | ${lei(ex(g.nivel))} |`).join("\n")}

După 20 de ani de muncă, salariul de bază e cu ${zec((factor5 - 1) * 100, 1)}% mai mare decât la gradația 0. Vechimea în muncă (gradațiile) e diferită de vechimea în funcție sau în specialitate, care alege rândul din grilă (de exemplu, la profesori).

## Care sunt excepțiile de la gradații?
- **Justiția (Anexa V):** indemnizația de încadrare include deja gradul, gradația și vechimea în funcție, deci nu se mai adaugă gradații.
- **Funcțiile de demnitate publică (Anexa IX):** au indemnizație lunară, fără gradații.
- **Funcțiile de conducere:** coeficientul include gradația.
- **Militari, polițiști și polițiști de penitenciare (Anexa VI):** au ${gAp} gradații de câte +${zec(GRADATII_APARARE[1]!.cota)}%, la 3, 6, 9, 12, 15, 18 și 21 de ani, aplicate doar pe solda de funcție. Solda lunară = solda de funcție + **solda de grad**, iar solda de grad = coeficientul gradului × valoarea de referință, fără gradații.${colonel ? ` De exemplu, la gradul de colonel coeficientul e ${zec(colonel.coef)}: ${lei(Math.round(colonel.coef * VR))} de lei.` : ""} Grila completă e pe [pagina Anexei VI](/grila/aparare-ordine-publica).

## Ce se întâmplă dacă salariul din grilă e sub salariul minim?
Dacă salariul de bază calculat iese sub salariul minim brut pe țară, se plătește o sumă egală cu salariul minim (art. 10 alin. (8)). În varianta din ${v.eticheta}, ${subMinim}${de(subMinim)} ${subMinim === 1 ? "funcție are" : "funcții au"} coeficient × ${lei(VR)} sub salariul minim de azi, de ${lei(SAL_MIN_BRUT)} lei (HG 146/2026). Salariul minim din 2027 nu e încă stabilit.

## Cum ajungi de la brut la net?
Din salariul brut se rețin 25% contribuția la pensii (CAS), 10% contribuția la sănătate (CASS) și 10% impozit pe venit, calculat după deducerea personală (Codul fiscal, art. 77, 78, 138 și 156). Pentru exemplul de mai sus, fără sporuri și fără persoane în întreținere:

| Element | Lei |
| Salariu brut | ${lei(r.salariuBrut)} |
| CAS (25%) | ${lei(r.cas)} |
| CASS (10%) | ${lei(r.cass)} |
| Deducere personală | ${lei(r.deductibil)} |
| Impozit (10%) | ${lei(r.impozit)} |
| Salariu net | ${lei(r.salariuNet)} |

Deducerea personală se acordă doar pentru salarii brute de până la salariul minim + 2.000 de lei și crește cu numărul persoanelor în întreținere; în plus, 100 de lei pe lună pentru fiecare copil înscris la școală și o deducere pentru tinerii sub 26 de ani (art. 77 alin. (10)). Calculatorul le ia pe toate în calcul.

## Unde intră sporurile?
Sporurile se calculează separat, după regulile fiecărei anexe, de obicei ca procent din salariul de bază sau din tariful orar (de exemplu, 25% pentru orele lucrate noaptea, între 22:00 și 06:00, art. 17). Suma sporurilor supuse plafonului nu poate depăși 20% din suma salariilor de bază **la nivelul ordonatorului principal de credite**, nu al fiecărui angajat (art. 21 alin. (2)). Unele sporuri sunt exceptate de la plafon.

> Atenție: legea nu a fost adoptată. Pe 26 august 2026 partidele au anunțat că nu au ajuns la consens și s-au angajat să adopte legea până la sfârșitul anului. Formula și cifrele arată ce prevede proiectul.`;

  return {
    slug: "cum-se-calculeaza-salariul-de-baza",
    categorie: "Ghid",
    titlu: "Cum se calculează salariul de bază pe noua lege a salarizării",
    titluMeta: `Valoarea de referință ${lei(VR)} lei: cum se calculează salariul`,
    descriere: `Salariul de bază = coeficient × valoarea de referință (${lei(VR)} lei în varianta din ${v.eticheta}). Gradațiile de vechime, excepțiile, salariul minim și calculul net.`,
    cuvantCheie: `valoarea de referință ${lei(VR)} lei`,
    raspuns,
    peScurt: [
      `Salariul de bază = coeficientul din grilă × valoarea de referință, rotunjit în sus la leu (art. 10 alin. (4)).`,
      `Valoarea de referință: ${VARIANTE.map((x) => `${lei(x.valoareReferinta)} lei (${x.eticheta})`).join(", ")}.`,
      `Gradațiile de vechime se aplică succesiv; după 20 de ani, +${zec((factor5 - 1) * 100, 1)}%.`,
      `Sub salariul minim (${lei(SAL_MIN_BRUT)} lei), se plătește salariul minim (art. 10 alin. (8)).`,
      `Din brut rămân net aproximativ ${Math.round((r.salariuNet / r.salariuBrut) * 100)}% la un salariu de ${lei(r.salariuBrut)} lei fără deducere.`,
    ],
    publicat: "2026-09-24",
    actualizat: "2026-09-24",
    corp,
    faq: [
      {
        q: "Ce este valoarea de referință în legea salarizării?",
        a: `Suma în lei cu care se înmulțește coeficientul fiecărei funcții ca să iasă salariul de bază. În varianta din ${v.eticheta} a proiectului e ${lei(VR)} lei (${v.articolValoareReferinta}); în variantele din mai și iulie era ${lei(VARIANTE[0]!.valoareReferinta)} lei.`,
      },
      {
        q: "Cum se calculează gradația de vechime?",
        a: "Fiecare gradație (după 3, 5, 10, 15 și 20 de ani de muncă) crește salariul de bază cu 7,5%, 5%, 5%, 2,5% și 2,5%, aplicate succesiv peste suma anterioară (art. 13 din proiect). La militari și polițiști, gradațiile sunt de câte 3%, la fiecare 3 ani.",
      },
      {
        q: `Cât e net un salariu de ${lei(r.salariuBrut)} lei brut?`,
        a: `${lei(r.salariuNet)} lei, fără persoane în întreținere: se rețin ${lei(r.cas)} lei CAS, ${lei(r.cass)} lei CASS și ${lei(r.impozit)} lei impozit.`,
      },
      {
        q: "Se aplică deja noua formulă?",
        a: "Nu. Proiectul nu a fost adoptat. Pe legea în vigoare (Legea 153/2017), salariile se calculează după grilele acelei legi.",
      },
    ],
    surse: [
      { titlu: "Proiectul legii salarizării, varianta din 20 august 2026 (pdf, copie locală)", url: "https://salarii.romaniatransparenta.eu/sources/Proiect-lege-20-august-2026.pdf", nota: "art. 10, 13, 17, 21, 38" },
      { titlu: "Publisind: Legea salarizării, varianta III (20 august 2026)", url: "https://publisind.ro/legea-salarizarii-varianta-iii-20-august-2026/" },
      { titlu: "MMFTSS: pagina „Legea salarizării”", url: "https://mmuncii.gov.ro/legea-salarizarii/", nota: "variantele din mai și iulie" },
      { titlu: "Anexa VI: reglementări speciale pentru apărare și ordine publică (docx, copie locală)", url: "https://salarii.romaniatransparenta.eu/sources/Anexa-VI-reglementari-speciale-20-mai-2026.docx", nota: "art. 2, 4 și 6: solda de funcție, gradațiile, solda de grad" },
      { titlu: "Codul fiscal, Legea 227/2015 (Portal legislativ)", url: "https://legislatie.just.ro/Public/DetaliiDocument/171282", nota: "art. 77, 78, 138, 156" },
    ],
    legaturi: [
      ["/", "Calculatorul: salariul tău, pe oricare variantă"],
      ["/grila", "Grilele de salarizare, pe domenii"],
    ],
  };
}
