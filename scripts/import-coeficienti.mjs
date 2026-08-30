#!/usr/bin/env node
/**
 * Importă coeficienții de salarizare din xlsx-ul publicat de MMFTSS
 * („Proiect-COEFICIENTI-1-8-…xlsx") în schema folosită de calculator
 * (aceeași cu data/coefficients.min.json).
 *
 *   node scripts/import-coeficienti.mjs <fisier.xlsx> <varianta> [opțiuni]
 *
 *   <varianta>   id-ul variantei, ex. 2026-08-20 (data publicării)
 *   --out-dir    directorul de ieșire (implicit data/variants)
 *   --compare    un .min.json de referință (ex. data/coefficients.min.json)
 *                pentru compararea numărului de rânduri pe sheet/anexă
 *   --dry-run    nu scrie fișiere, doar raportează
 *
 * Ieșire:
 *   <out-dir>/<varianta>.min.json        rândurile (funcții selectabile)
 *   <out-dir>/<varianta>.solde-grad.json grila soldelor de grad (Anexa VI cap. I.2)
 *
 * Raportul (rânduri neinterpretate, coloane ignorate, sheet-uri duplicate,
 * diferențe față de referință) se scrie pe stdout — NIMIC nu e aruncat tăcut.
 *
 * Reguli de interpretare (verificate pe variantele 25 mai / 17 iul / 20 aug 2026):
 *  - fiecare sheet = una sau mai multe tabele; o tabelă începe la rândul de antet
 *    care conține „Nr. crt" + „Funcția" (sau „Gradul militar…" pentru soldele de grad);
 *  - coloanele de coeficient = coloanele din dreapta funcției cu valori numerice
 *    în [0.05, 9.5]; coloanele cu sume în lei (> 9.5, ex. TIC, culte) și cele cu
 *    factori (< 0.05, ex. 0.0225 în Anexa II aug) sunt ignorate și raportate;
 *  - etichetele de deasupra coloanelor („Grad I / Grad II", „Nivel I/II",
 *    „Grad managerial", „minim/maxim", „comandă/execuție") dau câmpul `grad`
 *    când sheet-ul nu are o coloană explicită de grad; un rând cu Grad I și
 *    Grad II devine două înregistrări;
 *  - Anexa IX (aug): coloane eșalonate 2026/2027, 2028 … 2031 → o singură
 *    înregistrare cu `coeficient` = prima coloană și `coeficientEsalonat` = toate;
 *  - Anexa VI cap. I.2 (solde de grad, coef ≤ 1.10) NU devine funcție — merge în
 *    fișierul separat `.solde-grad.json`;
 *  - `subcapitol` (opțional) = treapta de populație a sheet-ului (Anexa VIII
 *    administrație locală), ca rândurile identice din local1…local4 să poată fi
 *    deosebite în interfață;
 *  - numele funcției se moștenește pe rândurile fără nume (variante de grad/
 *    vechime/studii); rândurile de tip „Preot" + „gradul I" (nume pe un rând,
 *    gradul pe rândurile de sub el) sunt unite.
 */
import * as XLSX from "xlsx";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// ─── CLI ────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const positional = [];
const opts = { outDir: "data/variants", compare: null, dryRun: false };
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--out-dir") opts.outDir = args[++i];
  else if (a === "--compare") opts.compare = args[++i];
  else if (a === "--dry-run") opts.dryRun = true;
  else if (a.startsWith("--")) die(`Opțiune necunoscută: ${a}`);
  else positional.push(a);
}
const [xlsxPath, varianta] = positional;
if (!xlsxPath || !varianta) {
  die("Utilizare: node scripts/import-coeficienti.mjs <fisier.xlsx> <varianta> [--out-dir d] [--compare ref.min.json] [--dry-run]");
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(varianta)) die(`Id-ul variantei trebuie să fie o dată ISO (ex. 2026-08-20), nu „${varianta}"`);

function die(msg) {
  console.error(msg);
  process.exit(1);
}

// ─── Constante ──────────────────────────────────────────────────────────────
const CODE_RE = /^\d{2}\.\d{8}\.\d{2}\.\d$/;
const CODE_LIKE_RE = /^\d{2}\.\d{5,}/;
const ROMAN_RE = /^(IX|VIII|VII|VI|IV|V|III|II|I)(?=[\s_]|$)/;
const ANEXA_NUME = {
  I: "Învățământ și cercetare",
  II: "Sănătate și asistență socială",
  III: "Cultură",
  IV: "Diplomație",
  V: "Justiție",
  VI: "Apărare, ordine publică și securitate națională",
  VII: "Instituții din venituri proprii",
  VIII: "Administrație",
  IX: "Funcții de demnitate publică",
};
const COEF_MIN = 0.05;
const COEF_MAX = 9.5;

// ─── Utilitare ──────────────────────────────────────────────────────────────
const fold = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[șş]/g, "s")
    .replace(/[țţ]/g, "t")
    .replace(/[ăâ]/g, "a")
    .replace(/î/g, "i")
    .replace(/\s+/g, " ")
    .trim();
const clean = (v) => (v === null || v === undefined ? "" : String(v).replace(/\s+/g, " ").trim());
const isBlank = (v) => v === null || v === undefined || (typeof v === "string" && v.trim() === "");
const dashOrEmpty = (s) => (s === "-" || s === "–" || s === "—" ? "" : s);

/** număr sau string numeric („1,10", „0,96") → number; altfel null */
function toNumber(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const t = v.trim().replace(",", ".");
    if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  }
  return null;
}
const isCoefValue = (n) => n !== null && n >= COEF_MIN && n <= COEF_MAX;

function parseNrCrt(v) {
  if (typeof v === "number" && Number.isInteger(v)) return v;
  if (typeof v === "string" && /^\d+\.?$/.test(v.trim())) return parseInt(v, 10);
  return null;
}

/** cheia pentru coloanele eșalonate: „2026/2027" → „2027", 2028 → „2028" */
function phasedKey(v) {
  const s = clean(v);
  const m = s.match(/^(20\d\d)\s*\/\s*(20\d\d)$/);
  if (m) return m[2];
  if (/^20\d\d$/.test(s)) return s;
  return null;
}

// ─── Raport ─────────────────────────────────────────────────────────────────
const report = {
  fisier: xlsxPath,
  varianta,
  sheets: [],
  sheetsDuplicate: [],
  sheetsFaraTabel: [],
  randuriNeinterpretate: [], // {sheet, rand, motiv, continut}
  coloaneIgnorate: [], // {sheet, coloana, motiv, exemplu}
  etichete: {}, // etichete de coloană întâlnite → număr de apariții
  coduriCiudate: [],
  avertismente: [],
};
const warn = (m) => report.avertismente.push(m);

// ─── Citire ─────────────────────────────────────────────────────────────────
const buf = fs.readFileSync(xlsxPath);
const sha256 = crypto.createHash("sha256").update(buf).digest("hex");
const wb = XLSX.read(buf, { cellDates: false });

const data = [];
const soldeGrad = [];
const seenSheets = new Map(); // nume trimis → JSON al rândurilor (pt. duplicate)

for (const rawName of wb.SheetNames) {
  const sheetName = rawName.trim();
  const ws = wb.Sheets[rawName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });
  const anexaMatch = sheetName.match(ROMAN_RE);
  if (!anexaMatch) {
    report.sheetsFaraTabel.push({ sheet: sheetName, motiv: "numele nu începe cu numărul anexei" });
    continue;
  }
  const anexa = anexaMatch[1];
  const capitol = sheetName.replace(ROMAN_RE, "").replace(/^[\s_]+/, "").trim() || sheetName;

  // Sheet-uri duplicate („VIII CI A 3 (local2) (2)") — copii identice se sar.
  const dupMatch = sheetName.match(/^(.*)\s\(\d+\)$/);
  const rowsJson = JSON.stringify(rows);
  if (dupMatch && seenSheets.has(dupMatch[1].trim())) {
    const identical = seenSheets.get(dupMatch[1].trim()) === rowsJson;
    report.sheetsDuplicate.push({ sheet: sheetName, original: dupMatch[1].trim(), identic: identical });
    if (identical) continue;
    warn(`Sheet-ul „${sheetName}" e o copie DIFERITĂ a „${dupMatch[1].trim()}" — importat separat, verifică manual.`);
  }
  seenSheets.set(sheetName, rowsJson);

  const title = rows
    .slice(0, 8)
    .flatMap((r) => r.filter((c) => typeof c === "string" && c.trim().length > 20))
    .slice(0, 3)
    .map(clean)
    .join(" | ")
    .slice(0, 200);

  // Sub-capitolul (treapta de populație pentru administrația locală, ex.
  // „2. Unități administrativ-teritoriale între 120.001 și 200.000 locuitori")
  // — singura informație care deosebește sheet-urile „local1…local4".
  const subcapitol = clean(
    rows
      .slice(0, 12)
      .flatMap((r) => r.filter((c) => typeof c === "string" && /locuitori/i.test(c)))
      .find(Boolean) ?? "",
  )
    .replace(/^\d+\.\s*|^[A-D]\.\s*/, "")
    .replace(/^Unit[ăa][țţ]ii\b/, "Unități");

  // ── 1. antetele tabelelor ──
  const headerIdx = [];
  rows.forEach((r, i) => {
    const cells = r.map((c) => (typeof c === "string" ? fold(c) : ""));
    const hasNr = cells.some((c) => /^nr\.? ?crt/.test(c));
    const hasFn = cells.some((c) => /^func(t|ţ)i[ae]|gradul militar/.test(c));
    if (hasNr && hasFn) headerIdx.push(i);
  });
  if (headerIdx.length === 0) {
    report.sheetsFaraTabel.push({ sheet: sheetName, motiv: "nu am găsit rândul de antet (Nr. crt + Funcția)" });
    continue;
  }

  let extracted = 0;
  for (let t = 0; t < headerIdx.length; t++) {
    const hIdx = headerIdx[t];
    const end = t + 1 < headerIdx.length ? headerIdx[t + 1] : rows.length;
    const header = rows[hIdx];
    const hf = header.map((c) => (typeof c === "string" ? fold(c) : ""));
    const colNr = hf.findIndex((c) => /^nr\.? ?crt/.test(c));
    const colFunctie = hf.findIndex((c, i) => i > colNr && /^func(t|ţ)i[ae]|gradul militar/.test(c));
    const isSoldeTable = /gradul militar/.test(hf[colFunctie]);
    const colVechime = hf.findIndex((c, i) => i > colFunctie && /vechim/.test(c));
    const colStudii = hf.findIndex((c, i) => i > colFunctie && i !== colVechime && /nivel.*studi|studi.*nivel|^studii/.test(c));
    let colGrad = hf.findIndex(
      (c, i) => i > colFunctie && i !== colVechime && i !== colStudii && /^grad|treapt/.test(c) && !/gradul militar/.test(c),
    );

    const body = rows.slice(hIdx + 1, end);

    // ── 2. clasificarea coloanelor după conținut ──
    const stats = new Map(); // col → {coef, lei, mic, text}
    for (const r of body) {
      r.forEach((v, c) => {
        if (c <= colFunctie || isBlank(v)) return;
        const st = stats.get(c) ?? { coef: 0, lei: 0, mic: 0, text: 0, exemplu: null };
        const n = toNumber(v);
        if (n === null) st.text++;
        else if (isCoefValue(n)) st.coef++;
        else if (n > COEF_MAX) { st.lei++; st.exemplu ??= v; }
        else { st.mic++; st.exemplu ??= v; }
        stats.set(c, st);
      });
    }
    if (colGrad >= 0 && (stats.get(colGrad)?.coef ?? 0) > 0) colGrad = -1; // „Grad profesional" e antet de coeficienți (TIC)
    const coefCols = [];
    for (const [c, st] of [...stats.entries()].sort((a, b) => a[0] - b[0])) {
      if (c === colStudii || c === colVechime || c === colGrad) continue;
      if (st.coef > 0 && st.lei === 0) coefCols.push(c);
      else if (st.lei > 0 && st.coef > 0)
        report.coloaneIgnorate.push({ sheet: sheetName, coloana: XLSX.utils.encode_col(c), motiv: "valori mixte coeficient/lei — ignorată", exemplu: st.exemplu });
      else if (st.lei > 0)
        report.coloaneIgnorate.push({ sheet: sheetName, coloana: XLSX.utils.encode_col(c), motiv: "sume în lei (nu coeficienți)", exemplu: st.exemplu });
      else if (st.mic > 0)
        report.coloaneIgnorate.push({ sheet: sheetName, coloana: XLSX.utils.encode_col(c), motiv: "valori < 0.05 (factori, nu coeficienți)", exemplu: st.exemplu });
    }
    if (coefCols.length === 0) {
      report.sheetsFaraTabel.push({ sheet: sheetName, motiv: `tabela de la rândul ${hIdx + 1} nu are coloane de coeficienți` });
      continue;
    }
    const isCoefCol = (c) => coefCols.includes(c);

    // ── 3. etichete de coloană ──
    const groupLabel = new Map(); // col → string ("Grad I", "Comandă", "", …)
    const subLabel = new Map(); // col → "minim" | "maxim"
    const phased = new Map(); // col → "2027" …
    const noteLabel = (raw) => { report.etichete[raw] = (report.etichete[raw] ?? 0) + 1; };

    function applyLabelRow(r) {
      const cells = [];
      r.forEach((v, c) => {
        if (c <= colFunctie || isBlank(v) || !isCoefCol(c)) return;
        if (toNumber(v) !== null && phasedKey(v) === null) return; // o valoare, nu o etichetă
        cells.push([c, v]);
      });
      if (cells.length === 0) return false;
      const groups = [];
      const subs = [];
      for (const [c, v] of cells) {
        const raw = clean(v);
        const f = fold(raw);
        const yk = phasedKey(raw);
        noteLabel(raw);
        if (yk) phased.set(c, yk);
        else if (/^[-–—]$/.test(f)) continue; // celulă goală („-"), nu etichetă
        else if (/^(minim|maxim)$/.test(f)) subs.push([c, f]);
        else if (/minim|maxim/.test(f)) subs.push([c, /minim/.test(f) ? "minim" : "maxim"]);
        else if (/comand/.test(f)) groups.push([c, "Comandă"]); // Anexa VI: comandă / execuție
        else if (/execu/.test(f)) groups.push([c, "Execuție"]);
        else if (/coeficien|salarii de baz/.test(f)) continue; // antet generic, nu resetează
        else if (/gradat?ia 0/.test(f)) groups.push([c, ""]);
        else if (/^categoria/.test(f)) continue; // metadată (Anexa II aug) — nu e grad
        else if (/^grad managerial/.test(f)) groups.push([c, "Grad managerial"]);
        else if (/^(grad|nivel) (i|ii|iii|iv)$/.test(f)) groups.push([c, raw.replace(/^grad/i, "Grad").replace(/^nivel/i, "Nivel")]);
        else groups.push([c, raw]);
      }
      if (groups.length) {
        groupLabel.clear();
        subLabel.clear();
        // forward-fill spre dreapta peste coloanele de coeficient
        let cur = null;
        for (const c of coefCols) {
          const g = groups.find(([gc]) => gc === c);
          if (g) cur = g[1];
          else if (cur === null) continue;
          groupLabel.set(c, cur);
        }
      }
      for (const [c, s] of subs) subLabel.set(c, s);
      return groups.length > 0 || subs.length > 0;
    }
    applyLabelRow(header);

    // ── 4. rândurile de date ──
    let currentFunctie = null;
    let pendingParent = null; // {functie, nrCrt, rand}
    for (let i = 0; i < body.length; i++) {
      const r = body[i];
      const rowNo = hIdx + 2 + i;
      if (!r.some((c) => !isBlank(c))) continue;

      const nrCrt = colNr >= 0 ? parseNrCrt(r[colNr]) : null;
      const functieCell = clean(r[colFunctie]);
      const values = coefCols.map((c) => [c, toNumber(r[c])]).filter(([, n]) => isCoefValue(n));

      if (values.length === 0) {
        const labeled = applyLabelRow(r);
        if (functieCell && nrCrt !== null) {
          if (pendingParent && !pendingParent.used) {
            report.randuriNeinterpretate.push({ sheet: sheetName, rand: pendingParent.rand, motiv: "funcție fără niciun coeficient", continut: pendingParent.functie });
          }
          pendingParent = { functie: functieCell, nrCrt, rand: rowNo, used: false };
        } else if (!labeled && functieCell && !/^\s*[a-z0-9]{1,3}[.)]|^[\d.]+\s|^(nota|note|notă)/i.test(functieCell) && colNr >= 0 && isBlank(r[colNr]) && /^[a-zăâîșț]/.test(functieCell) && pendingParent) {
          // sub-rând fără coeficient sub un părinte (rar) — raportat
          report.randuriNeinterpretate.push({ sheet: sheetName, rand: rowNo, motiv: "sub-rând fără coeficient", continut: functieCell });
        }
        continue;
      }

      // nume funcție
      let functie;
      let gradFromName = "";
      if (functieCell) {
        if (pendingParent && nrCrt === null && /^[a-zăâîșț]/.test(functieCell)) {
          gradFromName = functieCell;
          functie = pendingParent.functie;
          pendingParent.used = true;
        } else {
          functie = functieCell;
          pendingParent = null;
        }
        currentFunctie = functie;
      } else if (pendingParent && nrCrt === null) {
        functie = pendingParent.functie;
        pendingParent.used = true;
        currentFunctie = functie;
      } else if (currentFunctie) {
        functie = currentFunctie;
      } else {
        report.randuriNeinterpretate.push({ sheet: sheetName, rand: rowNo, motiv: "coeficient fără nume de funcție", continut: JSON.stringify(r.filter((c) => !isBlank(c))) });
        continue;
      }

      if (isSoldeTable) {
        const [, n] = values[0];
        const nr = nrCrt ?? soldeGrad.length + 35;
        if (nrCrt === null) warn(`${sheetName} rând ${rowNo}: soldă de grad fără Nr. crt. — am presupus ${nr}`);
        soldeGrad.push({ nrCrt: nr, key: `g${nr}`, label: functie, coef: round6(n) });
        extracted++;
        continue;
      }

      const studii = colStudii >= 0 ? dashOrEmpty(clean(r[colStudii])) : "";
      const vechime = colVechime >= 0 ? dashOrEmpty(clean(r[colVechime])) : "";
      const gradCol = colGrad >= 0 ? dashOrEmpty(clean(r[colGrad])) : "";

      // coduri
      const codes = [];
      r.forEach((v, c) => {
        if (c <= colFunctie || typeof v !== "string") return;
        const s = v.trim();
        if (CODE_RE.test(s)) codes.push(s);
        else if (CODE_LIKE_RE.test(s)) {
          report.coduriCiudate.push({ sheet: sheetName, rand: rowNo, cod: s, functie });
          codes.push(s);
        }
      });

      const base = { anexa, anexaNume: ANEXA_NUME[anexa], capitol, sheet: sheetName, functie, studii, vechime };
      if (subcapitol) base.subcapitol = subcapitol;

      const phasedVals = values.filter(([c]) => phased.has(c));
      if (phasedVals.length > 0) {
        if (phasedVals.length !== values.length) warn(`${sheetName} rând ${rowNo}: amestec de coloane eșalonate și neeșalonate`);
        const esalonat = {};
        for (const [c, n] of phasedVals) esalonat[phased.get(c)] = round6(n);
        data.push({
          ...base,
          grad: gradCol || gradFromName || "",
          coeficient: round6(phasedVals[0][1]),
          cod: codes[0] ?? "",
          nrCrt,
          coeficientEsalonat: esalonat,
        });
        extracted++;
        continue;
      }

      values.forEach(([c, n], k) => {
        const g = gradCol || gradFromName || groupLabel.get(c) || "";
        const sub = subLabel.get(c);
        const grad = sub ? (g ? `${g} (${sub})` : sub) : g;
        const cod = codes.length === values.length ? codes[k] : codes[0] ?? "";
        data.push({ ...base, grad, coeficient: round6(n), cod, nrCrt });
        extracted++;
      });
    }
    if (pendingParent && !pendingParent.used) {
      report.randuriNeinterpretate.push({ sheet: sheetName, rand: pendingParent.rand, motiv: "funcție fără niciun coeficient", continut: pendingParent.functie });
    }
  }
  report.sheets.push({ sheet: sheetName, anexa, extracted, title, subcapitol: subcapitol || undefined });
}

function round6(n) {
  return Math.round(n * 1e6) / 1e6;
}

// ─── Validări ───────────────────────────────────────────────────────────────
const perAnexa = {};
for (const e of data) perAnexa[e.anexa] = (perAnexa[e.anexa] ?? 0) + 1;
const codeOk = data.filter((e) => CODE_RE.test(e.cod)).length;
const codeEmpty = data.filter((e) => !e.cod).length;
const codeBad = data.length - codeOk - codeEmpty;

const missingAnexe = Object.keys(ANEXA_NUME).filter((a) => !perAnexa[a]);
if (missingAnexe.length) warn(`Anexe fără niciun rând: ${missingAnexe.join(", ")}`);
const viLow = data.filter((e) => e.anexa === "VI" && e.coeficient <= 1.1);
if (viLow.length) warn(`${viLow.length} rânduri din Anexa VI au coeficient ≤ 1.10 — posibile solde de grad rămase printre funcții`);
if (soldeGrad.length && soldeGrad.length !== 22) warn(`Grila soldelor de grad are ${soldeGrad.length} rânduri (așteptat 22)`);
if (!soldeGrad.length) warn("Nu am găsit tabela soldelor de grad (Anexa VI cap. I.2)");

let compare = null;
if (opts.compare) {
  const ref = JSON.parse(fs.readFileSync(opts.compare, "utf8"));
  const refRows = Array.isArray(ref) ? ref : ref.data;
  const cnt = (rows) => {
    const m = {};
    for (const e of rows) {
      const s = String(e.sheet).trim();
      m[s] = (m[s] ?? 0) + 1;
    }
    return m;
  };
  const a = cnt(refRows);
  const b = cnt(data);
  const sheets = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
  compare = {
    referinta: opts.compare,
    totalReferinta: refRows.length,
    totalNou: data.length,
    sheetsLipsa: sheets.filter((s) => a[s] && !b[s]),
    sheetsNoi: sheets.filter((s) => !a[s] && b[s]),
    perSheet: sheets.map((s) => ({ sheet: s, referinta: a[s] ?? 0, nou: b[s] ?? 0, delta: (b[s] ?? 0) - (a[s] ?? 0) })),
  };
}

// ─── Scriere ────────────────────────────────────────────────────────────────
if (!opts.dryRun) {
  fs.mkdirSync(opts.outDir, { recursive: true });
  const outData = path.join(opts.outDir, `${varianta}.min.json`);
  const outSolde = path.join(opts.outDir, `${varianta}.solde-grad.json`);
  fs.writeFileSync(outData, JSON.stringify(data));
  fs.writeFileSync(outSolde, JSON.stringify(soldeGrad, null, 2) + "\n");
  console.log(`Scris ${outData} (${data.length} rânduri) și ${outSolde} (${soldeGrad.length} grade)`);
}

// ─── Raport ─────────────────────────────────────────────────────────────────
console.log(`\n=== Import ${varianta} din ${path.basename(xlsxPath)} (sha256 ${sha256.slice(0, 12)}…) ===`);
console.log(`Rânduri: ${data.length} | pe anexă: ${JSON.stringify(perAnexa)}`);
console.log(`Coduri: ${codeOk} valide (NN.NNNNNNNN.NN.N), ${codeEmpty} lipsă, ${codeBad} în alt format`);
console.log(`Solde de grad: ${soldeGrad.length}${soldeGrad.length ? ` (${soldeGrad[0].label} ${soldeGrad[0].coef} … ${soldeGrad.at(-1).label} ${soldeGrad.at(-1).coef})` : ""}`);
console.log(`Rânduri eșalonate (coeficientEsalonat): ${data.filter((e) => e.coeficientEsalonat).length}`);
console.log(`Sheet-uri: ${report.sheets.length} importate, ${report.sheetsDuplicate.length} duplicate, ${report.sheetsFaraTabel.length} fără tabel`);
for (const s of report.sheets) console.log(`  ${s.sheet.padEnd(26)} ${String(s.extracted).padStart(5)}`);
if (report.sheetsDuplicate.length) console.log("Sheet-uri duplicate:", JSON.stringify(report.sheetsDuplicate));
if (report.sheetsFaraTabel.length) console.log("Sheet-uri fără tabel:", JSON.stringify(report.sheetsFaraTabel));
console.log(`Coloane ignorate (${report.coloaneIgnorate.length}):`);
for (const c of report.coloaneIgnorate) console.log(`  ${c.sheet} col ${c.coloana}: ${c.motiv} (ex. ${c.exemplu})`);
console.log(`Rânduri neinterpretate (${report.randuriNeinterpretate.length}):`);
for (const r of report.randuriNeinterpretate) console.log(`  ${r.sheet} rând ${r.rand}: ${r.motiv} — ${String(r.continut).slice(0, 90)}`);
console.log(`Coduri în alt format (${report.coduriCiudate.length}):`);
for (const c of report.coduriCiudate) console.log(`  ${c.sheet} rând ${c.rand}: ${c.cod} (${c.functie.slice(0, 50)})`);
console.log("Etichete de coloană întâlnite:", JSON.stringify(report.etichete));
if (report.avertismente.length) {
  console.log(`Avertismente (${report.avertismente.length}):`);
  for (const w of report.avertismente) console.log(`  ! ${w}`);
}
if (compare) {
  console.log(`\nComparație cu ${compare.referinta}: ${compare.totalReferinta} → ${compare.totalNou} rânduri`);
  if (compare.sheetsLipsa.length) console.log("  sheet-uri LIPSĂ față de referință:", compare.sheetsLipsa.join(", "));
  if (compare.sheetsNoi.length) console.log("  sheet-uri NOI față de referință:", compare.sheetsNoi.join(", "));
  for (const p of compare.perSheet) {
    if (p.delta !== 0) console.log(`  ${p.sheet.padEnd(26)} ${String(p.referinta).padStart(5)} → ${String(p.nou).padStart(5)} (${p.delta > 0 ? "+" : ""}${p.delta})`);
  }
}
