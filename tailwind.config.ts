import type { Config } from "tailwindcss";

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
      fontFamily: {
        // fonturile licențiate se servesc de pe romaniatransparenta.eu (fonts.css)
        sans: ['"RT Gotham"', "Montserrat", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
