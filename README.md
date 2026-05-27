# Calculator Salariu Bugetari — Proiect Lege MMFTSS 2026

Webapp interactiv pentru calculul salariului brut/net al personalului plătit din fonduri publice conform **proiectului de lege MMFTSS din 25 mai 2026** privind salarizarea în sectorul bugetar.

> ⚠️ **Disclaimer:** Acesta este un instrument neoficial, informativ. Proiectul de lege nu a fost adoptat încă. Valoarea de referință (care înmulțită cu coeficientul determină salariul de bază) urmează a fi stabilită anual prin Hotărâre de Guvern.

## Ce face

- **2.483 funcții** extrase din anexele I–IX ale proiectului (coeficienții 1.00 – 8.00)
- Calculează **salariul de bază** (coeficient × valoare de referință + gradații)
- Aplică **gradații de vechime** (0–5) conform art. 13
- Tratează corect cazurile speciale (învățământ univ., personal sanitar — coef include vechimea)
- Adaugă **sporuri configurabile** (control financiar, fonduri EU, noapte, ore suplimentare, handicap, condiții de muncă) cu plafon 20%
- Calculează **brut → net** (CAS 25%, CASS 10%, impozit 10%)
- Estimează **diferența salarială tranzitorie** (art. 32)

## Surse documentație

- [Proiect lege MMFTSS 25 mai 2026](https://mmuncii.ro/j33/index.php/ro/transparenta/proiecte-in-dezbatere) — text + anexe (coeficienții 1-8, calendar, ierarhia funcțiilor)

## Stack

- Next.js 15.1 (App Router, standalone build)
- React 19
- TypeScript 5.7
- Tailwind CSS 3.4

## Local dev

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

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
   - Domain: `salarizare.zed-zen.com` (sau alt subdomeniu)

3. **DNS Cloudflare**:
   - CNAME `salarizare` → `<IP-server>` sau `<server>.coolify`
   - SSL: Full (Coolify emite cert via Let's Encrypt sau folosește Cloudflare proxy)

4. Auto-deploy on push: configurat default de Coolify când conectezi GitHub.

## Re-generare date din Excel-ul original

Dacă ministerul publică versiuni actualizate ale Excel-ului:

```bash
cd ..   # proiect root
# Înlocuiește Proiect-COEFICIENTI-1-8-MMFTSS-XX.XX.XXXX-XX.XX-.xlsx
python extract.py
# Output: webapp/data/coefficients.json
```

## Structură

```
webapp/
├── app/
│   ├── layout.tsx          # SEO meta + globals
│   ├── page.tsx            # landing
│   └── globals.css
├── components/
│   └── Calculator.tsx      # toata logica UI a calculatorului
├── lib/
│   └── tax.ts              # calcul brut→net + gradații + sporuri
├── data/
│   └── coefficients.json   # generat din Excel-ul MMFTSS
├── Dockerfile              # multi-stage build, standalone
└── next.config.mjs         # output: 'standalone'
```

## Licență

MIT — folosește, modifică, redistribuie. Datele oficiale aparțin Guvernului României.
