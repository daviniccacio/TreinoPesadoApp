// ============================================================================
// DOCUMENTAÇÃO: MODAL DE CONCLUSÃO COM CONFETES NATIVOS IOS/ANDROID (V5)
// ============================================================================
// Utiliza a API Animated nativa do React Native (useNativeDriver) para garantir
// que os confetes verdes funcionem perfeitamente dentro do Modal no iOS e Android.
// ============================================================================

import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { Image } from 'expo-image';
import {
  ShareNetwork,
  X,
  Clock,
  Trophy,
} from 'phosphor-react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface WorkoutCompletionModalProps {
  visible: boolean;
  onClose: () => void;
  workoutName: string;
  durationSeconds: number;
}

// Tons de verde da marca Treino Pesado para os confetes
const CONFETTI_COLORS = [
  '#59C83A',
  '#4CAF50',
  '#81C784',
  '#2E7D32',
  '#A5D6A7',
];

// Frases motivacionais dinâmicas
// ============================================================================
// LISTA EXPANDIDA DE FRASES MOTIVACIONAIS (50 OPÇÕES)
// ============================================================================
const MOTIVATIONAL_QUOTES: string[] = [
  "Mais um pra conta! Mente sã, corpo blindado. 💥",
  "A constância constrói resultados extraordinários! 🚀",
  "Orgulho do processo! Cada repetição importa. 🏋️‍♂️",
  "Superando limites todos os dias. Meta cumprida! 🔥",
  "Treino pago com sucesso. O descanso é merecido! 🏆",
  "Sem desculpas, apenas resultados. Parabéns pela dedicação! 💪",
  "O suor de hoje é a vitória de amanhã. Continue firme! ⚡",
  "A dor é temporária, o orgulho de concluir é para sempre! 🦾",
  "Menos conversa, mais carga! Treino finalizado com maestria. 🔥",
  "Você venceu a preguiça e conquistou mais um dia de evolução! 🚀",
  "Disciplina é fazer o que precisa ser feito, mesmo sem vontade. 💥",
  "Sua única competição é contra a sua versão de ontem! 🏆",
  "Treino Pesado cumprido! O seu futuro agradece o esforço de hoje. 🏋️‍♂️",
  "Mais forte do que ontem, mais preparado do que nunca! ⚡",
  "Foco no objetivo, fé no processo e peso na barra! 🔥",
  "A sensação de dever cumprido é o melhor combustível! 🦾",
  "Cada treino é um tijolo na construção da sua melhor versão. 🧱",
  "Nenhum resultado expressivo vem sem suor e dedicação! 💥",
  "Você dominou os pesos hoje. Orgulhe-se da jornada! 🚀",
  "Constância é a chave que abre a porta dos grandes resultados. 🗝️",
  "Desistir não faz parte do plano. Treino finalizado! 🏆",
  "O corpo alcança o que a mente acredita. Excelente treino! 🧠💪",
  "A meta era treinar pesado, a missão foi cumprida! 🔥",
  "Não diminua a carga, aumente o seu esforço! ⚡",
  "Resultados extraordinários exigem disciplina diária. 🦾",
  "Mais um dia vencido com garra e determinação! 💥",
  "O topo é construído com um treino pesado de cada vez. 🏔️",
  "Suportou a carga e superou seus limites. Parabéns! 🏋️‍♂️",
  "Nada supera a consistência de quem sabe onde quer chegar. 🚀",
  "Corpo cansado, alma lavada e dever cumprido! 🔥",
  "A evolução não para. Treino concluído com sucesso! 🏆",
  "Fazer o simples com excelência diária gera gigantes! ⚡",
  "Quem tem foco não procura desculpas, busca resultados. 💥",
  "A força não vem da vitória, vem da luta diária! 🦾",
  "Hoje você provou que é mais forte do que qualquer desculpa. 🚀",
  "Foco total, zero mimimi e treino concluído! 🔥",
  "Treinar pesado é o estilo de vida dos fortes! 🏋️‍♂️",
  "A batalha de hoje está ganha. Amanhã tem mais! 🏆",
  "Superar a si mesmo é a maior das vitórias! ⚡",
  "Coragem para começar, disciplina para terminar! 💥",
  "O progresso é silencioso, mas os resultados aparecem! 🦾",
  "Treinou forte, descansará em paz. Meta atingida! 🚀",
  "A mente domina, o corpo obedece. Treinaço! 🔥",
  "Construindo uma versão indomável a cada repetição. 🏋️‍♂️",
  "Nada resiste ao trabalho duro feito todos os dias! 🏆",
  "Excelência é um hábito, não um ato isolado. ⚡",
  "Você deu o seu melhor hoje e isso é o que importa! 💥",
  "Treino Pesado concluído: missão dada é missão cumprida! 🦾",
  "A transformação começa quando a zona de conforto termina. 🚀",
  "Orgulhe-se! Você está cada dia mais perto do seu objetivo. 🏆",
];

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);

  if (hrs > 0) {
    return `${hrs}h ${mins}min`;
  }
  return `${mins}min`;
}

// Subcomponente individual para cada confete animado via Native Driver
interface ParticleData {
  id: number;
  x: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  rotate: string;
  isCircle: boolean;
}

function ConfettiItem({ particle }: { particle: ParticleData }) {
  const translateY = useRef(new Animated.Value(-60)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(particle.delay),
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT + 60,
          duration: particle.duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [particle, translateY]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: particle.x,
        width: particle.size,
        height: particle.isCircle ? particle.size : particle.size * 1.6,
        borderRadius: particle.isCircle ? particle.size / 2 : 2,
        backgroundColor: particle.color,
        transform: [
          { translateY },
          { rotate: particle.rotate },
        ],
      }}
    />
  );
}

// 🟢 SUBCOMPONENTE: RECIPIENTE DE CONFETES NATIVOS
function GreenConfettiParticles() {
  const particles = useMemo(() => {
    return Array.from({ length: 35 }).map((_, index) => ({
      id: index,
      x: Math.random() * (SCREEN_WIDTH - 20),
      size: Math.random() * 8 + 6,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      delay: Math.random() * 800,
      duration: Math.random() * 2000 + 2500,
      rotate: `${Math.floor(Math.random() * 360)}deg`,
      isCircle: Math.random() > 0.5,
    }));
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p) => (
        <ConfettiItem key={`confetti-${p.id}`} particle={p} />
      ))}
    </View>
  );
}

export function WorkoutCompletionModal({
  visible,
  onClose,
  workoutName,
  durationSeconds,
}: WorkoutCompletionModalProps) {
  const cardRef = useRef<React.ElementRef<typeof View>>(null);
  const [isSharing, setIsSharing] = useState(false);

  // Seleciona uma frase motivacional aleatória
  const [randomQuote] = useState(() => {
    const index = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
    return MOTIVATIONAL_QUOTES[index];
  });

  // Data atual formatada (ex: 31 de Out, 2026)
  const formattedDate = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  async function handleShare() {
    try {
      setIsSharing(true);

      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert("Erro", "O compartilhamento não está disponível neste dispositivo.");
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Compartilhar Treino Concluído',
        UTI: 'public.png',
      });
    } catch (error) {
      console.error("Erro ao gerar imagem do treino:", error);
      Alert.alert("Erro", "Não foi possível gerar a imagem para compartilhamento.");
    } finally {
      setIsSharing(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      {/* OVERLAY DE FUNDO ESCURO */}
      <View style={styles.overlay}>

        {/* 🟢 CONFETES ANIMADOS NATIVOS AO FUNDO DO MODAL */}
        {visible && <GreenConfettiParticles />}

        {/* BOTÃO DE FECHAR (X) POSICIONADO NO CANTO SUPERIOR */}
        <TouchableOpacity
          onPress={onClose}
          activeOpacity={0.7}
          style={styles.closeButton}
        >
          <X size={20} color="#FFFFFF" weight="bold" />
        </TouchableOpacity>

        <View style={styles.contentContainer}>
          {/* =================================================================== */}
          {/* CARD ESTILO STRAVA (APENAS ESTE BLOCO É EXPORTADO NA FOTO) */}
          {/* =================================================================== */}
          <View
            ref={cardRef}
            collapsable={false}
            style={styles.card}
          >
            {/* 1. CABEÇALHO DO CARD (BRANDING & LOGO) */}
            <View className="flex-row items-center justify-between mb-4 border-b border-zinc-800/80 pb-3">
              <View className="flex-row items-center gap-2.5">
                <Image
                  source={require('@/assets/logo-treino-pesado-icon.png')}
                  style={{ width: 34, height: 34, borderRadius: 8 }}
                  contentFit="contain"
                />
                <View>
                  <Text className="text-white font-outfit-extrabold text-base tracking-wide">
                    TREINO PESADO
                  </Text>
                  <Text className="text-zinc-400 font-sans-medium text-[10px]">
                    {formattedDate}
                  </Text>
                </View>
              </View>

              <View className="bg-[#59C83A]/15 px-3 py-1 rounded-full border border-[#59C83A]/40 flex-row items-center gap-1">
                <Trophy size={12} color="#59C83A" weight="bold" />
                <Text className="text-[#59C83A] font-sans-bold text-[10px] uppercase tracking-wider">
                  Concluído
                </Text>
              </View>
            </View>

            {/* 2. TÍTULO DO TREINO */}
            <Text className="text-zinc-400 font-sans-bold text-[10px] uppercase tracking-widest mb-1 text-center">
              Treino Finalizado
            </Text>
            <Text className="text-white font-outfit-extrabold text-2xl mb-5 text-center" numberOfLines={2}>
              {workoutName}
            </Text>

            {/* 3. BLOCO DE TEMPO CENTRALIZADO */}
            <View className="bg-zinc-900/90 p-5 rounded-2xl border border-zinc-800 mb-5 items-center justify-center">
              <View className="flex-row items-center gap-1.5 mb-1.5">
                <Clock size={18} color="#59C83A" weight="bold" />
                <Text className="text-zinc-400 font-sans-bold text-xs uppercase tracking-wider">
                  Tempo de Treino
                </Text>
              </View>
              <Text className="text-white font-outfit-extrabold text-3xl">
                {formatDuration(durationSeconds)}
              </Text>
            </View>

            {/* 4. FRASE DE INCENTIVO */}
            <View className="bg-[#59C83A]/10 p-3.5 rounded-xl border border-[#59C83A]/20">
              <Text className="text-[#59C83A] font-sans-medium text-xs text-center italic">
                "{randomQuote}"
              </Text>
            </View>
          </View>

          {/* =================================================================== */}
          {/* BOTÕES DE AÇÃO (FORA DA ÁREA DA FOTO) */}
          {/* =================================================================== */}
          <View className="w-full mt-4 gap-3">
            <TouchableOpacity
              onPress={handleShare}
              disabled={isSharing}
              activeOpacity={0.85}
              className="bg-[#59C83A] py-4 rounded-2xl flex-row justify-center items-center shadow-lg gap-2"
            >
              {isSharing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <ShareNetwork size={20} color="#FFFFFF" weight="bold" />
                  <Text className="text-white font-sans-bold text-sm">
                    Compartilhar nos Stories
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.7}
              className="bg-zinc-800 py-3.5 rounded-2xl justify-center items-center border border-zinc-700"
            >
              <Text className="text-zinc-300 font-sans-bold text-xs">
                Concluir e Voltar
              </Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.90)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#27272a',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
    borderWidth: 1,
    borderColor: '#3f3f46',
  },
  contentContainer: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    zIndex: 10,
  },
  card: {
    width: '100%',
    backgroundColor: '#121214',
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    borderColor: 'rgba(89, 200, 58, 0.4)',
    position: 'relative',
    overflow: 'hidden',
  },
});