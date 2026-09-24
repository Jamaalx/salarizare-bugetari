# Changelog

Toate schimbările notabile ale proiectului sunt consemnate aici.
Formatul urmează [Keep a Changelog](https://keepachangelog.com/ro/1.1.0/).

## [Nepublicat]

### Corecții de calcul — audit din 24 septembrie 2026
Fiecare regulă verificată pe sursa oficială; tabelul complet în `docs/verificare-calcule-2026-09-24.md`.
- **Deducerea personală** (Cod fiscal art. 77, forma OG 16/2022, consolidată pe legislatie.just.ro la 08.08.2026): codul folosea formula de dinainte de 2023 (510 lei + 160 lei/persoană, pe trepte de 100 lei). Acum: 20/25/30/35/45% din salariul minim, minus 0,5 pp pe fiecare tranșă de 50 lei, 0 peste minim + 2.000 lei; plus deducerile suplimentare (alin. 10): 15% din salariul minim sub 26 de ani, 100 lei/copil înscris în învățământ (câmpuri noi în Wizard și parametri opționali în MCP). Exemplu: brut 4.325 lei fără persoane — impozit 235 → 195 lei, net +40 lei.
- **Salariul minim brut**: 4.050 → 4.325 lei (HG 146/2026, de la 1 iulie 2026).
- **Gradațiile militarilor/polițiștilor** (proiect art. 13 alin. 1 + Anexa VI art. 4 alin. 3): calculatorul Expert și tool-ul MCP `calculate_salary` aplicau tabelul civil; acum 7 gradații de 3% (ca în Wizard). Exemplu: colonel 3,02, 4 ani: soldă de funcție 12.986 → 12.443 lei. MCP: parametru opțional `anexa`.
- **Garanția salariului minim** (proiect art. 10 alin. 8): salariul de bază/solda de funcție sub salariul minim se completează până la acesta (24 de funcții în varianta 20 aug., ex. coef 0,989335: +367 lei).
- **Plafonul de 20%** (art. 21 alin. 2): avertismentul individual include solda de grad în bază (variantele 17 iul./20 aug.); textul „au fost capate” corectat — sporurile nu se taie individual.
- **Rotunjiri**: CAS, CASS și impozitul se calculează pe brutul afișat (rotunjit la leu); brut − CAS − CASS − impozit = net exact.
- **Scutirea pentru IT** (Cod fiscal art. 60 pct. 2) scoasă din text — abrogată de la 01.01.2025 (OUG 156/2024).
- Teste: `npm test` (node:test, 15 exemple calculate de mână).

### Securitate — OAuth pentru MCP
- `/oauth/authorize` și `/oauth/register` acceptă doar `redirect_uri` din listă (conectorul Claude, ChatGPT, `localhost`, plus `OAUTH_REDIRECT_ALLOWLIST`); înainte acceptau orice URL https (open redirect cu aprobare automată).
- Fără secret de rezervă public: fără `OAUTH_SIGNING_SECRET` (min. 32 caractere) OAuth e dezactivat cu 503 și mesaj clar, iar `/api/mcp` rămâne public.
- `/api/mcp` verifică token-urile Bearer trimise (semnătură, expirare, tip); cererile fără token merg anonim, ca înainte.

### Mentenanță (24 septembrie 2026)
- Dependențe: `npm audit fix` (browserslist — high, qs, baseline-browser-mapping, postcss-selector-parser) → 0 vulnerabilități; actualizări patch/minor fără schimbări de major (Next.js 15.5.26, React 19.3, TypeScript 5.9, Tailwind 3.4.19, lucide-react 1.48). Nicio formulă, coeficient sau sumă nu s-a schimbat.
- `/api/chat`, `/api/mcp`: limita pe IP folosește întâi `cf-connecting-ip` (primul element din `X-Forwarded-For` putea fi falsificat de client și ocolea limita).
- `/api/chat`: timeout de 30 s la apelul NVIDIA NIM.
- README: stack-ul la zi, CNAME-ul corect (`salarii`).

### Adăugat
- **Trei variante ale proiectului de lege** (25 mai, 17 iulie, 20 august 2026), selectabile din bara de sus; implicit se calculează pe varianta din 20 august (ultimul text oficial). Selecția se reflectă în URL (`?varianta=2026-07-17`) pentru link-uri partajabile.
- `scripts/import-coeficienti.mjs` — importator reproductibil din xlsx-ul MMFTSS în schema `data/coefficients.min.json`, cu raport complet (rânduri neinterpretate, coloane ignorate, sheet-uri duplicate, comparație cu un set de referință). Separă soldele de grad (Anexa VI cap. I.2) în `*.solde-grad.json`, desparte rândurile Grad I / Grad II, citește coloana „Grad/treaptă” din Anexa II (aug) și coloanele eșalonate 2026/2027 → 2031 din Anexa IX (`coeficientEsalonat`).
- `scripts/verify-variants.mjs` (rulat în CI) — verifică schema seturilor și valorile-reper din textele oficiale (medic primar 4,00; medic 1,76 → 2,16; farmacist primar 2,40 → 2,70 → 2,90; Mareșal 1,00 → 1,10; Soldat 0,10 → 0,40; VR 4100/4100/4000).
- `data/variants/index.json` + `lib/variants.ts` — metadatele fiecărei variante (valoare de referință, articol, intrare în vigoare, referința diferenței tranzitorii, surse, note, grila soldelor de grad).
- `/api/coeficienti/<varianta>` — setul de coeficienți al unei variante (prerandat la build).
- Tool MCP nou `list_variante`; parametrul opțional `varianta` la `search_function`, `calculate_salary`, `list_anexe`, `get_law_article`.
- Banner „Proiectul de lege NU a fost adoptat” (26 august 2026) și secțiunea „Ce s-a schimbat între variante”, cu lista a ceea ce NU este modelat (categoriile de unități din sănătate, titlul de doctor 500 lei, premiul de performanță).
- Copii locale ale surselor pentru iulie (xlsx + docx) și august (xlsx + pdf) în `public/sources/`.
- Câmpul `subcapitol` (treapta de populație) pe rândurile din Anexa VIII administrație locală — afișat în listele de funcții.

### Modificat
- `lib/tax.ts`: `soldaGradByKey()` și `esteRandSoldaDeGrad()` primesc grila soldelor de grad ca parametru (implicit grila din 25 mai); nicio formulă nu s-a schimbat. `VALOARE_REFERINTA_DEFAULT` este păstrată doar pentru compatibilitate.
- Trimiterile la „art. 47 alin. (2)” pentru valoarea de referință corectate: art. 35 alin. (2) în varianta din 25 mai (art. 36 alin. 2 la 17 iulie, art. 38 alin. 3 la 20 august).
- Căutarea funcțiilor caută și în grad, treapta de populație și cod (Wizard, Expert, MCP).
- Prompt-ul asistentului AI descrie cele trei variante și starea proiectului.

### Cunoscut / nemodelat
- Anexa II cap. II (20 august): categoriile de unități sanitare și factorii de multiplicare pe grupe depind de HG — nu se aplică.
- Anexa III cap. V (case de cultură) lipsește din xlsx-ul din 20 august.
- Indemnizația pentru titlul de doctor (500 lei, art. 39, 20 august) și premiul de performanță nu intră în estimare.
