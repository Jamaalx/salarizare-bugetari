/**
 * Ghidurile (/ghiduri): fiecare articol e un fișier TS în lib/ghiduri/, înregistrat
 * în lib/ghiduri/index.ts. Cifrele se calculează din datele variantelor (data/variants, lib/variants*.ts)
 * și din lib/tax.ts, nu se scriu de mână: când datele se schimbă, articolul se schimbă cu ele.
 *
 * Instrucțiunile pentru agentul care scrie articole noi: BLOG-AUTOPILOT.md, în rădăcina repo-ului.
 */

export type CategorieGhid = "Ghid" | "Analiză";

export interface SursaGhid {
  /** instituția și documentul, ex. „MMFTSS: proiectul legii salarizării, 20 august 2026” */
  titlu: string;
  /** adresa oficială (https) */
  url: string;
  /** ce anume am luat de acolo (opțional) */
  nota?: string;
}

export interface Ghid {
  /** adresa: /ghiduri/<slug>; litere mici, cifre și cratime, fără diacritice */
  slug: string;
  categorie: CategorieGhid;
  /** H1, formulat ca întrebare sau ca afirmație clară */
  titlu: string;
  /** <title> fără sufixul „— România Transparentă”, cel mult ~65 de caractere, cuvântul-cheie în față */
  titluMeta: string;
  /** meta description, 120–170 de caractere */
  descriere: string;
  /** cuvântul-cheie țintă (pentru BLOG-AUTOPILOT.md și test, nu apare pe pagină) */
  cuvantCheie: string;
  /** răspunsul direct, 40–60 de cuvinte: stă sus, îl citează motoarele de căutare și asistenții AI */
  raspuns: string;
  /** „Pe scurt”: 3–6 fapte */
  peScurt: readonly string[];
  /** AAAA-LL-ZZ */
  publicat: string;
  /** AAAA-LL-ZZ, ≥ publicat */
  actualizat: string;
  /**
   * Textul, în mini-markdown (components/ghiduri/ArticleBody.tsx): rând gol = paragraf nou; „## Întrebare?” (H2, apare în
   * cuprins); „### Subtitlu”; „- punct”; „1. pas”; „> Atenție: …” (casetă); „**îngroșat**”;
   * „[text](/grila/sanatate-asistenta-sociala)” (legătură internă, cu / în față) sau „[text](https://…)”;
   * tabel: rânduri „| a | b |”, primul rând e antetul, coloanele numerice se aliniază singure.
   */
  corp: string;
  faq: readonly { q: string; a: string }[];
  /** sursele oficiale, afișate la final; fiecare cifră din text trebuie să se poată urmări până la una */
  surse: readonly SursaGhid[];
  /** paginile de bani spre care trimite articolul: calculatorul, grilele (cale internă cu / în față, text) */
  legaturi: readonly (readonly [href: string, text: string])[];
}
