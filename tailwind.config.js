/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#59C83A",
      },
      fontFamily: {
        // Títulos e Destaques (Outfit)
        outfit: ["Outfit_700Bold", "sans-serif"],
        "outfit-semibold": ["Outfit_600SemiBold", "sans-serif"],
        "outfit-extrabold": ["Outfit_800ExtraBold", "sans-serif"],

        // Texto de Corpo e Leitura (DM Sans)
        sans: ["DMSans_400Regular", "sans-serif"],
        "sans-medium": ["DMSans_500Medium", "sans-serif"],
        "sans-bold": ["DMSans_700Bold", "sans-serif"],
      },
    },
  },
  plugins: [],
};