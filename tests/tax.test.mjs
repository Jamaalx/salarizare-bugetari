// Teste pentru lib/tax.ts — exemple calculate de mână din textele legale.
// Rulare: npm test (node:test; Node ≥ 22.18 rulează direct .ts prin type stripping).
//
// Reguli folosite (vezi docs/verificare-calcule-2026-09-24.md):
//  - CAS 25% (Cod fiscal art. 138 lit. a), CASS 10% (art. 156), pe brut (art. 139, 157);
//  - impozit 10% pe brut − CAS − CASS − deducere (art. 78 alin. 2 lit. a);
//  - deducerea personală: art. 77 alin. (3), (4), (10) — tabel pe tranșe de 50 lei;
//  - salariul minim brut 4.325 lei de la 01.07.2026 (HG 146/2026);
//  - gradații: art. 13 alin. (3) din proiect; Anexa VI art. 4 alin. (3) pentru militari;
//  - garanția salariului minim: art. 10 alin. (8) din proiect.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SAL_MIN_BRUT,
  calcBrut,
  calculDeducere,
  procentDeducereBaza,
  aplicaGradatie,
  gradatieDinVechime,
  gradatiiForAnexa,
  GRADATII,
  GRADATII_APARARE,
} from "../lib/tax.ts";

const brut = (salariuBaza, extra = {}) =>
  calcBrut({ salariuBaza, sporuri: [], valoareReferinta: 4000, ...extra });

test("salariul minim brut în vigoare: 4.325 lei (HG 146/2026)", () => {
  assert.equal(SAL_MIN_BRUT, 4325);
});

test("deducere de bază: procentele din tabelul art. 77 alin. (4)", () => {
  // la nivelul salariului minim: 20/25/30/35/45%
  assert.deepEqual([0, 1, 2, 3, 4].map((p) => procentDeducereBaza(4325, p)), [20, 25, 30, 35, 45]);
  // 4 și peste persoane = coloana „4 și peste”
  assert.equal(procentDeducereBaza(4325, 7), 45);
  // min+1 … min+50 → −0,5 pp; min+51 → −1 pp
  assert.equal(procentDeducereBaza(4326, 0), 19.5);
  assert.equal(procentDeducereBaza(4375, 0), 19.5);
  assert.equal(procentDeducereBaza(4376, 0), 19);
  // ultima tranșă min+1.951 … min+2.000: 0 / 5 / 10 / 15 / 25%
  assert.deepEqual([0, 1, 2, 3, 4].map((p) => procentDeducereBaza(6325, p)), [0, 5, 10, 15, 25]);
  // peste min + 2.000 lei nu se acordă (alin. 3)
  assert.equal(procentDeducereBaza(6326, 4), 0);
});

test("deducere suplimentară: sub 26 de ani și copii înscriși (art. 77 alin. 10)", () => {
  // 5.000 lei: tranșa 14 (min+651…min+700) → 13% × 4.325 = 562,25 + 15% × 4.325 = 648,75
  assert.equal(calculDeducere(5000, 0, 4325, { sub26Ani: true }), 1211);
  // peste min + 2.000: fără deducere de bază și fără cea pentru tineri, dar 100 lei/copil
  assert.equal(calculDeducere(12000, 3, 4325, { sub26Ani: true, copiiInvatamant: 2 }), 200);
});

test("salariul minim (4.325 lei), fără persoane în întreținere", () => {
  const r = brut(4325);
  assert.equal(r.salariuBrut, 4325);
  assert.equal(r.cas, 1081); // 1.081,25
  assert.equal(r.cass, 433); // 432,50
  assert.equal(r.deductibil, 865); // 20% × 4.325
  assert.equal(r.impozit, 195); // (4.325 − 1.081 − 433 − 865) × 10% = 194,6
  assert.equal(r.salariuNet, 2616);
});

test("salariul minim, 2 persoane în întreținere", () => {
  const r = brut(4325, { persoaneInIntretinere: 2 });
  assert.equal(r.deductibil, 1297.5); // 30% × 4.325
  assert.equal(r.impozit, 151); // (2.811 − 1.297,5) × 10% = 151,35
  assert.equal(r.salariuNet, 2660);
});

test("salariu mediu 6.000 lei, 1 persoană în întreținere", () => {
  const r = brut(6000, { persoaneInIntretinere: 1 });
  assert.equal(r.cas, 1500);
  assert.equal(r.cass, 600);
  // 6.000 − 4.325 = 1.675 → tranșa 34 (min+1.651…min+1.700) → 25 − 17 = 8% × 4.325 = 346
  assert.equal(r.deductibil, 346);
  assert.equal(r.impozit, 355); // (3.900 − 346) × 10% = 355,4
  assert.equal(r.salariuNet, 3545);
});

test("salariu mare 12.000 lei, 3 persoane: fără deducere de bază", () => {
  const r = brut(12000, { persoaneInIntretinere: 3 });
  assert.equal(r.deductibil, 0);
  assert.equal(r.cas, 3000);
  assert.equal(r.cass, 1200);
  assert.equal(r.impozit, 780);
  assert.equal(r.salariuNet, 7020);
  // cu 2 copii înscriși în învățământ: deducere 200 lei → impozit 760
  const c = brut(12000, { persoaneInIntretinere: 3, copiiInvatamant: 2 });
  assert.equal(c.impozit, 760);
  assert.equal(c.salariuNet, 7040);
});

test("identitatea brut − CAS − CASS − impozit = net și cu brut cu bani", () => {
  const r = brut(5123.4, { persoaneInIntretinere: 1 });
  assert.equal(r.salariuBrut, 5123);
  assert.equal(r.salariuBrut - r.cas - r.cass - r.impozit, r.salariuNet);
});

test("scutire de impozit (handicap grav/accentuat, art. 60 pct. 1 lit. b): CAS și CASS rămân", () => {
  const r = brut(6000, { scutireImpozit: true });
  assert.equal(r.impozit, 0);
  assert.equal(r.salariuNet, 6000 - 1500 - 600);
});

test("gradații civile (art. 13): aplicare succesivă, rotunjire în sus la leu", () => {
  assert.equal(gradatieDinVechime(2), 0);
  assert.equal(gradatieDinVechime(3), 1);
  assert.equal(gradatieDinVechime(10), 3);
  assert.equal(gradatieDinVechime(25), 5);
  // 2,00 × 4.000 = 8.000 → ×1,075 ×1,05 ×1,05 = 9.481,5 → 9.482
  assert.equal(aplicaGradatie(8000, 3), 9482);
});

test("militar (Anexa VI): 7 gradații de 3% + soldă de grad fără gradații", () => {
  assert.equal(gradatiiForAnexa("VI"), GRADATII_APARARE);
  assert.equal(gradatiiForAnexa("VIII"), GRADATII);
  assert.equal(gradatieDinVechime(22, GRADATII_APARARE), 7);
  assert.equal(gradatieDinVechime(8, GRADATII_APARARE), 2);
  // colonel 3,02 × 4.000 = 12.080 × 1,03^7 = 14.856,88 → 14.857 (soldă de funcție)
  const soldaFunctie = aplicaGradatie(3.02 * 4000, 7, GRADATII_APARARE);
  assert.equal(soldaFunctie, 14857);
  // + soldă de grad colonel 0,75 × 4.000 = 3.000 (grila 20 aug.)
  const r = brut(soldaFunctie, { soldaGradCoef: 0.75 });
  assert.equal(r.soldaGrad, 3000);
  assert.equal(r.salariuBrut, 17857);
  assert.equal(r.cas, 4464); // 4.464,25
  assert.equal(r.cass, 1786); // 1.785,70
  assert.equal(r.impozit, 1161); // 11.607 × 10% = 1.160,7
  assert.equal(r.salariuNet, 10446);
});

test("garanția salariului minim (art. 10 alin. 8 din proiect)", () => {
  // coef 0,989335 × 4.000 = 3.957,34 → 3.958 la gradația 0
  const r = brut(3958);
  assert.equal(r.completareSalariuMinim, 367);
  assert.equal(r.salariuBrut, 4325);
  // peste minim: fără completare
  assert.equal(brut(4400).completareSalariuMinim, 0);
  // dezactivabilă
  assert.equal(brut(3958, { salariuMinimGarantat: false }).salariuBrut, 3958);
});

test("sporuri: noapte 25% din tariful orar doar pe orele de noapte (art. 17)", () => {
  const noapte = {
    id: "noapte",
    nume: "noapte",
    tip: "procent",
    valoare: 25,
    inclusInPlafon20: false,
    inputKind: "orar",
  };
  // 6.600 lei / 165 h = 40 lei/h × 20 h × 25% = 200 lei
  const r = calcBrut({
    salariuBaza: 6600,
    sporuri: [{ spor: noapte, activ: true, ore: 20 }],
    valoareReferinta: 4000,
    oreNormaLunara: 165,
  });
  assert.equal(r.sporuriExceptate, 200);
  assert.equal(r.salariuBrut, 6800);
});

test("spor handicap: 15% din valoarea de referință, în afara plafonului (art. 19)", () => {
  const handicap = { id: "handicap", nume: "h", tip: "valoare", valoare: 15, inclusInPlafon20: false };
  const r = calcBrut({ salariuBaza: 8000, sporuri: [{ spor: handicap, activ: true }], valoareReferinta: 4000 });
  assert.equal(r.sporuriExceptate, 600);
  assert.equal(r.salariuBrut, 8600);
});

test("plafonul de 20% include solda de grad (art. 21 alin. 2, 17 iul./20 aug.)", () => {
  const cfp = { id: "cfp", nume: "cfp", tip: "procent", valoare: 22, inclusInPlafon20: true };
  const input = { salariuBaza: 10000, sporuri: [{ spor: cfp, activ: true }], valoareReferinta: 4000, soldaGradCoef: 0.75 };
  // 22% × 10.000 = 2.200 ≤ 20% × (10.000 + 3.000) = 2.600
  assert.equal(calcBrut(input).sporuriDepasescPlafon, false);
  // în varianta 25 mai baza nu include solda de grad: 2.200 > 2.000
  assert.equal(calcBrut({ ...input, plafonIncludeSoldaGrad: false }).sporuriDepasescPlafon, true);
});
