/**
 * Antetul platformei, după antetul de pe romaniatransparenta.eu (mod „bar"):
 * logo, navigare spre registre și un meniu fără JavaScript pe mobil.
 * Culorile și fontul vin din brandbook (globals.css / tailwind.config.ts).
 */
const RT = "https://romaniatransparenta.eu";

const LEGATURI = [
  { eticheta: "Registre", href: `${RT}/registre/` },
  { eticheta: "Salarii bugetari", href: "https://salarii.romaniatransparenta.eu", curent: true },
  { eticheta: "Spitale", href: "https://spitale.romaniatransparenta.eu" },
  { eticheta: "Metodologie", href: `${RT}/cum-lucram/` },
  { eticheta: "Despre", href: `${RT}/despre/` },
];

export default function BaraPlatforma() {
  return (
    <header className="rt-bar">
      <div className="rt-bar__inner">
        <a href={RT} className="rt-bar__logo" aria-label="România Transparentă, prima pagină">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-navy-tricolor.svg" alt="România Transparentă" width={132} height={31} />
        </a>
        <nav className="rt-bar__nav" aria-label="Principal">
          {LEGATURI.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rt-bar__item"
              aria-current={l.curent ? "page" : undefined}
            >
              {l.eticheta}
            </a>
          ))}
        </nav>
        <a href={`${RT}/#implica-te`} className="rt-btn rt-btn--primary rt-btn--sm rt-bar__cta">
          Implică-te
        </a>
        <details className="rt-bar__m">
          <summary aria-label="Meniu">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </summary>
          <div className="rt-bar__mpanel">
            {LEGATURI.map((l) => (
              <a key={l.href} href={l.href} aria-current={l.curent ? "page" : undefined}>
                {l.eticheta}
              </a>
            ))}
            <a href={`${RT}/#implica-te`} className="rt-btn rt-btn--primary">Implică-te</a>
          </div>
        </details>
      </div>
    </header>
  );
}
