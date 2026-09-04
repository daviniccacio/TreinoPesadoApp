/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // Fonte Padrão
        sans: ["DMSans_400Regular"],
        dmsans: ["DMSans_400Regular"],
        "dmsans-medium": ["DMSans_500Medium"],
        "dmsans-bold": ["DMSans_700Bold"],
        
        // Fonte para Títulos / Destaques
        outfit: ["Outfit_700Bold"],
        "outfit-black": ["Outfit_800ExtraBold"],
      },
    },
  },
  plugins: [],
};