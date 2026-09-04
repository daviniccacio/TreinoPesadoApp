const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

// 1. Obtém a configuração padrão do Expo
const config = getDefaultConfig(__dirname);

// 2. Adiciona suporte a extensões .cjs e .mjs (necessário para o Moti e Framer Motion)
config.resolver.sourceExts.push("cjs", "mjs");

// 3. Exporta a configuração integrada ao NativeWind (Tailwind)
module.exports = withNativeWind(config, { input: "./global.css" });