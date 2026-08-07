/// <reference types="nativewind/types" />

// Ensina o TypeScript a aceitar importações de arquivos .css sem gerar erro
declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}