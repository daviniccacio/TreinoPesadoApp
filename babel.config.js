// ============================================================================
// CONFIGURAÇÃO DO BABEL (EXPO SDK 58 + NATIVEWIND V4)
// ============================================================================

module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      // O Reanimated deve sempre ser mantido como o último plugin da lista
      "react-native-reanimated/plugin",
    ],
  };
};