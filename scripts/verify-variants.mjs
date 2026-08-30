#!/usr/bin/env node
/**
 * Verifică integritatea seturilor de date pe variante (rulat în CI):
 *  - data/variants/index.json trimite la fișiere existente, cu schema așteptată;
 *  - valori-reper cunoscute din textele oficiale (medic primar 4,00 în toate
 *    variantele; medic 1,76 → 2,16; farmacist primar 2,40 → 2,70 → 2,90;
 *    Mareșal 1,00 → 1,10; Soldat 0,10 → 0,40; valoarea de referință 4100/4100/4000);
 *  - nicio funcție selectabilă din Anexa VI nu are coeficient ≤ pragul soldei de grad;
 *  - codurile respectă formatul NN.NNNNNNNN.NN.N (sau lipsesc).
 *
 *   node scripts/verify-variants.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VARIANTS_DIR = path.join(ROOT, "data", "variants");
const CODE_RE = /^\d{2}\.\d{8}\.\d{2}\.\d$/;
const ROMAN = /^(IX|VIII|VII|VI|IV|V|III|II|I)(?=[\s_]|$)/;

let failures = 0;
const ok = (msg) => console.log(`  ✓ ${msg}`);
const fail = (msg) => {
  failures++;
  console.log(`  ✗ ${msg}`);
};
const check = (cond, msg) => (cond ? ok(msg) : fail(msg));
const near = (a, b) => Math.abs(a - b) < 1e-6;

const index = JSON.parse(fs.readFileSync(path.join(VARIANTS_DIR, "index.json"), "utf8"));
const fold = (s) =>
  String(s).toLowerCase().replace(/[șş]/g, "s").replace(/[țţ]/g, "t").replace(/[ăâ]/g, "a").replace(/î/g, "i").replace(/\s+/g, " ").trim();

/** Caută coeficientul unei funcții din Anexa II cap. I.2 după nume (+ grad, studii). */
function coefSanatate(rows, functieRe, { grad = null, studii = "S" } = {}) {
  const hits = rows.filter(
    (e) =>
      e.anexa === "II" &&
      /CI 2/.test(e.sheet) &&
      functieRe.test(fold(e.functie)) &&
      (studii === null || e.studii === studii) &&
      (grad === null || fold(e.grad) === fold(grad)),
  );
  return hits.length ? hits[0].coeficient : null;
}

// Valorile-reper (din textele/xlsx-urile oficiale). Dacă xlsx-ul contrazice
// tabelul, xlsx-ul are întâietate — testul pică și discrepanța se raportează.
const EXPECT = {
  "2026-05-25": { vr: 4100, medicPrimar: 4.0, medicSpecialist: 3.2, medic: 1.76, farmacistPrimar: 2.4, asistentSPrincipal: 1.9, maresal: 1.0, soldat: 0.1, minRows: 2600 },
  "2026-07-17": { vr: 4100, medicPrimar: 4.0, medicSpecialist: 3.2, medic: 2.16, farmacistPrimar: 2.7, asistentSPrincipal: 1.92, maresal: 1.1, soldat: 0.4, minRows: 2700 },
  "2026-08-20": { vr: 4000, medicPrimar: 4.0, medicSpecialist: 3.2, medic: 2.16, farmacistPrimar: 2.9, asistentSPrincipal: 1.92, maresal: 1.1, soldat: 0.4, minRows: 2900, rezidentAnV: 2.45, rezidentAnIV: 2.35 },
};

check(index.implicit === "2026-08-20", `varianta implicită este 2026-08-20 (găsit: ${index.implicit})`);
check(Array.isArray(index.variante) && index.variante.length === 3, `3 variante în index.json (găsit: ${index.variante?.length})`);

const summary = [];
for (const v of index.variante) {
  console.log(`\n== ${v.id} — ${v.etichetaLunga}`);
  const exp = EXPECT[v.id];
  if (!exp) {
    fail(`variantă fără valori-reper în verify-variants.mjs: ${v.id}`);
    continue;
  }
  const coefPath = path.resolve(VARIANTS_DIR, v.fisiere.coeficienti);
  const soldePath = path.resolve(VARIANTS_DIR, v.fisiere.soldeGrad);
  if (!fs.existsSync(coefPath) || !fs.existsSync(soldePath)) {
    fail(`fișiere lipsă: ${coefPath} / ${soldePath}`);
    continue;
  }
  const rows = JSON.parse(fs.readFileSync(coefPath, "utf8"));
  const solde = JSON.parse(fs.readFileSync(soldePath, "utf8"));

  // schema
  const REQUIRED = ["anexa", "anexaNume", "capitol", "sheet", "functie", "studii", "grad", "vechime", "coeficient", "cod", "nrCrt"];
  const badSchema = rows.filter((e) => REQUIRED.some((k) => !(k in e)) || typeof e.coeficient !== "number");
  check(badSchema.length === 0, `schema rândurilor (${rows.length} rânduri, ${badSchema.length} cu câmpuri lipsă)`);
  check(rows.length >= exp.minRows, `cel puțin ${exp.minRows} rânduri (găsit ${rows.length})`);

  // anexe
  const anexaOf = (e) => e.anexa || (String(e.sheet).match(ROMAN)?.[1] ?? "");
  const perAnexa = {};
  for (const e of rows) perAnexa[anexaOf(e)] = (perAnexa[anexaOf(e)] ?? 0) + 1;
  const missing = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"].filter((a) => !perAnexa[a]);
  check(missing.length === 0, `toate anexele I–IX au rânduri ${JSON.stringify(perAnexa)}`);

  // coduri
  const badCodes = rows.filter((e) => e.cod && !CODE_RE.test(e.cod));
  check(badCodes.length <= 1, `coduri în format NN.NNNNNNNN.NN.N (${badCodes.length} în alt format${badCodes.length ? ": " + badCodes.map((e) => e.cod).join(", ") : ""})`);

  // valoarea de referință
  check(v.valoareReferinta === exp.vr, `valoarea de referință ${exp.vr} lei (index: ${v.valoareReferinta})`);

  // solde de grad
  check(solde.length === 22, `grila soldelor de grad are 22 de rânduri (găsit ${solde.length})`);
  const maresal = solde.find((g) => /mare[sș]al/i.test(g.label))?.coef;
  const soldat = solde.find((g) => /^soldat/i.test(g.label))?.coef;
  check(maresal !== undefined && near(maresal, exp.maresal), `Mareșal ${exp.maresal} (găsit ${maresal})`);
  check(soldat !== undefined && near(soldat, exp.soldat), `Soldat ${exp.soldat} (găsit ${soldat})`);
  const prag = Math.max(...solde.map((g) => g.coef));
  const viFunctii = rows.filter((e) => anexaOf(e) === "VI" && e.coeficient > prag);
  const viSolde = rows.filter((e) => anexaOf(e) === "VI" && e.coeficient <= prag);
  const viSoldeOk = v.id === "2026-05-25" ? viSolde.length === 13 : viSolde.length === 0;
  check(viSoldeOk, `Anexa VI: ${viFunctii.length} funcții > ${prag}; ${viSolde.length} rânduri ≤ prag ${v.id === "2026-05-25" ? "(cele 13 rânduri istorice, filtrate în UI)" : "(niciunul — soldele sunt în fișier separat)"}`);

  // sănătate
  const isAug = v.id === "2026-08-20";
  const medicPrimar = isAug ? coefSanatate(rows, /^medic \*1\)$/, { grad: "primar" }) : coefSanatate(rows, /^medic primar$/);
  const medicSpec = isAug ? coefSanatate(rows, /^medic \*1\)$/, { grad: "specialist" }) : coefSanatate(rows, /^medic specialist$/);
  const medic = isAug ? coefSanatate(rows, /^medic \*1\)$/, { grad: "" }) : coefSanatate(rows, /^medic$/);
  const farmPrimar = isAug ? coefSanatate(rows, /^farmacist \*2\)$/, { grad: "primar" }) : coefSanatate(rows, /^farmacist primar/);
  const asistS = isAug
    ? coefSanatate(rows, /^asistent medical; tehnician de radiologie/, { grad: "principal", studii: "S" })
    : coefSanatate(rows, /^asistent medical; tehnician de radiologie.*principal/, { studii: "S" });
  check(near(medicPrimar ?? -1, exp.medicPrimar), `medic primar ${exp.medicPrimar} (găsit ${medicPrimar})`);
  check(near(medicSpec ?? -1, exp.medicSpecialist), `medic specialist ${exp.medicSpecialist} (găsit ${medicSpec})`);
  check(near(medic ?? -1, exp.medic), `medic (fără grad) ${exp.medic} (găsit ${medic})`);
  check(near(farmPrimar ?? -1, exp.farmacistPrimar), `farmacist primar ${exp.farmacistPrimar} (găsit ${farmPrimar})`);
  check(near(asistS ?? -1, exp.asistentSPrincipal), `asistent medical S principal ${exp.asistentSPrincipal} (găsit ${asistS})`);
  if (isAug) {
    const anV = coefSanatate(rows, /^medic rezident$/, { grad: "anul V *1)" });
    const anIV = coefSanatate(rows, /^medic rezident$/, { grad: "anul IV" });
    check(near(anV ?? -1, exp.rezidentAnV), `medic rezident an V ${exp.rezidentAnV} (găsit ${anV})`);
    check(near(anIV ?? -1, exp.rezidentAnIV), `medic rezident an IV ${exp.rezidentAnIV} (găsit ${anIV})`);
    const esalonate = rows.filter((e) => e.coeficientEsalonat);
    check(esalonate.length > 50 && esalonate.every((e) => near(e.coeficient, Object.values(e.coeficientEsalonat)[0])), `Anexa IX eșalonată: ${esalonate.length} rânduri, coeficient = prima coloană`);
    const presedinte = rows.find((e) => e.anexa === "IX" && /^presedintele romaniei/.test(fold(e.functie)));
    check(presedinte && near(presedinte.coeficientEsalonat?.["2031"] ?? -1, 8), `Președintele României: 8,00 în 2031 (găsit ${presedinte?.coeficientEsalonat?.["2031"]})`);
  }

  summary.push({ id: v.id, randuri: rows.length, functii: rows.length - viSolde.length, vr: v.valoareReferinta });
}

console.log("\n== Rezumat");
for (const s of summary) console.log(`  ${s.id}: ${s.randuri} rânduri, ${s.functii} funcții selectabile, VR ${s.vr} lei`);
if (failures) {
  console.log(`\n${failures} verificări au eșuat.`);
  process.exit(1);
}
console.log("\nToate verificările au trecut.");
