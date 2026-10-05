/**
 * Calculatorul ca pagină a site-ului România Transparentă: romaniatransparenta.eu/registre/salarii/…
 *
 * nginx-ul site-ului face proxy spre aplicație și înlocuiește comentariile SSI de mai jos
 * (`<!--# include virtual="/_shell/…" -->`) cu antetul, subsolul, fonturile și foile de stil ale site-ului,
 * generate la build-ul site-ului (site/src/lib/shell.ts în repo-ul romaniatransparenta) — ca la registrul spitalelor.
 *
 * Când pagina NU trece prin nginx-ul site-ului (subdomeniul vechi înainte de comutare, `next dev`, testele),
 * comentariile rămân comentarii și browserul afișează ramura `<!--# else -->`: antetul și subsolul proprii,
 * scrise aici ca HTML static. Pe site, nginx evaluează `if expr="1"` ca adevărat și aruncă ramura de rezervă.
 *
 * Bucățile intră în pagină prin components/ShellSite.tsx, cu `dangerouslySetInnerHTML` pe un `<div style="display:contents">`: React nu compară
 * conținutul la hidratare (rămâne ce a pus nginx), iar `display:contents` lasă antetul site-ului lipit sus (sticky).
 */

/** prefixul de cale de pe site; același ca `basePath` din next.config.mjs */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** adresa căii `p` („/grila") în aplicație, cu prefix: pentru <a>, fetch și alte adrese pe care Next nu le prefixează */
export const cale = (p: string) => `${BASE_PATH}${p}`;

const RT = "https://romaniatransparenta.eu";

const include = (fisier: string) => `<!--# include virtual="/_shell/${fisier}" -->`;
const cuRezerva = (fisier: string, rezerva: string) =>
  `<!--# if expr="1" -->${include(fisier)}<!--# else -->${rezerva}<!--# endif -->`;

const LEGATURI: [string, string, boolean?][] = [
  ["Registre", `${RT}/registre/`],
  ["Salarii bugetari", cale("/"), true],
  ["Spitale", `${RT}/registre/spitale/`],
  ["Metodologie", `${RT}/cum-lucram/`],
  ["Despre", `${RT}/despre/`],
];
const leg = (cls: string) =>
  LEGATURI.map(([t, h, c]) => `<a href="${h}"${cls ? ` class="${cls}"` : ""}${c ? ' aria-current="page"' : ""}>${t}</a>`).join("");

/** antetul de rezervă: același ca înainte de mutarea pe site (fost components/BaraPlatforma.tsx) */
const ANTET_REZERVA = `<header class="rt-bar"><div class="rt-bar__inner">
<a href="${RT}" class="rt-bar__logo" aria-label="România Transparentă, prima pagină"><img src="${cale("/logo-navy-tricolor.svg")}" alt="România Transparentă" width="132" height="31"></a>
<nav class="rt-bar__nav" aria-label="Principal">${leg("rt-bar__item")}</nav>
<a href="${RT}/#implica-te" class="rt-btn rt-btn--primary rt-btn--sm rt-bar__cta">Implică-te</a>
<details class="rt-bar__m"><summary aria-label="Meniu"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></summary>
<div class="rt-bar__mpanel">${leg("")}<a href="${RT}/#implica-te" class="rt-btn rt-btn--primary">Implică-te</a></div></details>
</div></header>`;

/** subsolul de rezervă: creditul ZEDZEN (pe site e în subsolul site-ului) */
const SUBSOL_REZERVA = `<footer class="sl-subsol"><p>Un registru <a href="${RT}/">România Transparentă</a></p>
<p>Design, cod, funcționalități &amp; hosting: <a href="https://zed-zen.com" target="_blank" rel="noopener" title="ZEDZEN — web design, dezvoltare &amp; hosting">ZEDZEN</a></p></footer>`;

/** la începutul lui <body>: foile de stil ale site-ului (head.html) + antetul */
export const SHELL_ANTET = include("head.html") + cuRezerva("antet.html", ANTET_REZERVA);
/** la sfârșitul lui <body>: subsolul + scripturile site-ului (meniul de mobil, derulantele) */
export const SHELL_SUBSOL = cuRezerva("subsol.html", SUBSOL_REZERVA) + include("scripturi.html");
