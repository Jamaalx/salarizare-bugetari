# Verificarea calculelor — 24 septembrie 2026

Audit al tuturor calculelor din calculator (`lib/tax.ts`, `lib/tools.ts`, `lib/variants.ts`,
`components/Calculator.tsx`, `components/Wizard.tsx`, `data/`), fiecare regulă comparată cu sursa
oficială în vigoare la 24.09.2026.

## Context legal la 24.09.2026

- **Legea-cadru nr. 153/2017 este încă în vigoare.** Noua lege a salarizării NU a fost adoptată: pe
  26.08.2026 partidele au anunțat că nu au ajuns la consens și s-au angajat să o adopte până la
  sfârșitul anului ([salariile.ro](https://salariile.ro/noutati/legea-salarizarii-2026)).
  Calculatorul modelează **proiectul MMFTSS** în cele trei variante oficiale, nu Legea 153/2017.
  De aceea plafonul verificat este cel de 20% (art. 21 din proiect), nu cel de 30% (art. 25 din
  L153), iar gradațiile sunt cele din art. 13 al proiectului.
- Regulile fiscale (CAS, CASS, impozit, deducere) sunt cele din **Codul fiscal în vigoare la
  24.09.2026** — forma consolidată pe [legislatie.just.ro](https://legislatie.just.ro/Public/DetaliiDocument/171282)
  (ultima consolidare listată: **08.08.2026**). Regulile pentru 2027 nu sunt cunoscute.
- Textele proiectului: copii locale în `public/sources/` (lege 25 mai, 16/17 iulie, 20 august;
  xlsx-urile de coeficienți; reglementările specifice ale anexelor din 20 mai).

Legendă: **CORECT** · **GREȘIT → reparat** · **GREȘIT (nereparat)** · **NEVERIFICABIL**.

## A. Baza salarizării

| Regulă (cod) | Verdict | Sursă | Exemplu / observații |
|---|---|---|---|
| Salariul de bază = coef × valoarea de referință, rotunjit din leu în leu în favoarea salariatului (`aplicaGradatie`, `Math.ceil`) | CORECT | Proiect art. 10 alin. (4) — [20 aug., pdf](../public/sources/Proiect-lege-20-august-2026.pdf); identic 25 mai / 16 iul. | 2,00 × 4.000 = 8.000 lei. Rotunjirea se face o singură dată, după gradații (legea nu spune dacă și pe fiecare treaptă — diferență de max. 1 leu). |
| Valoarea de referință: 4.100 (25 mai, art. 35 alin. 2), 4.100 (17 iul., art. 36 alin. 2), 4.000 (20 aug., art. 38 alin. 3) — `data/variants/index.json` | CORECT | Textele proiectului (copii locale) | — |
| Coeficienți, eșantion 3+/anexă, varianta 20 aug. vs xlsx oficial | CORECT | [Proiect-COEFICIENTI-1-8-20-august-2026.xlsx](../public/sources/Proiect-COEFICIENTI-1-8-20-august-2026.xlsx) | I: Rector Grad I/II 5,30/6,00; profesor grad didactic I >25 ani 2,42, grad II 2,22; profesor universitar 4,00. II: medic primar 4,00; farmacist primar 2,90; infirmieră 1,39. VI: colonel comandă 3,02–3,60; soldat 1,17; plutonier adjutant șef 1,6669. VIII: secretar general 5,40/6,00; referent de specialitate SSD 1,8326; consilier superior 4 = 2,3026. Plus III, IV, V, VII, IX (Președintele 6,4702 în primul an eșalonat). Unele valori sunt rotunjite la 6 zecimale în JSON (ex. 2,1497905 → 2,149791): efect < 0,01 lei. `npm run verify:variants` trece (ancore pe toate cele trei variante). |
| **Garanția salariului minim**: salariul de bază/solda de funcție sub salariul minim → se plătește salariul minim | **GREȘIT → reparat** (regula lipsea) | Proiect art. 10 alin. (8) și art. 7 lit. z) (toate variantele); [HG 146/2026](https://www.avocatnet.ro/articol_70565/Oficial-Salariul-minim-brut-pe-%C8%9Bar%C4%83-se-majoreaz%C4%83-de-la-1-iulie-la-4325-de-lei.html) | 24 de funcții în varianta 20 aug. au coef × 4.000 < 4.325 (minim 0,989335 → 3.958 lei): acum +367 lei completare, brut 4.325. Folosim salariul minim de azi; cel din 2027 nu e stabilit. Sporurile rămân calculate la salariul din grilă (proiectul nu precizează). |
| Anexa V (justiție) — gradația inclusă în indemnizația de încadrare; Anexa IX — indemnizație lunară fără gradații; conducere — gradația maximă inclusă | CORECT | Proiect art. 7 lit. p), art. 10 alin. (6), art. 11, art. 13 alin. (1) | Wizard și Expert sar gradațiile pentru V, IX și conducere. |
| Anexa VI: solda lunară = soldă de funcție + soldă de grad; solda de grad = coef cap. I.2 × VR, fără gradații | CORECT | Anexa VI cap. II art. 2 alin. (2), art. 4 alin. (3), art. 6 alin. (4) — [docx 20 mai](../public/sources/Anexa-VI-reglementari-speciale-20-mai-2026.docx) | Colonel (20 aug.): 0,75 × 4.000 = 3.000 lei. |

## B. Gradații

| Regulă | Verdict | Sursă | Exemplu |
|---|---|---|---|
| Civil: 6 gradații — 0 (<3 ani), +7,5% (3–5), +5% (5–10), +5% (10–15), +2,5% (15–20), +2,5% (>20), aplicate succesiv; coeficienții de execuție sunt la gradația 0 | CORECT | Proiect art. 13 alin. (2), (3), (5) (identic în toate variantele) | 8.000 × 1,075 × 1,05 × 1,05 = 9.481,5 → 9.482 lei (10 ani). |
| Militari/polițiști/polițiști de penitenciare: exceptați de la art. 13; 7 gradații de +3% la 3/6/9/12/15/18/21 ani, doar pe solda de funcție | CORECT în Wizard; **GREȘIT → reparat** în Expert (`Calculator.tsx`) și MCP (`tools.ts`), care foloseau tabelul civil | Proiect art. 13 alin. (1); Anexa VI cap. II art. 4 alin. (1)–(3) | Colonel 3,02 × 4.000, 4 ani: 12.986 (civil) → 12.443 lei; 22 de ani: 15.042 → 14.857 lei. |
| Vechimea pentru gradațiile militare = timpul servit ca militar/polițist | NEVERIFICABIL în calculator | Anexa VI art. 4 alin. (1), (4)–(7) | Utilizatorul introduce anii; regimurile speciale (rechemați, alin. 4) nu sunt modelate. |

## C. Sporuri (proiect, varianta 20 aug.; aceleași procente în 25 mai / 17 iul.)

| Spor (id) | Verdict | Sursă | Observații |
|---|---|---|---|
| Control financiar preventiv 10% (`control-fin`, `cfp-aparare`) | CORECT | art. 14; Anexa VI art. 7 (majorare 10%) | În plafon. |
| Proiecte fonduri europene până la 40% (`fonduri-eu`) | CORECT (procent); plafon parțial | art. 15 alin. (1), (17), (18) | Exceptat de plafon doar partea decontată din fonduri externe; cofinanțarea intră în plafon. Plafonul e doar avertisment — fără efect pe brut. |
| Gestionare fonduri / organisme intermediare până la 40% (`gestionare-fonduri-externe`) | CORECT | art. 16 alin. (1), (7) | Exceptat. |
| Muncă de noapte 25%, doar pe orele 22–06 (`noapte`) | CORECT | art. 17 | 6.600 / 165 h × 20 h × 25% = 200 lei. Condiția „minimum 3 ore de noapte” nu e verificată. |
| Ore suplimentare 75% / 100% (`ore-supl-75`, `ore-supl-100`) | CORECT (procent); NEVERIFICABIL (plata orei) | art. 18 alin. (2), (3), (7) | Codul calculează doar sporul (75%/100% × tarif orar × ore). Proiectul nu spune explicit dacă ora suplimentară se plătește și ea (175%) — nu am schimbat. |
| Handicap grav/accentuat 15% din valoarea de referință (`handicap`) | CORECT | art. 19 alin. (1), (2) | 600 lei la VR 4.000, în afara plafonului. |
| Premiul de performanță 10–20% (`premiu-performanta`) | CORECT | art. 22 alin. (9), (10) | Exceptat de plafon. |
| **Plafonul de 20%** din suma salariilor de bază pe ordonator (`plafon20`) | Aplicare corectă (avertisment, nu tăiere); **GREȘIT → reparat**: baza nu includea solda de grad; textul Expert spunea că sporurile „au fost capate” | art. 21 alin. (2) (17 iul., 20 aug.; în 25 mai fără solde de grad) | 10.000 + 3.000 soldă de grad: prag 2.600 lei (nu 2.000). Fără efect pe brut/net. |
| `sporuriValoare` mereu 0 | CORECT (nu e bug) | — | Sporurile „% din VR” sunt însumate în `sporuriProcent`/`sporuriExceptate` după `inclusInPlafon20`; nicio sumă nu se pierde. Documentat în cod. |
| Anexa II: 3 ture 10%, weekend +10% tarif orar, gărzi 100% tarif orar, gardă la domiciliu 15%, art. 7 lit. a–e (15/40/20/50/5%, radiații 2,5–10%), izolare 15% | CORECT (procente) | Anexa II cap. II — [docx 20 mai](../public/sources/ANEXA-II-Cap-II-REGLEMENTARI-specifice-varianta-20-mai-2026.docx) | Varianta 20 aug. schimbă sănătatea (6 categorii de unități + factori pe grupe prin HG) — NEVERIFICABIL, deja marcat ca nemodelat. |
| Anexa VI: muniții/explozivi până la 50% VR (exceptat), condiții periculoase până la 15% VR (în plafon), izolare până la 15% VR (exceptat) | CORECT | Anexa VI art. 7 alin. (1), (2), (5), (11) | — |
| Anexa VI: prima de clasificare 8–30%, aeronautic nenavigant 5–19%, specializare 8–22%, ambarcare 15% + 15%, scafandri 5–30%, manevre 50% | CORECT (procente, din solda de funcție) | Anexa VI art. 10, 15, 16, 21, 22, 24 | — |
| Anexa VI: prima orară de zbor, parașutare, rapel, scufundare, salt din elicopter | **GREȘIT (nereparat)** — baza de calcul | Anexa VI art. 11, 12, 20, 23, 24 alin. (2) | Legea le raportează la solda **comandantului** (escadrilă, batalion, unitate, divizion) sau la 1/3 din ea și per oră/salt; codul folosește solda proprie. Denumirile o spun, dar suma e aproximativă. Reparația cere un câmp nou (baza) în UI — vezi „Rămas”. |
| Compensație personal civil 1/3 VR, retenție pensie militară, indemnizații de studiu/comandă/curs | NEVERIFICABIL | — | Nu am găsit articolul corespunzător în textele locale ale proiectului. |
| Anexele I, III, V, VII, VIII — sporurile specifice (izolare, învățământ special, practică pedagogică, predare simultană 5/7/10/15%, conducător doctorat 1%/doctorand max. 10%, majorări auxiliari justiție 5/7,5/10%, radiații vamă, Delta Dunării) | CORECT (procente) | Reglementările specifice din 20 mai (docx/doc în `public/sources/`) | Verificate pe text; bazele sunt salariul de bază propriu. |
| Anexa V: indemnizația de membru CSM 25% / 50% (`membru-csm-ales`, `membru-csm-drept`) | **GREȘIT (nereparat)** — baza de calcul | Anexa V art. 10 alin. (3)–(4) | Procentul e din indemnizația brută lunară maximă a judecătorului ÎCCJ, nu din indemnizația proprie; necesită același câmp de bază proprie. |
| Spor doctorat 15%, indemnizație de permanență (sănătate) | NEVERIFICABIL | — | Nu apar în proiect; marcate deja în UI ca „status incert”. Varianta 20 aug. dă 500 lei pentru titlul de doctor (art. 39) — nemodelat. |

## D. Contribuții și impozit (Codul fiscal, forma din 08.08.2026)

| Regulă | Verdict | Sursă | Exemplu |
|---|---|---|---|
| CAS 25% din brut | CORECT | [Cod fiscal](https://legislatie.just.ro/Public/DetaliiDocument/171282) art. 138 lit. a), art. 139 alin. (1) | 4.325 → 1.081 lei. |
| Militari/polițiști: contribuția individuală la bugetul de stat 25% (în loc de CAS) | CORECT (aceeași cotă) | Legea 223/2015 art. 31 ([lege5](https://lege5.ro/gratuit/g4ztmmzqgi/legea-nr-223-2015-privind-pensiile-militare-de-stat)); Cod fiscal art. 78 alin. (2) lit. a) | Colonel: 17.857 → 4.464 lei. |
| CASS 10% din brut | CORECT | Cod fiscal art. 156, 157 alin. (1) | 4.325 → 433 lei. |
| Impozit 10% pe (brut − contribuții − deducere personală) | CORECT | Cod fiscal art. 78 alin. (2) lit. a) | (4.325 − 1.081 − 433 − 865) × 10% = 194,6 → 195 lei. |
| Rotunjiri: CAS/CASS pe brutul nerotunjit, brutul afișat rotunjit | **GREȘIT → reparat** (inconsecvență) | — (Codul fiscal nu are o regulă explicită; fiecare sumă se rotunjește la leu) | Toate sumele pleacă acum de la același brut întreg: brut − CAS − CASS − impozit = net exact (înainte ±1 leu). Regula de rotunjire în sine: NEVERIFICABIL. |
| Scutire de impozit — handicap grav/accentuat | CORECT | Cod fiscal art. 60 pct. 1 lit. b) | CAS și CASS rămân datorate. |
| Scutire IT | **GREȘIT → reparat** (text) | Cod fiscal art. 60 pct. 2 abrogat de la 01.01.2025 (OUG 156/2024, art. LXIV pct. 7) | Scos din textul Wizardului. Cercetarea-dezvoltarea (pct. 3) rămâne, doar pentru salariul din proiect. |
| Construcții / agricultură / IT — facilități | Nu se aplică bugetarilor și au fost abrogate de la 01.01.2025 | OUG 156/2024 | Codul nu le modelează — corect. |
| Suma netaxabilă la salariul minim (300 lei ian.–iun. 2026; 200 lei iul.–dec. 2026, brut ≤ 4.600 lei) | NEVERIFICABIL pentru perioada modelată; nemodelat | OUG 89/2025 — [precizări ANAF](https://static.anaf.ro/static/3/Galati/20260123122801_suma%20neimpozabila%20in%202026.pdf); se aplică și raporturilor de serviciu | Se aplică doar dacă salariul de bază din contract = salariul minim și doar până la 31.12.2026; calculatorul modelează salariul din dec. 2026/2027, când măsura expiră sau nu e cunoscută. |

## E. Deducerea personală (Cod fiscal art. 77, forma OG 16/2022, în vigoare din 01.01.2023)

| Regulă | Verdict | Sursă | Exemplu |
|---|---|---|---|
| Deducere de bază: 510 lei + 160 lei/persoană, scăzută pe trepte de 100 lei | **GREȘIT → reparat** | art. 77 alin. (3)–(4) | Formula corectă: 20/25/30/35/45% din salariul minim (0/1/2/3/4+ persoane) pentru brut ≤ minim; −0,5 pp pe fiecare tranșă de 50 lei peste minim; 0 peste minim + 2.000 lei. Brut 4.325, 0 persoane: 865 lei (înainte 459) → impozit 235 → 195, **net +40 lei**. Brut 4.325, 2 persoane: 1.297,5 lei. Brut 6.000, 1 persoană: 8% × 4.325 = 346 lei. |
| Salariul minim folosit în formulă: 4.050 lei | **GREȘIT → reparat** | HG 146/2026: 4.325 lei de la 01.07.2026 | — |
| Deducere suplimentară: 15% din salariul minim pentru cei sub 26 de ani (brut ≤ minim + 2.000) | **Lipsea → adăugat** (câmp în Wizard, parametru MCP `sub26Ani`) | art. 77 alin. (10) lit. a) | 648,75 lei. |
| Deducere suplimentară: 100 lei/copil înscris în învățământ, indiferent de venit | **Lipsea → adăugat** (câmp în Wizard, parametru MCP `copiiInvatamant`) | art. 77 alin. (10) lit. b), (12) | Brut 12.000, 2 copii: impozit 780 → 760 lei. |
| Deducerea se acordă în limita venitului impozabil | Adăugat | art. 77 alin. (2) | — |
| Rotunjirea deducerii | NEVERIFICABIL | Legea nu prevede | Păstrată la bani (ex. 1.297,50). |

## F. Alte calcule

| Calcul | Verdict | Observații |
|---|---|---|
| Tarif orar = salariu de bază / ore normă introduse de utilizator | CORECT | Fără valoare implicită; utilizatorul pune orele lunii. |
| Diferența salarială tranzitorie (Wizard/Expert) = max(0, salariul actual − brutul nou) | CORECT ca principiu | Proiect art. 33 (17 iul./20 aug.) / art. 32 (25 mai); excluderile (fonduri UE, stimulente) sunt cerute separat în Wizard. |
| Anexa VI art. 3 alin. (5): +max. 0,40 la coeficient | CORECT | Aplicat în Wizard pe solda de funcție, înainte de gradații. |
| Sume one-off (mutare, instalare, campanie) scoase din lunar | CORECT | Raportate separat. |
| `inputSchema` gol la `tools/list` (MCP) | Problemă existentă, nu de calcul | `zod-to-json-schema` v3 nu citește schemele zod v4 → clienții nu văd parametrii. Neschimbat (vezi „Rămas”). |

## Comparație MCP `calculate_salary` înainte / după (varianta 20 aug., fără alți parametri)

| Apel | Înainte (producție) | După | De ce |
|---|---|---|---|
| coef 1,00, 0 ani | brut 4.000, impozit 209, net 2.391 | brut 4.325, impozit 195, net 2.616 | garanția salariului minim (+325) + deducerea corectă (865) |
| coef 1,39, 4 ani | brut 5.977, impozit 386, net 3.499 | brut 5.977, impozit 376, net 3.509 | deducerea: 3% × 4.325 = 129,75 lei (înainte 26) |
| coef 2,42, 12 ani | net 6.712 | net 6.712 | peste minim + 2.000: neschimbat |
| coef 3,02, 22 ani, soldaGradCoef 0,75 | brut 18.042, net 10.554 (gradația civilă 5) | brut 17.857, net 10.446 (7 gradații de 3%) | regimul Anexei VI |

## Rămas (nereparat)

1. Primele din Anexa VI raportate la solda comandantului (zbor, parașutare, rapel, scufundare, salt) și
   indemnizația de membru CSM (Anexa V, din indemnizația maximă ÎCCJ) —
   necesită un câmp de bază proprie în UI (mecanismul `inputKind: "bazaProprie"` există în `lib/tax.ts`,
   dar nu are încă interfață).
2. `inputSchema` din `tools/list` e `{}` (zod v4 + zod-to-json-schema v3); soluția: `z.toJSONSchema()`.
3. Plata orelor suplimentare (doar spor sau oră + spor) — de clarificat la adoptarea legii.
4. Salariul minim și regulile fiscale din 2027 — de actualizat când apar.
