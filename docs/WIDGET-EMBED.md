# Widget: calculatorul pus pe alte site-uri

Pentru cine e: sindicate, școli, spitale, primării, asociații. Ei pun calculatorul în pagina lor, iar noi primim mențiuni de brand și vizite de referință.
Pagina publică cu generatorul de cod: `/widget` („Pune calculatorul pe site-ul tău”), adică `https://romaniatransparenta.eu/registre/salarii/widget`.

## 1. Piesele

| Piesă | Fișier | Ce face |
|---|---|---|
| Ruta embed | `app/embed/page.tsx` + `components/EmbedCalculator.tsx` | Calculatorul compact: alegerea variantei, Ghidat/Expert, avertismentul „proiect neadoptat”, atribuirea vizibilă. Fără antetul și subsolul site-ului (`components/ShellSite.tsx` nu pune nimic pe `/embed`, deci nici SSI). |
| Scriptul | `public/embed.js` (~1,6 KB fără comentarii) | Pune un iframe în fiecare `<div data-rt-salarii>` și potrivește înălțimea după mesajele ferestrei din iframe. |
| Codul de copiat | `lib/widget.ts` (`codScript`, `codIframe`, `atribuireHtml`) | Același cod în generator, în teste și în documentație. |
| Generatorul | `app/widget/page.tsx` + `components/GeneratorWidget.tsx` | Opțiuni, cod de copiat, previzualizare, condiții de folosire. |
| Antetele HTTP | `next.config.mjs` | CSP separat pe `/embed` (vezi §4). |
| Teste | `tests/widget.test.mjs` | Ancora de brand, linkul vizibil, parametrii, înălțimea, mărimea și comportamentul lui `embed.js`. |

## 2. Ruta embed

`GET /registre/salarii/embed?varianta=<YYYY-MM-DD>&mod=<ghidat|expert>`

| Parametru | Valori | Implicit |
|---|---|---|
| `varianta` | id-ul unei variante din `data/variants/index.json` (ex. `2026-07-17`) | varianta implicită a calculatorului (ultima publicată; se schimbă singură la o variantă nouă) |
| `mod` | `ghidat`, `expert` | `ghidat` |

Orice altă valoare e ignorată (`parametriEmbed`). Vizitatorul poate schimba varianta și modul din widget.

Ruta nu e o pagină de citit singură:
- are `<meta name="robots" content="noindex, follow">` și antetul `X-Robots-Tag: noindex`;
- canonical spre prima pagină a calculatorului;
- nu e în sitemap;
- nu e blocată în robots.txt, ca Google să poată vedea noindex-ul.

Butonul „Trimite linkul către un coleg” dă, în widget, adresa primei pagini, nu pe cea a rutei embed (`linkPartajare`).
Linkurile din widget spre alte pagini se deschid într-o filă nouă.

## 3. Înălțimea (postMessage)

- Fereastra din iframe trimite părintelui `{ type: "rt-salarii:inaltime", h: <px> }` la fiecare schimbare de mărime (ResizeObserver), numai când e într-un cadru.
- `embed.js` primește mesajul doar dacă:
  - `event.origin` e originea scriptului;
  - `event.source` e unul dintre iframe-urile lui.
- Apoi pune înălțimea, limitată la 480–4000 px.
- Mesajul nu conține date despre vizitator sau despre calcul, doar înălțimea.
- Varianta cu iframe simplu (fără script) are înălțime fixă, aleasă în generator (implicit 900 px). Conținutul mai lung derulează în cadru.

## 4. Securitate și antete

- Pe tot site-ul rămân `frame-ancestors 'none'` și `X-Frame-Options: DENY`.
- Pe `/embed` (cu sau fără prefix, cu sau fără „/” final):
  - CSP-ul e același, cu `frame-ancestors $WIDGET_FRAME_ANCESTORS` (implicit `*`, adică orice site);
  - fără `X-Frame-Options`;
  - cu `X-Robots-Tag: noindex`.
- `WIDGET_FRAME_ANCESTORS` se citește **la build** (antetele din `next.config.mjs` intră în manifest). Exemplu de restrângere: `https://*.ro https://*.eu`.
- nginx-ul site-ului (`romaniatransparenta/nginx.conf`, locația `/registre/salarii/`) nu pune CSP sau X-Frame-Options propriu acolo, deci trec antetele aplicației. Dacă adaugă vreodată `add_header Content-Security-Policy $csp`, ruta embed trebuie exceptată acolo.
- Fără cookie-uri, fără stocare locală și fără cereri spre terți, nici în `embed.js`, nici în ruta embed. Datele coeficienților vin din `/api/coeficienti/<id>`, de pe aceeași origine cu iframe-ul.

## 5. Atribuirea și politica Google de link spam

Google numește explicit link spam „keyword-rich, hidden, or low-quality links embedded in widgets” ([Spam policies](https://developers.google.com/search/docs/essentials/spam-policies)). Playbook-ul nostru (`seo-ops/docs/CERCETARE-SEO.md` §8.2) spune: „brand vizibil + `nofollow` opțional = sigur”. Valoarea reală stă în mențiuni, trafic de referință și brand, nu în PageRank. De aceea:

1. **Ancora e brandul, exact:** „Calculator salarii — România Transparentă” (`ATRIBUIRE_TEXT`). Fără „calculator salariu profesor 2026” și alte cuvinte cheie. Un test o verifică.
2. **Linkul e vizibil:**
   - în codul copiat, ca paragraf sub widget, în pagina gazdei;
   - în iframe, ca subsol al widgetului.
   Nimic ascuns: fără `display:none`, font 0 sau link în `<noscript>`.
3. **Un singur link** în codul copiat. Ținta e prima pagină a calculatorului, cu `utm_source=widget&utm_medium=embed`.
4. **`rel` configurabil:**
   - Implicit (`REL_IMPLICIT = ""`), link de brand obișnuit, cum spune playbook-ul.
   - Gazda bifează „nofollow” în generator dacă politica ei o cere.
   - Dacă Alex decide `nofollow` peste tot, se schimbă o singură constantă în `lib/widget.ts`. Testele acceptă ambele valori.
5. **Nu cerem linkul ca preț al widgetului** în alt loc decât sub widget, și nu punem linkuri în footerul gazdei.

## 6. Cum măsurăm (fără tracking nou)

- **Domeniile care încorporează:**
  - Iframe-ul face `GET /registre/salarii/embed` cu `Referer: <originea gazdei>` (politica `strict-origin-when-cross-origin`, pusă și pe iframe).
  - Le citim din jurnalul de acces al proxy-ului (nginx RT / Traefik), filtrat pe calea `/registre/salarii/embed`.
  - Nu există încă un colector seo-ops pentru calea asta. Beacon-ul `/__zz` din seo-ops nu e pus în această aplicație.
- **Vizitele aduse de widget:** `utm_source=widget` pe linkul de atribuire, în statistici/GSC.
- **Mențiunile:** `seo mentions` + `seo mentions_unlinked` din seo-ops.

## 7. Ce rămâne de decis

- `rel` implicit: link de brand (acum) sau `nofollow`.
- `WIDGET_FRAME_ANCESTORS`: orice site (acum) sau o listă.
- Colectorul pentru Referer-ele de pe `/embed` în seo-ops.
