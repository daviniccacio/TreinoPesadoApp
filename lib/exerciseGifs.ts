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
  //Pernas:
  agachamento_livre: require('../assets/gifs/pernas/agachamento-livre.gif'),

  //Costas:
  puxada_frontal: require('../assets/gifs/costas/puxada-frontal-aberta.gif'),

  // Biceps:
  rosca_direta: require('../assets/gifs/biceps/rosca-direta.gif'),
  biceps_banco_scott: require('../assets/gifs/biceps/biceps-banco-scott.gif'),
  biceps_com_barra_reta: require('../assets/gifs/biceps/biceps-com-barra-reta.gif'),
  biceps_com_barra_w: require('../assets/gifs/biceps/biceps-com-barra-w.gif'),
  biceps_na_polia: require('../assets/gifs/biceps/biceps-na-polia.gif'),
  rosca_alternada_com_halteres: require('../assets/gifs/biceps/rosca-alternada-com-halteres.gif'),
  rosca_direta_com_halteres: require('../assets/gifs/biceps/rosca-direta-com-halteres.gif'),

  // Ombros:
  elevacao_lateral: require('../assets/gifs/ombros/elevacao-lateral.gif'),
  elevacao_lateral_com_cabo: require('../assets/gifs/ombros/elevacao-lateral-com-cabo.gif'),
  arnold_press: require('../assets/gifs/ombros/arnold-press.gif'),
  encolhimento_de_ombros_com_halteres: require('../assets/gifs/ombros/encolhimento-de-ombros-com-halteres.gif'),
  ombro_maquina: require('../assets/gifs/ombros/ombro-maquina.gif'),
  remada_alta_com_barra: require('../assets/gifs/ombros/remada-alta-com-barra.gif'),
  remada_alta_com_halteres: require('../assets/gifs/ombros/remada-alta-com-halteres.gif'),
  remada_vertical_com_corda: require('../assets/gifs/ombros/remada-vertical-com-corda.gif'),

  // Peitoral:
  supino_reto: require('../assets/gifs/peitoral/supino-reto.gif'),
  voador: require('../assets/gifs/peitoral/voador.gif'),
  supino_inclinado_com_barra: require('../assets/gifs/peitoral/supino-inclinado-com-barra.gif'),
  cross_over: require('../assets/gifs/peitoral/cross-over.gif'),
  cross_over_baixo: require('../assets/gifs/peitoral/cross-over-baixo.gif')

};

// GIF padrão (fallback) utilizado para garantir que a tela não quebre
// caso um exercício ainda não tenha imagem cadastrada.
export const DEFAULT_EXERCISE_GIF = require('../assets/gifs/peitoral/supino-reto.gif');

/**
 * Função responsável por buscar a imagem/GIF local correspondente.
 * 
 * @param gifKey - A chave do exercício cadastrada no banco de dados (ex: 'supino_reto')
 * @returns O arquivo importado pronto para ser usado no componente <Image source={...} />
 */
export function getExerciseGif(gifKey?: string){
  if (!gifKey) {
    console.log('⚠️ [GIF Loader] Nenhuma gifKey informada. Usando GIF padrão.');
    return DEFAULT_EXERCISE_GIF;
  }

  const formattedKey = gifKey.toLowerCase().trim();
  const foundGif = LOCAL_EXERCISE_GIFS[formattedKey];

  if (foundGif) {
    console.log(`✅ [GIF Loader] GIF encontrado para a chave: "${formattedKey}"`);
    return foundGif;
  } else {
    console.log(`❌ [GIF Loader] Chave "${formattedKey}" não encontrada no dicionário. Usando GIF padrão.`);
    return DEFAULT_EXERCISE_GIF;
  }
}