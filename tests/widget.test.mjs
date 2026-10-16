// Teste pentru widgetul calculatorului (lib/widget.ts, public/embed.js). Specificația: docs/WIDGET-EMBED.md.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  ATRIBUIRE_TEXT,
  ATRIBUIRE_URL,
  REL_IMPLICIT,
  atribuireHtml,
  codIframe,
  codScript,
  limitareInaltime,
  linkPartajare,
  parametriEmbed,
  urlEmbed,
} from "../lib/widget.ts";

test("ancora de atribuire e exact brandul, fără cuvinte cheie", () => {
  assert.equal(ATRIBUIRE_TEXT, "Calculator salarii — România Transparentă");
  const a = atribuireHtml();
  assert.match(a, />Calculator salarii — România Transparentă<\/a>/);
  assert.ok(a.includes(`href="${ATRIBUIRE_URL.replace(/&/g, "&amp;")}"`));
  // vizibil: niciun stil care ascunde linkul
  assert.doesNotMatch(a, /display:\s*none|visibility:\s*hidden|font-size:\s*0|opacity:\s*0/);
});

test("rel: implicit e cel din REL_IMPLICIT, nofollow se adaugă la cerere", () => {
  assert.equal(atribuireHtml("").includes('rel="noopener"'), true);
  assert.equal(atribuireHtml("nofollow").includes('rel="noopener nofollow"'), true);
  assert.ok(["", "nofollow"].includes(REL_IMPLICIT));
});

test("codul copiat are linkul de atribuire în pagina gazdei, în ambele formate", () => {
  for (const cod of [codIframe(), codScript(), codIframe({ rel: "nofollow" }), codScript({ mod: "expert" })]) {
    assert.ok(cod.includes(ATRIBUIRE_TEXT), cod);
    assert.equal((cod.match(/<a /g) || []).length, 1, "un singur link, cel de brand");
  }
  assert.match(codScript(), /<script src="https:\/\/romaniatransparenta\.eu\/registre\/salarii\/embed\.js" async><\/script>/);
  assert.match(codIframe(), /<iframe src="https:\/\/romaniatransparenta\.eu\/registre\/salarii\/embed" /);
});

test("parametrii embed: doar valori cunoscute", () => {
  assert.deepEqual(parametriEmbed("?varianta=2026-07-17&mod=expert"), { varianta: "2026-07-17", mod: "expert" });
  assert.deepEqual(parametriEmbed("?varianta=<script>&mod=x"), { varianta: null, mod: "ghidat" });
  assert.equal(urlEmbed({ varianta: "2026-08-20", mod: "expert" }), "https://romaniatransparenta.eu/registre/salarii/embed?varianta=2026-08-20&mod=expert");
  assert.equal(urlEmbed({ varianta: "nu-e-data", mod: "ghidat" }), "https://romaniatransparenta.eu/registre/salarii/embed");
});

test("înălțimea e limitată la 480–4000 px", () => {
  assert.equal(limitareInaltime(100), 480);
  assert.equal(limitareInaltime(99999), 4000);
  assert.equal(limitareInaltime("abc"), 900);
  assert.equal(limitareInaltime(1234.4), 1234);
});

test("butonul de partajare din widget trimite la prima pagină, nu la ruta embed", () => {
  assert.equal(
    linkPartajare({ href: "https://x/registre/salarii/embed?varianta=2026-07-17", pathname: "/registre/salarii/embed", search: "?varianta=2026-07-17" }),
    "https://romaniatransparenta.eu/registre/salarii/?varianta=2026-07-17",
  );
  const pe = { href: "https://romaniatransparenta.eu/registre/salarii/grila", pathname: "/registre/salarii/grila", search: "" };
  assert.equal(linkPartajare(pe), pe.href);
});

test("embed.js: mic, fără cookie/stocare, verifică originea mesajelor", () => {
  const js = readFileSync(new URL("../public/embed.js", import.meta.url), "utf8");
  const cod = js.replace(/\/\*[\s\S]*?\*\//g, "");
  assert.ok(Buffer.byteLength(cod) < 2048, `embed.js are ${Buffer.byteLength(cod)} octeți fără comentarii`);
  assert.doesNotMatch(cod, /document\.cookie|localStorage|sessionStorage|sendBeacon|fetch\(/);
  assert.match(cod, /e\.origin !== origin/);
  assert.match(cod, /rt-salarii:inaltime/);
});
