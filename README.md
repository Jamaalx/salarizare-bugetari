# Calculator Salariu Bugetari — Proiect Lege MMFTSS 2026

[![CI](https://github.com/Jamaalx/salarizare-bugetari/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/Jamaalx/salarizare-bugetari/actions/workflows/ci.yml)
[![Live](https://img.shields.io/badge/live-salarii.romaniatransparenta.eu-2ea44f)](https://salarii.romaniatransparenta.eu)
[![Licență MIT](https://img.shields.io/badge/licen%C8%9B%C4%83-MIT-blue)](LICENSE)

Webapp interactiv pentru calculul salariului brut/net al personalului plătit din fonduri publice conform **proiectului de lege a salarizării (MMFTSS 2026)** — în toate cele **trei variante oficiale publicate**: 25 mai, 17 iulie și 20 august 2026.

> ⚠️ **Proiectul de lege NU a fost adoptat.** Pe 26 august 2026 partidele au anunțat că nu au ajuns la consens (jalonul PNRR de 770 mil. € a fost pierdut) și s-au angajat să adopte legea până la sfârșitul anului. Instrumentul este neoficial și informativ. Valoarea de referință pentru anii următori urmează a fi stabilită anual prin Hotărâre de Guvern.

## Ce face

- **Trei variante ale proiectului**, selectabile din bara de sus (implicit: 20 august, ultimul text oficial). Fiecare variantă are propriul set de coeficienți, valoarea de referință, grila soldelor de grad și trimiterile la articole:

  | Variantă | Funcții indexate | Valoarea de referință | Intrare în vigoare | Diferența tranzitorie |
  |---|---|---|---|---|
  | I — 25 mai 2026 | 2.614 (2.627 rânduri) | 4.100 lei (2027) — art. 35 alin. (2) | 1 ianuarie 2027 | față de dec. 2026, până la 31 dec. 2031 (art. 32) |
  | II — 17 iulie 2026 | 2.809 | 4.100 lei (dec. 2026 + 2027) — art. 36 alin. (2) | 1 decembrie 2026 | față de nov. 2026 (art. 33) |
  | III — 20 august 2026 | 3.000 | 4.000 lei (dec. 2026 + 2027) — art. 38 alin. (3) | 1 decembrie 2026 | față de nov. 2026, fără limita 2031 (art. 33) |

- Calculează **salariul de bază** (coeficient × valoare de referință + gradații)
- Aplică **gradații de vechime** (0–5) conform art. 13 (identic în toate variantele)
- Tratează corect cazurile speciale (funcții de conducere, Anexa V, Anexa IX, solda de grad pentru Anexa VI)
- Adaugă **sporuri configurabile** (control financiar, fonduri EU, noapte, ore suplimentare, handicap, condiții de muncă și sporurile specifice pe anexe) cu plafon 20%
- Calculează **brut → net** (CAS 25%, CASS 10%, impozit 10%)
- Estimează **diferența salarială tranzitorie** (art. 32 / art. 33, după variantă)
- Expune totul ca **server MCP** (`/api/mcp`) și **chat AI** (`/api/chat`), cu parametrul `varianta`

**Ce NU este modelat** (depinde de acte ulterioare sau nu e un drept lunar): categoriile de unități sanitare și factorii de multiplicare pe grupe din Anexa II cap. II (varianta 20 august — se stabilesc prin HG), indemnizația pentru titlul științific de doctor (500 lei brut/lună, art. 39 în varianta din 20 august), premiul de performanță (art. 22). Anexa III cap. V (case de cultură) lipsește din xlsx-ul din 20 august.

## Surse documentație

- **25 mai 2026** — [MMFTSS: anunțul publicării proiectului](https://mmuncii.gov.ro/ministerul-muncii-familiei-tineretului-si-solidaritatii-sociale-a-publicat-proiectul-legii-salarizarii-pentru-personalul-platit-din-fonduri-publice/); copii locale în `public/sources/` (text, coeficienți, anexe, calendar consultări)
- **17 iulie 2026** — [MMFTSS: Legea salarizării](https://mmuncii.gov.ro/legea-salarizarii/), [xlsx coeficienți 16.07.2026](https://mmuncii.gov.ro/wp-content/uploads/2026/07/Proiect-COEFICIENTI-1-8-MMFTSS-16.07.2026-1000.xlsx); copii locale `public/sources/proiect-coeficienti-16-iulie-2026.xlsx` (oglinda SNPPC a fișierului MMFTSS) și `proiect-lege-salarizare-16-iulie-2026.docx`
- **20 august 2026** — [Publisind: Legea salarizării, varianta III](https://publisind.ro/legea-salarizarii-varianta-iii-20-august-2026/) ([xlsx](https://publisind.ro/wp-content/uploads/2026/08/Proiect-COEFICIENTI-1-8-2008-1.xlsx)), [Solidaritatea Sanitară: varianta 20.08.2026](https://solidaritatea-sanitara.ro/proiectul-legii-salarizarii-varianta-20-08-2026/); copii locale `public/sources/Proiect-COEFICIENTI-1-8-20-august-2026.xlsx` și `Proiect-lege-20-august-2026.pdf`

Metadatele fiecărei variante (valoare de referință, articole, note despre ce s-a schimbat, surse) sunt în `data/variants/index.json`.

## Stack

- Next.js 15.5 (App Router, standalone build)
- React 19
- TypeScript 5.7
- Tailwind CSS 3.4
- SheetJS (`xlsx`, devDependency) pentru importul coeficienților

## Dezvoltare locală

Cerințe: Node.js 22 (vezi `Dockerfile`), npm 10.

```bash
npm install
npm run dev              # http://localhost:3000
npm run lint             # ESLint (preset Next.js)
npm run build            # production build (standalone)
npm run verify:variants  # verifică seturile de coeficienți pe variante (rulat și în CI)
```

Variabile de mediu (toate opționale — calculatorul merge fără ele):

```bash
cp .env.example .env.local   # apoi completează ce ai nevoie
```

| Variabilă | Rol |
|---|---|
| `NVIDIA_API_KEY` | cheie NVIDIA NIM pentru widget-ul de chat AI (`/api/chat`); fără ea, ruta răspunde 503 `NOT_CONFIGURED` |
| `NVIDIA_MODEL` | modelul folosit de chat (implicit `meta/llama-3.3-70b-instruct`) |
| `OAUTH_SIGNING_SECRET` | secretul HMAC pentru token-urile OAuth ale serverului MCP (`/oauth/*`); **obligatoriu în producție** |

Build Docker identic cu cel din producție:

```bash
docker build -t salarizare-bugetari .
docker run --rm -p 3000:3000 --env-file .env.local salarizare-bugetari
```

CI (GitHub Actions, `.github/workflows/ci.yml`) rulează `npm ci`, `npm run lint`, `npm run build`, `npm run verify:variants` și `npm audit --audit-level=high` la fiecare push pe `master` și la fiecare PR.

## Deploy pe Coolify (Hetzner / VPS propriu)

Configurat pentru deploy via Docker pe Coolify, cu DNS la Cloudflare.

1. **Push pe GitHub**:
   ```bash
   git init && git add -A && git commit -m "init"
   gh repo create salarizare-bugetari --public --source=. --push
   ```

2. **În Coolify** (panou Hetzner):
   - New Resource → Public Repository
   - Repo URL: `https://github.com/<user>/salarizare-bugetari`
   - Build pack: **Dockerfile** (auto-detected)
   - Port: 3000
   - Domain: `salarii.romaniatransparenta.eu` (sau alt subdomeniu)

3. **DNS Cloudflare**:
   - CNAME `salarizare` → `<IP-server>` sau `<server>.coolify`
   - SSL: Full (Coolify emite cert via Let's Encrypt sau folosește Cloudflare proxy)

4. Auto-deploy on push: configurat default de Coolify când conectezi GitHub.

## Importul coeficienților dintr-un xlsx nou

Când apare o variantă nouă a proiectului (sau un xlsx corectat), datele se regenerează cu importatorul din depozit — reproductibil, fără pași manuali:

```bash
# 1. Importă xlsx-ul; id-ul variantei = data publicării (ISO)
npm run import:coeficienti -- cale/catre/Proiect-COEFICIENTI-1-8.xlsx 2026-09-15 \
  --compare data/variants/2026-08-20.min.json

# Rezultat: data/variants/2026-09-15.min.json (rândurile) și
#           data/variants/2026-09-15.solde-grad.json (Anexa VI cap. I.2)
# Raportul de pe stdout listează TOT ce nu a putut fi interpretat: rânduri fără
# coeficient, coloane ignorate (sume în lei, factori), sheet-uri duplicate,
# coduri în alt format și diferențele de rânduri față de setul de referință.

# 2. Descrie varianta în data/variants/index.json (valoare de referință, articole,
#    intrare în vigoare, surse, note) și înregistreaz-o în lib/variants.ts și
#    lib/variants-data.ts (importurile JSON sunt statice).

# 3. Adaugă valorile-reper în scripts/verify-variants.mjs și rulează
npm run verify:variants
```

Opțiuni: `--out-dir <dir>` (implicit `data/variants`), `--compare <ref.min.json>`, `--dry-run`.

Reguli de interpretare (documentate și în antetul scriptului): coloanele de coeficient sunt cele cu valori în [0,05; 9,5]; etichetele „Grad I/Grad II”, „Nivel I/II”, „Grad managerial”, „minim/maxim”, „comandă/execuție” devin câmpul `grad` (un rând cu Grad I și Grad II → două înregistrări); Anexa IX cu coloane 2026/2027 … 2031 → o înregistrare cu `coeficient` = prima coloană și `coeficientEsalonat` = toate; soldele de grad (Anexa VI cap. I.2) merg în fișier separat, nu în lista de funcții; treapta de populație a sheet-urilor de administrație locală ajunge în `subcapitol`.

Setul din 25 mai (`data/coefficients.min.json`) este cel importat inițial și este păstrat neschimbat; importatorul rulat pe același xlsx produce 2.718 rânduri (față de 2.627) pentru că nu mai pierde rândurile cu „Nr. crt.” text și rândurile cu coeficienți identici pe coloane diferite.

## Structură

```
.
├── app/
│   ├── layout.tsx                      # SEO meta + globals
│   ├── page.tsx                        # landing (banner, calculator, variante, surse)
│   ├── api/coeficienti/[varianta]/     # setul de coeficienți al unei variante (JSON)
│   ├── api/chat/                       # chat AI (NVIDIA NIM) cu tool-urile din lib/tools.ts
│   └── api/mcp/                        # server MCP (+ /oauth/*)
├── components/
│   ├── ModeSwitcher.tsx                # selector variantă + mod (Ghidat / Expert)
│   ├── Wizard.tsx, Calculator.tsx      # cele două interfețe de calcul
│   ├── BannerNeadoptat.tsx             # starea proiectului (26 aug 2026)
│   ├── Variante.tsx                    # „Ce s-a schimbat între variante” + ce nu e modelat
│   └── Sources.tsx                     # documente sursă pe variantă
├── lib/
│   ├── tax.ts                          # calcul brut→net + gradații + sporuri (formule)
│   ├── variants.ts                     # metadatele variantelor (client-safe)
│   ├── variants-data.ts                # seturile de coeficienți (server-only)
│   ├── varianta-context.tsx            # varianta selectată, pentru componente
│   └── tools.ts                        # tool-urile MCP / chat
├── data/
│   ├── coefficients.min.json           # varianta 25 mai (import inițial)
│   └── variants/                       # index.json + seturi iulie/august + solde de grad
├── scripts/
│   ├── import-coeficienti.mjs          # xlsx MMFTSS → .min.json
│   └── verify-variants.mjs             # verificări rulate în CI
├── public/sources/                     # copiile locale ale documentelor oficiale
├── Dockerfile                          # multi-stage build, standalone
└── next.config.mjs                     # output: 'standalone'
```

## Contribuții

- **Bug-uri și sugestii**: deschide un [Issue](https://github.com/Jamaalx/salarizare-bugetari/issues). Include varianta proiectului, funcția/anexa, valorile introduse și rezultatul așteptat vs. cel obținut.
- **Corecții la coeficienți, sporuri sau formule**: obligatoriu cu trimitere la **varianta, anexa, capitolul și articolul** din proiectul de lege (sau la Excel-ul oficial) care susține corecția. Fără sursă citată, modificările de date/calcul nu se acceptă — instrumentul e folosit în discuții cu miză reală.
- Pentru cod: PR-urile trebuie să treacă `npm run lint`, `npm run build` și `npm run verify:variants` (CI-ul le rulează automat). Nu modifica `lib/tax.ts` sau `data/**/*.json` în același PR cu schimbări de UI.

## Licență

[MIT](LICENSE) — © 2026 Alex Mantello (ZED-ZEN). Folosește, modifică, redistribuie. Datele oficiale aparțin Guvernului României.
