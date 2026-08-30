// ESLint flat config (ESLint 9) — presetul Next.js (core-web-vitals + typescript).
// Rulează cu `npm run lint` (next lint) sau `npx eslint .`.
//
// Trei reguli stilistice sunt coborâte la "warn": codul existent le încalcă
// (inclusiv în lib/tax.ts, care nu se atinge fără verificare de domeniu),
// iar CI trebuie să pice doar pe probleme reale, nu pe stil.
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

export default [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "react/no-unescaped-entities": "warn",
      "prefer-const": "warn",
    },
  },
  {
    ignores: [".next/**", "node_modules/**", "out/**", "next-env.d.ts"],
  },
];
