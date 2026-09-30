import type { Config } from "tailwindcss";

const brandScale = {
  50: "#f5f8fd", 100: "#dce6f6", 200: "#a8c0ea", 300: "#6a94d8", 400: "#4a7dce",
  500: "#2f66c4", 600: "#2554a6", 700: "#1b4288", 800: "#123262", 900: "#0a2257",
};

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Paleta România Transparentă (brandbook v2). Capetele și treptele 100–300
        // sunt exact culorile din brandbook (navy, albastru, scara de date);
        // 50 și 400–800 sunt interpolări pe aceeași axă navy → albastru.
        brand: {
          50: "#f5f8fd",
          100: "#dce6f6", // rt-data-1
          200: "#a8c0ea", // rt-data-2
          300: "#6a94d8", // rt-data-3
          400: "#4a7dce",
          500: "#2f66c4", // rt-blue / rt-data-4
          600: "#2554a6",
          700: "#1b4288",
          800: "#123262",
          900: "#0a2257", // rt-navy / rt-data-5
        },

        // Paleta Tailwind implicită e înlocuită cu tonuri din brandbook, ca ecranele
        // existente (Wizard, Calculator, ghiduri) să preia identitatea fără rescriere.
        blue: brandScale,
        sky: brandScale,
        indigo: brandScale,
        teal: brandScale,
        orange: brandScale,
        purple: brandScale,
        violet: brandScale,
        cyan: brandScale,
        slate: {
          50: "#f6f6f6", 100: "#eef0f3", 200: "#e3e5ea", 300: "#cdd1d9", 400: "#8f95a3",
          500: "#5c6270", 600: "#4a505d", 700: "#2f3648", 800: "#123262", 900: "#0a2257",
        },
        amber: {
          50: "#fdf8e3", 100: "#fbeeb5", 200: "#f8e28a", 300: "#f5d55a", 400: "#f2c41a",
          500: "#d9ad0c", 600: "#a87f00", 700: "#7a5c00", 800: "#5c4500", 900: "#3f3000",
        },
        emerald: {
          50: "#eef7ee", 100: "#d8ecd7", 200: "#bfe0bd", 300: "#9dcf9b", 400: "#7fbf7d",
          500: "#64af62", 600: "#3f8a3d", 700: "#2f6b2e", 800: "#24522a", 900: "#1a3a1e",
        },
        rose: {
          50: "#fdeced", 100: "#fbdadc", 200: "#f5b8bc", 300: "#ee9095", 400: "#e6666e",
          500: "#e0454f", 600: "#c4303a", 700: "#9e232c", 800: "#7a1c23", 900: "#55151a",
        },
        rt: {
          navy: "#0a2257",
          ink: "#120c0c",
          paper: "#f6f6f6",
          blue: "#2f66c4",
          yellow: "#f2c41a",
          red: "#e0454f",
          green: "#64af62",
          gray: "#5c6270",
          line: "#e3e5ea",
        },
      },
      borderRadius: { "3xl": "28px" },
      fontFamily: {
        // fonturile licențiate se servesc de pe romaniatransparenta.eu (fonts.css)
        sans: ['"RT Gotham"', "Montserrat", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
