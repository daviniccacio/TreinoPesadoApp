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
  afundo_com_halteres: require('../assets/gifs/pernas/afundo-com-halteres.gif'),
  agachamento_bulgaro: require('../assets/gifs/pernas/agachamento-bulgaro.gif'),
  agachamento_hack: require('../assets/gifs/pernas/agachamento-hack.gif'),
  agachamento_livre: require('../assets/gifs/pernas/agachamento-livre.gif'),
  cadeira_extensora_inversa: require('../assets/gifs/pernas/cadeira-extensora-inversa.gif'),
  cadeira_extensora: require('../assets/gifs/pernas/cadeira-extensora.gif'),
  elevacao_anteriores: require('../assets/gifs/pernas/elevacao-anteriores.gif'),
  hack_horizontal: require('../assets/gifs/pernas/hack-horizontal.gif'),
  leg_press: require('../assets/gifs/pernas/leg-press.gif'),
  step_up_com_halteres: require('../assets/gifs/pernas/step-up-com-halteres.gif'),
  v_squat: require('../assets/gifs/pernas/v-squat.gif'),

  //Costas:
  puxada_frontal: require('../assets/gifs/costas/puxada-frontal.gif'),
  gravitron_costas: require('../assets/gifs/costas/gravitron-costas.gif'),
  puxada_frontal_com_barra_anatomica: require('../assets/gifs/costas/puxada-frontal-com-barra-anatomica.gif'),
  puxada_frontal_em_pe: require('../assets/gifs/costas/puxada-frontal-em-pe.gif'),
  remada_baixa_com_pegada_neutra: require('../assets/gifs/costas/remada-baixa-com-pegada-neutra.gif'),
  remada_baixa_unilateral: require('../assets/gifs/costas/remada-baixa-unilateral.gif'),
  puxada_frontal_com_triangulo: require('../assets/gifs/costas/puxada-frontal-com-triangulo.gif'),
  remada_cavalinho: require('../assets/gifs/costas/remada-cavalinho.gif'),
  remada_com_barra_supinada: require('../assets/gifs/costas/remada-com-barra-supinada.gif'),
  remada_serrote_unilateral: require('../assets/gifs/costas/remada-serrote-unilateral.gif'),

  // Biceps:
  rosca_direta_com_barra_w: require('../assets/gifs/bracos/rosca-direta-com-barra-w.gif'),
  rosca_direta_pegada_curta: require('../assets/gifs/bracos/rosca-direta-pegada-curta.gif'),
  rosca_direta_na_corda: require('../assets/gifs/bracos/rosca-direta-na-corda.gif'),
  rosca_direta_com_cabo: require('../assets/gifs/bracos/rosca-direta-com-cabo.gif'),
  rosca_scott: require('../assets/gifs/bracos/rosca-scott.gif'),
  rosca_alternada_em_pe: require('../assets/gifs/bracos/rosca-alternada-em-pe.gif'),
  rosca_alternada_martelo: require('../assets/gifs/bracos/rosca-alternada-martelo.gif'),

  // Triceps:
  triceps_banco: require('../assets/gifs/bracos/triceps-banco.gif'),
  triceps_com_cabo_baixo: require('../assets/gifs/bracos/triceps-com-cabo-baixo.gif'),
  triceps_testa: require('../assets/gifs/bracos/triceps-testa.gif'),
  chute_triceps_unilateral: require('../assets/gifs/bracos/chute-triceps-unilateral.gif'),
  extensao_triceps_com_cabo: require('../assets/gifs/bracos/extensao-triceps-com-cabo.gif'),
  extensao_triceps_corda_cima: require('../assets/gifs/bracos/extensao-triceps-corda-cima.gif'),
  extensao_triceps_sentado: require('../assets/gifs/bracos/extensao-triceps-sentado.gif'),
  
  // Ombros:
  arnold_press: require('../assets/gifs/ombros/arnold-press.gif'),
  elevacao_lateral: require('../assets/gifs/ombros/elevacao-lateral.gif'),
  elevacao_frontal_com_cabo: require('../assets/gifs/ombros/elevacao-frontal-com-cabo.gif'),
  elevacao_frontal_com_barra: require('../assets/gifs/ombros/elevacao-frontal-com-barra.gif'),
  elevacao_frontal_supinada: require('../assets/gifs/ombros/elevacao-frontal-supinada.gif'),
  desenvolvimento_com_halteres: require('../assets/gifs/ombros/desenvolvimento-com-halteres.gif'),
  elevacao_unilateral_com_cabo: require('../assets/gifs/ombros/elevacao-unilateral-com-cabo.gif'),
  face_pull: require('../assets/gifs/ombros/face-pull.gif'),
  maquina_ombro: require('../assets/gifs/ombros/maquina-ombro.gif'),
  remada_alta: require('../assets/gifs/ombros/remada-alta.gif'),
  voador_inverso: require('../assets/gifs/ombros/voador-inverso.gif'),
  

  // Peitoral:
  supino_livre_reto: require('../assets/gifs/peitos/supino-livre-reto.gif'),
  supino_livre_inclinado: require('../assets/gifs/peitos/supino-livre-inclinado.gif'),
  supino_reto_com_halteres: require('../assets/gifs/peitos/supino-reto-com-halteres.gif'),
  voador: require('../assets/gifs/peitos/voador.gif'),
  supino_inclinado_com_halteres: require('../assets/gifs/peitos/supino-inclinado-com-halteres.gif'),
  supino_articulado_inclinado: require('../assets/gifs/peitos/supino-articulado-inclinado.gif'),
  supino_articulado_reto: require('../assets/gifs/peitos/supino-articulado-reto.gif'),
  crucifixo: require('../assets/gifs/peitos/crucifixo.gif'),
  gravitron: require('../assets/gifs/peitos/gravitron.gif'),
  pull_over: require('../assets/gifs/peitos/pull-over.gif'),
  crossover: require('../assets/gifs/peitos/crossover.gif'),
  crossover_polia_baixa: require('../assets/gifs/peitos/crossover-polia-baixa.gif')

};

// GIF padrão (fallback) utilizado para garantir que a tela não quebre
// caso um exercício ainda não tenha imagem cadastrada.
export const DEFAULT_EXERCISE_GIF = require('../assets/gifs/peitos/voador.gif');

/**
 * Função responsável por buscar a imagem/GIF local correspondente.
 * 
 * @param gifKey - A chave do exercício cadastrada no banco de dados (ex: 'supino_reto')
 * @returns O arquivo importado pronto para ser usado no componente <Image source={...} />
 */
export function getExerciseGif(gifKey?: string) {
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