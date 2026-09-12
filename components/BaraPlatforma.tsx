/**
 * Bara platformei: leagă calculatorul de România Transparentă și de celelalte
 * instrumente. Culorile și fontul vin din brandbook (tailwind.config.ts).
 */
const SIGLA = (
  <svg viewBox="-80.105 -41.663 133.167 133.167" className="h-5 w-5 shrink-0" aria-hidden>
    <path
      fill="#FFFFFF"
      fillRule="evenodd"
      d="M-39.0,0A39.0,39.0 0 1 0 39.0,0A39.0,39.0 0 1 0 -39.0,0ZM-28.0,0A28.0,28.0 0 1 1 28.0,0A28.0,28.0 0 1 1 -28.0,0Z"
    />
    <g transform="rotate(35.6285)">
      <path fill="#2F66C4" d="M-3.5,42.0H3.5A2.5,2.5 0 0 1 6.0,44.5V63.0H-6.0V44.5A2.5,2.5 0 0 1 -3.5,42.0Z" />
      <path fill="#F2C41A" d="M-6.0,63.0H6.0V84.0H-6.0V63.0Z" />
      <path fill="#E0454F" d="M-6.0,84.0H6.0V102.5A2.5,2.5 0 0 1 3.5,105.0H-3.5A2.5,2.5 0 0 1 -6.0,102.5V84.0Z" />
    </g>
  </svg>
);

const LEGATURI = [
  { eticheta: "Salarii bugetari", href: "https://salarii.romaniatransparenta.eu", curent: true },
  { eticheta: "Spitale", href: "https://spitale.romaniatransparenta.eu" },
  { eticheta: "Registrul firmelor", href: "https://registru.horecaos.org" },
];

export default function BaraPlatforma() {
  return (
    <div className="bg-rt-navy text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2 text-[13px]">
        <a
          href="https://romaniatransparenta.eu"
          className="inline-flex items-center gap-2 font-bold hover:text-rt-yellow"
        >
          {SIGLA}
          România Transparentă
        </a>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {LEGATURI.map((l) =>
            l.curent ? (
              <span key={l.href} className="text-white/85">
                {l.eticheta}
              </span>
            ) : (
              <a key={l.href} href={l.href} className="text-white/85 hover:text-rt-yellow">
                {l.eticheta}
              </a>
            ),
          )}
        </nav>
      </div>
    </div>
  );
}
