/** @type {import('tailwindcss').Config} */
module.exports = {
  // 1. ESTA É A LINHA QUE FALTAVA PARA O NATIVEWIND v4 FUNCIONAR:
  presets: [require("nativewind/preset")],

  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // Suas fontes que configuramos
        sans: ["DMSans_400Regular"],
        dmsans: ["DMSans_400Regular"],
        "dmsans-medium": ["DMSans_500Medium"],
        "dmsans-bold": ["DMSans_700Bold"],
        outfit: ["Outfit_700Bold"],
        "outfit-black": ["Outfit_800ExtraBold"],
      },
    },
  },
  plugins: [],
};