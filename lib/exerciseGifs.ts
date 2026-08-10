// ============================================================================
// DOCUMENTAÇÃO: MAPEAMENTO DE GIFS LOCAIS
// ============================================================================
// No React Native, imagens e GIFs guardados na pasta 'assets' precisam ser
// importados estaticamente utilizando a função 'require()'.
//
// Este arquivo funciona como um dicionário centralizado. Sempre que baixar um
// novo GIF, você só precisa registrar uma nova linha no objeto LOCAL_EXERCISE_GIFS.
// ============================================================================

export const LOCAL_EXERCISE_GIFS: Record<string, any> = {
  // 'chave_do_exercicio': require('caminho_ate_o_arquivo_gif')
  agachamento_livre: require('../assets/gifs/agachamento-livre.gif'),
  puxada_frontal: require('../assets/gifs/puxada-frontal-aberta.gif'),
  rosca_direta: require('../assets/gifs/rosca-direta.gif'),
  elevacao_lateral: require('../assets/gifs/elevacao-lateral.gif'),
  supino_reto: require('../assets/gifs/supino-reto.gif'),
};

// GIF padrão (fallback) utilizado para garantir que a tela não quebre
// caso um exercício ainda não tenha imagem cadastrada.
export const DEFAULT_EXERCISE_GIF = require('../assets/gifs/supino-reto.gif');

/**
 * Função responsável por buscar a imagem/GIF local correspondente.
 * 
 * @param gifKey - A chave do exercício cadastrada no banco de dados (ex: 'supino_reto')
 * @returns O arquivo importado pronto para ser usado no componente <Image source={...} />
 */
export function getExerciseGif(gifKey?: string) {
  // Se nenhuma chave for informada, retorna o GIF padrão
  if (!gifKey) {
    return DEFAULT_EXERCISE_GIF;
  }

  // Converte a chave para letras minúsculas e remove espaços extras
  const formattedKey = gifKey.toLowerCase().trim();

  // Retorna o GIF correspondente ou o padrão caso não encontre
  return LOCAL_EXERCISE_GIFS[formattedKey] || DEFAULT_EXERCISE_GIF;
}