"use client";

/**
 * Antetul și subsolul site-ului România Transparentă, puse de nginx prin SSI (vezi lib/shell.ts).
 *
 * Componentă client cu obiectele `dangerouslySetInnerHTML` și `style` ca CONSTANTE de modul: React rescrie
 * innerHTML-ul ori de câte ori primește un obiect nou (compară referința, nu textul). Dintr-un layout server,
 * fiecare navigare client-side aducea un obiect nou din payload-ul RSC, iar antetul site-ului (pus de nginx)
 * era înlocuit cu comentariile SSI brute și antetul de rezervă. Cu aceeași referință, React nu atinge nodurile.
 *
 * Pe ruta embed (calculatorul pus pe alte site-uri, docs/WIDGET-EMBED.md) nu se pune nimic: fără antet, subsol
 * și fără comentariile SSI, deci nici nginx nu le completează acolo.
 */
import { usePathname } from "next/navigation";
import { SHELL_ANTET, SHELL_SUBSOL } from "@/lib/shell";
import { CALE_EMBED } from "@/lib/widget";

const STIL = { display: "contents" } as const;
const ANTET = { __html: SHELL_ANTET };
const SUBSOL = { __html: SHELL_SUBSOL };

/** usePathname() dă calea fără basePath („/embed") */
const peEmbed = (p: string | null) => p === CALE_EMBED || !!p?.startsWith(`${CALE_EMBED}/`);

export function AntetSite() {
  if (peEmbed(usePathname())) return null;
  return <div style={STIL} dangerouslySetInnerHTML={ANTET} />;
}

export function SubsolSite() {
  if (peEmbed(usePathname())) return null;
  return <div style={STIL} dangerouslySetInnerHTML={SUBSOL} />;
}
