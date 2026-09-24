# BLOG-AUTOPILOT: ghidurile de pe salarii.romaniatransparenta.eu

Instrucțiuni pentru agentul care publică singur, fără om, un ghid nou pe
https://salarii.romaniatransparenta.eu/ghiduri. Rulează de două ori pe săptămână. Un articol pe rulare.
Dacă ceva nu e sigur: NU publici și scrii motivul pe ultima linie a răspunsului.

## 0. Regulile de bază

- **Fiecare cifră se calculează din date, nu se scrie de mână.** Articolul e un fișier TypeScript care
  citește coeficienții variantelor și calculează salariile cu funcțiile calculatorului (secțiunea 2).
  Când apare o variantă nouă a proiectului, articolul se actualizează singur.
- **Proiectul NU e lege.** Fiecare articol spune clar că legea nu a fost adoptată (textul din
  `components/BannerNeadoptat.tsx`, care e stabilit cu proprietarul: nu-l reformula cu alte fapte) și
  precizează varianta (25 mai / 17 iulie / 20 august 2026). Nu scrie „de la 1 decembrie vei primi…”.
- **Legislația se citează cu actul și articolul**, doar dacă articolul apare în sursele permise
  (`data/variants/index.json`, `docs/verificare-calcule-2026-09-24.md`, comentariile `sursa:` din
  `lib/tax.ts`) sau l-ai verificat în această rulare în textul oficial din `public/sources/`.
  Numerotarea articolelor diferă între variante: citează articolul variantei despre care scrii
  (câmpurile `articolValoareReferinta`, `articolIntrareInVigoare`, `articolDiferentaTranzitorie`).
- **Sănătatea în varianta din 20 august:** coeficienții sunt pentru unitățile de categoria a II-a; cele 6
  categorii și factorii pe grupe se stabilesc prin HG și NU pot fi calculați. Orice articol despre
  personalul medical spune asta.
- **Fără date personale.** Fără nume de persoane (nici sindicaliști, nici miniștri), fără exemple cu
  oameni reali. Funcțiile se descriu generic.
- **Română corectă, cu diacritice (ș, ț cu virgulă)**, ghilimele „…”, acordul „de” după numerale
  (20 de funcții, 19 funcții: helperul `de()` din `lib/seo.ts`).
- **Nu atingi** nimic în afara fișierelor din secțiunea 3. Nu omori procese după nume (`pkill`,
  `killall`): doar PID-ul pe care l-ai pornit tu. Serverul de test pe un port liber din 4100–4199.

## 1. Unde stau articolele și cum arată

- Articolele: `lib/ghiduri/<slug>.ts`, fiecare exportă `export function ghid(): Ghid`.
- Tipul `Ghid` și formatul textului (mini-markdown): `lib/ghiduri/tip.ts` (citește-l întreg).
- Lista: `lib/ghiduri/index.ts`, tabloul `FABRICI` (un import + o linie). Tot acolo, validarea: răspuns
  35–70 de cuvinte, descriere 100–175 de caractere, titlu meta ≤ 70, 3–6 puncte „pe scurt”, ≥ 3
  întrebări, surse cu URL, legături interne doar spre pagini care există (`/`, `/grila`,
  `/grila/<slug>`, `/ghiduri`, `/ghiduri/<slug>`, `/diplomatie`, `/mcp`), fără `NaN`/`undefined`/`null`.
- Automat, din listă: `/ghiduri/<slug>` (static, cu BlogPosting + FAQPage + BreadcrumbList),
  `/ghiduri` (index), `/ghiduri/feed.xml` (RSS), `/sitemap.xml` (lastmod = `actualizat`), `/llms.txt`.
  Randarea: `app/ghiduri/[slug]/page.tsx`, `components/ghiduri/ArticleBody.tsx`. Nu le modifici.
- Modele complete: `lib/ghiduri/salariu-asistent-medical.ts` (o funcție, pe trepte și variante, potrivire
  pe codul funcției) și `lib/ghiduri/cum-se-calculeaza-salariul-de-baza.ts` (explicator, brut → net).

Exemplu minim (scurtat; un articol real are 900–1.400 de cuvinte):

```ts
import { VARIANTA_IMPLICITA, getVarianta } from "../variants";
import { getFunctii } from "../variants-data";
import { aplicaGradatie, calcBrut } from "../tax";
import type { Ghid } from "./tip";

const lei = (n: number) => n.toLocaleString("ro-RO");

export function ghid(): Ghid {
  const v = getVarianta(VARIANTA_IMPLICITA);
  const r = getFunctii(v.id).filter((e) => e.anexa === "I" && /^Profesor/i.test(e.functie) && e.coeficient > 0);
  if (r.length === 0) throw new Error("fără rânduri de profesor");      // mai bine cade build-ul decât un articol gol
  const baza = (c: number, g = 0) => aplicaGradatie(c * v.valoareReferinta, g);
  const net = (b: number) => calcBrut({ salariuBaza: b, sporuri: [], valoareReferinta: v.valoareReferinta }).salariuNet;
  return {
    slug: "salariu-profesor-noua-lege",
    categorie: "Ghid",
    titlu: "Cât ar câștiga un profesor pe noua lege a salarizării",
    titluMeta: "Salariu profesor 2026 pe noua lege a salarizării",
    descriere: `...100–175 de caractere, cu intervalul de salarii calculat...`,
    cuvantCheie: "salariu profesor noua lege",
    raspuns: `În varianta din ${v.eticheta} ... ${lei(baza(r[0]!.coeficient))} lei brut ... Proiectul nu a fost adoptat.`,
    peScurt: ["...", "...", "..."],
    publicat: "2026-10-02",
    actualizat: "2026-10-02",
    corp: `## Cât ar fi salariul unui profesor pe noua lege?
Prima propoziție răspunde, cu cifra. Apoi explicația.

| Funcția | Studii | Salariu de bază (lei) | Net (lei) |
${r.slice(0, 10).map((e) => `| ${e.functie} | ${e.studii} | ${lei(baza(e.coeficient))} | ${lei(net(baza(e.coeficient)))} |`).join("\n")}

> Atenție: legea nu a fost adoptată. ...`,
    faq: [{ q: "...?", a: "..." }, { q: "...?", a: "..." }, { q: "...?", a: "..." }],
    surse: v.surse.map((s) => ({ titlu: s.titlu, url: s.url.startsWith("/") ? `https://salarii.romaniatransparenta.eu${s.url}` : s.url })),
    legaturi: [["/grila/invatamant-cercetare", "Grila completă a învățământului (Anexa I)"], ["/", "Calculatorul"]],
  };
}
```

Structura cerută: `raspuns` de 40–60 de cuvinte cu cifra principală și „proiectul nu a fost adoptat”;
5–8 secțiuni `## Întrebare?` cu răspunsul în prima propoziție; cel puțin un tabel calculat; o secțiune
despre gradații (sau excepția: Anexa V, IX, conducere, Anexa VI cu gradațiile ei și solda de grad);
comparația între variante când rândurile se potrivesc pe `cod` (ca în modelul asistentului); la final
caseta „> Atenție: legea nu a fost adoptată…”. Legături: grila anexei + calculatorul (+ alt ghid dacă e
relevant). `publicat` = `actualizat` = data de azi. Slug fără diacritice.

**Capcane de date** (din `data/variants/index.json` → `note` și memoria proiectului):
- Denumirea funcției diferă între variante (în aug. treapta „principal/debutant” e în câmpul `grad`,
  înainte în `functie`); potrivește între variante pe `cod`, nu pe denumire. Unele rânduri n-au `cod`.
- Vechimea în funcție/specialitate (coloana `vechime`) alege rândul; vechimea în muncă dă gradațiile.
- Anexa VI: solda de grad (cap. I.2) e în `v.soldeGrad`, nu în rândurile de funcții; gradațiile
  militare sunt `GRADATII_APARARE` (`gradatiiForAnexa("VI")`).
- Anexa IX: coeficienți eșalonați (`coeficientEsalonat`), 2027–2031; spune ce an arăți.
- Anexa III cap. V lipsește din xlsx-ul din august; titlul de doctor (500 lei) și premiul de performanță
  nu sunt modelate în calculator: le poți menționa doar ca text din `note`.
- Salariul de bază sub salariul minim (`SAL_MIN_BRUT`) → se plătește salariul minim (art. 10 alin. (8)).

## 2. SURSE DE FAPTE PERMISE

| Sursă | Ce iei de acolo |
|---|---|
| `lib/variants.ts` (`VARIANTE`, `getVarianta`, `ANEXE`) + `data/variants/index.json` | variantele: dată, valoarea de referință și articolul ei, intrarea în vigoare, diferența tranzitorie, sursele oficiale (`surse`), notele verificate (`note`) |
| `lib/variants-data.ts` (`getFunctii(id)`) | coeficienții pe funcție, studii, grad, vechime, anexă, capitol, cod |
| `lib/tax.ts` | `aplicaGradatie`, `GRADATII`, `GRADATII_APARARE`, `calcBrut` (brut → net), `SAL_MIN_BRUT`, sporurile (`SPORURI_STANDARD`: denumire, procent, dacă intră în plafon, articolul din `descriere`) |
| `lib/seo.ts` | `GRILE` (slug-urile grilelor), `salariuBaza`, `intervalAnexa`, `de()` |
| `docs/verificare-calcule-2026-09-24.md` | articolele de lege verificate pentru fiecare regulă de calcul și fiscală |
| `components/BannerNeadoptat.tsx` | statusul legii (26 august 2026), singura formulare permisă |
| `public/sources/*` | textele oficiale (docx/pdf/xlsx) ale proiectului, pentru verificarea unui articol de lege |

Surse externe care pot fi citate cu legătură: legislatie.just.ro (Codul fiscal: DetaliiDocument/171282;
alte acte, după ce verifici pagina), mmuncii.gov.ro, publisind.ro și solidaritatea-sanitara.ro (doar
pentru textele variantelor, cum sunt deja în `index.json`), spitale.romaniatransparenta.eu/salarii
(legătură, fără cifre preluate).

**INTERZIS de inventat sau de adăugat din memorie:** salarii actuale pe legea 153/2017, salariul minim
din 2027, date sau declarații despre negocieri după 26 august 2026, „legea va fi adoptată la…”,
procente de creștere față de salariul actual, sporuri care nu sunt în `SPORURI_STANDARD`, cuantumuri
din HG-uri neadoptate (categoriile de spitale), nume de persoane, sindicate sau partide, citate, cifre
din presă. Dacă o întrebare cere asta, articolul spune că nu se poate calcula și de ce.

## 3. Ce fișiere atingi

1. `lib/ghiduri/<slug>.ts` (nou)
2. `lib/ghiduri/index.ts` (import + linie în `FABRICI`)
3. `BLOG-AUTOPILOT.md` (doar tabelul „Publicate”)

Nimic altceva. Dacă ar trebui schimbat altceva (o componentă, calculatorul), nu publici și scrii de ce.

## 4. Lista de subiecte

Alege primul subiect nepublicat pentru care găsești rândurile în date (verifică întâi cu un filtru pe
`getFunctii`). Nu canibaliza: paginile `/grila/<anexă>` răspund la „grila de salarizare X”; ghidul
răspunde la „cât ar câștiga <o funcție>” sau la „cum funcționează <o regulă>” și trimite spre grilă.

| # | Subiect (titlu de lucru) | Cuvânt-cheie țintă | Intenție | Pagina de bani |
|---|---|---|---|---|
| 1 | Cât ar câștiga un profesor (debutant, definitiv, gradul II, gradul I) | salariu profesor noua lege | informațional | /grila/invatamant-cercetare |
| 2 | Salariul profesorului debutant pe noua lege | salariu profesor debutant 2026 | informațional | /grila/invatamant-cercetare |
| 3 | Cât ar câștiga un educator / educatoare | salariu educatoare noua lege | informațional | /grila/invatamant-cercetare |
| 4 | Salariul cadrelor didactice universitare (asistent, lector, conferențiar, profesor) | salariu lector universitar | informațional | /grila/invatamant-cercetare |
| 5 | Cercetătorii: CS I, CS II, CS III | salariu cercetator stiintific | informațional | /grila/invatamant-cercetare |
| 6 | Cât ar câștiga un medic rezident, pe ani de rezidențiat | salariu medic rezident noua lege | informațional | /grila/sanatate-asistenta-sociala |
| 7 | Medic specialist și medic primar pe noua lege | salariu medic primar | informațional | /grila/sanatate-asistenta-sociala |
| 8 | Infirmiere, îngrijitoare, brancardieri | salariu infirmiera noua lege | informațional | /grila/sanatate-asistenta-sociala |
| 9 | Asistentul social | salariu asistent social | informațional | /grila/sanatate-asistenta-sociala |
| 10 | Categoriile de spitale din varianta din 20 august: ce se știe și ce nu | categorii unitati sanitare salarizare | informațional | /grila/sanatate-asistenta-sociala |
| 11 | Cât ar câștiga un polițist (agent, ofițer) | salariu politist noua lege | informațional | /grila/aparare-ordine-publica |
| 12 | Solda de grad: tabelul pe grade și cum se adaugă la soldă | solda de grad 2026 | informațional | /grila/aparare-ordine-publica |
| 13 | Salariul militarilor: soldat, subofițer, ofițer | salariu militar noua lege | informațional | /grila/aparare-ordine-publica |
| 14 | Agenții și ofițerii de penitenciare | salariu agent penitenciar | informațional | /grila/aparare-ordine-publica |
| 15 | Gradațiile militarilor și polițiștilor (+3% la 3 ani) | gradatii militari | informațional | /grila/aparare-ordine-publica |
| 16 | Funcționarul din primărie: salariul pe treptele de populație | salariu functionar primarie | informațional | /grila/administratie |
| 17 | Inspector, consilier, referent: funcționarii publici de execuție | salariu consilier functionar public | informațional | /grila/administratie |
| 18 | Personalul contractual din administrație (șofer, îngrijitor, muncitor) | salariu personal contractual primarie | informațional | /grila/administratie |
| 19 | Indemnizația primarului, pe mărimea localității | indemnizatie primar noua lege | informațional | /grila/demnitate-publica |
| 20 | Indemnizațiile demnitarilor: miniștri, parlamentari (eșalonarea 2027–2031) | indemnizatie parlamentar | informațional | /grila/demnitate-publica |
| 21 | Grefierii | salariu grefier noua lege | informațional | /grila/justitie |
| 22 | Judecătorii și procurorii: indemnizația de încadrare | salariu judecator noua lege | informațional | /grila/justitie |
| 23 | Bibliotecari, muzeografi, personalul din teatre | salariu bibliotecar | informațional | /grila/cultura |
| 24 | Diplomații: salariul în țară și la post | salariu diplomat | informațional | /diplomatie |
| 25 | Diferența salarială tranzitorie: ce e și cine o primește | diferenta salariala tranzitorie | informațional | / |
| 26 | Plafonul de 20% al sporurilor, pe ordonator | plafon sporuri 20% | informațional | / |
| 27 | Sporul de noapte și orele suplimentare pe noua lege | spor de noapte bugetari | informațional | / |
| 28 | Gradul profesional vs gradația: de ce sunt lucruri diferite | gradatie vs grad profesional | informațional | / |
| 29 | Ce s-a schimbat între cele trei variante ale proiectului (pe anexe, calculat) | variante lege salarizare | informațional | / |
| 30 | Salariul minim garantat în plată: funcțiile sub 4.325 lei | salariu minim bugetari | informațional | / |
| 31 | Cât e net un salariu de bugetar: de la brut la net, cu deduceri | salariu net bugetar calcul | tranzacțional | / |
| 32 | Directorii de școală și funcțiile de conducere din învățământ | salariu director scoala | informațional | /grila/invatamant-cercetare |
| 33 | Personalul didactic auxiliar (secretar, bibliotecar școlar, laborant) | salariu didactic auxiliar | informațional | /grila/invatamant-cercetare |
| 34 | Pompierii (ISU) | salariu pompier noua lege | informațional | /grila/aparare-ordine-publica |

Poți adăuga subiecte noi la finalul listei (cu cuvânt-cheie, intenție, pagină de bani), doar dacă au
date în secțiunea 2 și nu se suprapun cu un ghid publicat.

## 5. Verificarea (obligatorie)

Lucrezi într-un worktree nou, niciodată în `/root/salarizare-bugetari` direct:

```bash
set -euo pipefail
cd /root/salarizare-bugetari
git fetch -q origin
AZI=$(date +%F)
WT=/root/salarizare-wt/ghid-$AZI
git worktree add -b ghid-$AZI "$WT" origin/master
ln -s /root/salarizare-bugetari/node_modules "$WT/node_modules"
cd "$WT"
# ... scrii articolul ...
set -o pipefail
npx tsc --noEmit -p tsconfig.json
npm run lint                                   # avertismentele vechi sunt acceptate; erorile nu
npm test
npm run verify:variants
flock /tmp/seo-build.lock npm run build        # next build: build-urile grele NUMAI sub flock
grep -q "/ghiduri/<slug>" .next/prerender-manifest.json
```

Test local al paginii (port liber 4100–4199, oprit la final după PID):

```bash
cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/
(cd .next/standalone && PORT=4159 HOSTNAME=127.0.0.1 node server.js > /tmp/sal-ghid.log 2>&1 & echo $! > /tmp/sal-ghid.pid)
sleep 4
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:4159/ghiduri/<slug>                  # 200
curl -s http://127.0.0.1:4159/sitemap.xml | grep -c "ghiduri/<slug>"                            # 1
curl -s http://127.0.0.1:4159/ghiduri/<slug> | sed 's/<[^>]*>/ /g' | tr -s ' ' | head -c 6000   # citește textul
kill "$(cat /tmp/sal-ghid.pid)"
```

Citește textul randat și verifică: cifrele au sens (nu 0, nu salarii sub 1.000 de lei sau peste 100.000
fără motiv), acordul „de”, nicio comparație contrazisă de tabel, diacritice, mențiunea „proiectul nu a
fost adoptat”. Dacă `package-lock.json` din origin/master are dependențe noi față de
`/root/salarizare-bugetari/node_modules` și build-ul pică la import, NU rula `npm install` în repo-ul
principal: oprește-te și raportează.

## 6. Publicarea

```bash
cd "$WT"
git add lib/ghiduri/<slug>.ts lib/ghiduri/index.ts BLOG-AUTOPILOT.md
git status --short          # doar cele 3 fișiere
git commit -m "Ghiduri: <titlul articolului>

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git fetch -q origin
git rebase origin/master    # dacă a avansat: reia tsc + build
git push origin HEAD:master || git -c credential.helper= -c credential.helper='!gh auth git-credential' push https://github.com/Jamaalx/salarizare-bugetari.git HEAD:master
```

Push-ul pe `master` pornește singur deploy-ul Coolify (app 16, uuid `t12zhypplu3blercoor81t1k`).
Starea:

```bash
docker exec coolify-db psql -U coolify -d coolify -tAc \
  "select status, left(commit,7), created_at from application_deployment_queues where application_id='16' order by id desc limit 3"
```

Dacă în 3 minute nu apare rândul cu commit-ul tău, deploy manual:

```bash
docker exec coolify php artisan tinker --execute='
$app = \App\Models\Application::where("uuid", "t12zhypplu3blercoor81t1k")->first();
$u = \Illuminate\Support\Str::random(7) . (string) now()->format("Hisu");
queue_application_deployment(application: $app, deployment_uuid: $u, force_rebuild: false, commit: "HEAD", is_api: true);
echo $u;'
```

**Verificarea live**, după `finished`:

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://salarii.romaniatransparenta.eu/ghiduri/<slug>        # 200
curl -s https://salarii.romaniatransparenta.eu/sitemap.xml | grep -c "ghiduri/<slug>"                  # 1
curl -s https://salarii.romaniatransparenta.eu/ghiduri | grep -c "ghiduri/<slug>"                      # ≥ 1
curl -s https://salarii.romaniatransparenta.eu/ghiduri/<slug> | grep -c '"@type":"BlogPosting"'        # 1
```

La final: `cd /root/salarizare-bugetari && git worktree remove --force "$WT" && git branch -D ghid-$AZI`
(`--force` pentru că build-ul lasă `.next/`, care e ignorat de git).

## 7. Dacă ceva pică

- tsc, lint (erori), teste, build sau validarea `ghiduri()` pică și nu poți repara **doar în fișierele
  tale** → NU faci commit. `git worktree remove --force "$WT"` și `git branch -D ghid-$AZI`. Ultima linie:
  `NEPUBLICAT: <motivul>`.
- Push respins: `git fetch`, `git rebase origin/master` (conflict în `lib/ghiduri/index.ts`: păstrezi
  ambele linii din `FABRICI`), reiei verificarea, push. Alt conflict → nu publici.
- Deploy `failed`: citești `logs` din `application_deployment_queues` pentru rândul tău. Dacă eroarea
  e din articolul tău: `git revert` pe commit-ul tău, push, motivul pe ultima linie. Altfel nu atingi nimic.
- Live nu dă 200 la 20 de minute după `finished`: scrii asta, cu codul primit.
- Cel mult 2 încercări de reparație pe rulare.

Ultima linie a răspunsului, mereu: `PUBLICAT: https://salarii.romaniatransparenta.eu/ghiduri/<slug>` sau
`NEPUBLICAT: <motiv>`.

## Publicate

| Data | Slug | Cuvânt-cheie |
|---|---|---|
| 2026-09-24 | salariu-asistent-medical-noua-lege | salariu asistent medical noua lege |
| 2026-09-24 | cum-se-calculeaza-salariul-de-baza | valoarea de referință 4.000 lei |
