# anatomy.md

> Auto-maintained by OpenWolf. Last scanned: 2026-09-12T07:36:14.772Z
> Files: 54 tracked | Anatomy hits: 0 | Misses: 0

> Project structure index. Auto-maintained by OpenWolf hooks and daemon.
> Run `openwolf scan` to generate, or wait for the first Claude Code session.
> Status: Pending initial scan

## ./

- `.dockerignore` — Docker ignore rules (~29 tok)
- `.gitignore` — Git ignore rules (~30 tok)
- `CHANGELOG.md` — Change log (~753 tok)
- `CLAUDE.md` — OpenWolf (~99 tok)
- `Dockerfile` — Docker container definition (~287 tok)
- `eslint.config.mjs` — ESLint flat configuration (~215 tok)
- `LICENSE` — Project license (~288 tok)
- `next.config.mjs` — Next.js configuration (~451 tok)
- `package.json` — Node.js package manifest (~294 tok)
- `postcss.config.mjs` (~22 tok)
- `README.md` — Project documentation (~2796 tok)
- `tailwind.config.ts` — Tailwind CSS configuration (~117 tok)
- `tsconfig.json` — TypeScript configuration (~161 tok)

## .github/

- `dependabot.yml` (~354 tok)

## .github/workflows/

- `ci.yml` — CI: CI (~352 tok)

## app/

- `globals.css` — Styles: 5 rules, 1 animations (~148 tok)
- `layout.tsx` — metadata (~298 tok)
- `page.tsx` — HomePage (~2515 tok)
- `robots.ts` — Exports robots (~66 tok)

## app/.well-known/oauth-authorization-server/

- `route.ts` — Next.js API route: GET, OPTIONS (~294 tok)

## app/.well-known/oauth-protected-resource/

- `route.ts` — Next.js API route: GET, OPTIONS (~219 tok)

## app/api/chat/

- `route.ts` — Next.js API route: POST (~2618 tok)

## app/api/coeficienti/[varianta]/

- `route.ts` — Setul de coeficienți al unei variante a proiectului, în formatul citit de (~294 tok)

## app/api/mcp/

- `route.ts` — MCP server stateless cu HTTP transport simplificat. (~1884 tok)

## app/diplomatie/

- `page.tsx` — DiplomatiePage — uses useState, useMemo (~3289 tok)

## app/mcp/

- `page.tsx` — metadata (~3156 tok)

## app/oauth/authorize/

- `route.ts` — Next.js API route: GET (~512 tok)

## app/oauth/register/

- `route.ts` — Next.js API route: POST, OPTIONS (~347 tok)

## app/oauth/token/

- `route.ts` — Next.js API route: POST, OPTIONS (~866 tok)

## components/

- `BannerNeadoptat.tsx` — Banner permanent: proiectul de lege NU a fost adoptat (26 august 2026). (~348 tok)
- `Calculator.tsx` — foldText — uses useMemo, useState (~9022 tok)
- `ChatWidget.tsx` — ChatWidget — uses useState (~798 tok)
- `ModeSwitcher.tsx` — cache — uses useEffect (~2135 tok)
- `Sources.tsx` — SURSE_MAI (~2956 tok)
- `Variante.tsx` — RANDURI — renders table (~2275 tok)
- `Wizard.tsx` — EtichetaVarianta — uses useEffect (~23529 tok)

## data/

- `coefficients.json` (~275152 tok)
- `coefficients.min.json` (~195498 tok)

## data/variants/

- `2026-05-25.solde-grad.json` (~945 tok)
- `2026-07-17.min.json` (~217295 tok)
- `2026-07-17.solde-grad.json` (~932 tok)
- `2026-08-20.min.json` (~236740 tok)
- `2026-08-20.solde-grad.json` (~932 tok)
- `index.json` (~2237 tok)

## lib/

- `oauth.ts` — API routes: GET (3 endpoints) (~580 tok)
- `rate-limit.ts` — In-memory token-bucket rate limiter. Single-instance only. (~466 tok)
- `tax.ts` — Deducerea personală 2027 — pe baza Codului fiscal (OUG 16/2022, neabrogată de (~18005 tok)
- `tools.ts` — Tools partajate între MCP server și chat AI. (~5134 tok)
- `varianta-context.tsx` — VariantaContext — uses useContext (~154 tok)
- `variants-data.ts` — Seturile de coeficienți pe variante — DOAR server-side (tools MCP/chat, (~763 tok)
- `variants.ts` — Variantele oficiale ale proiectului de lege a salarizării (MMFTSS 2026). (~1248 tok)

## public/

- `coefficients.json` (~197429 tok)

## scripts/

- `import-coeficienti.mjs` — Importă coeficienții de salarizare din xlsx-ul publicat de MMFTSS (~6158 tok)
- `verify-variants.mjs` — Verifică integritatea seturilor de date pe variante (rulat în CI): (~2256 tok)
