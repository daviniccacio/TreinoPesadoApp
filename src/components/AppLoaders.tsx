// ============================================================================
// DOCUMENTAÇÃO: MÓDULO CENTRAL DE CARREGAMENTOS (APP LOADERS)
// ============================================================================
// Reúne todos os componentes de carregamento do Treino Pesado num único local.
// Contém:
// 1. AppEntranceLoading: Splash Screen com Logo HD e barra verídica.
// 2. AuthLoadingOverlay: Modal sobreposto bloqueante para telas de Auth.
// ============================================================================

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ImageSourcePropType,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { MotiView, MotiText } from 'moti';
import { LockSimple } from 'phosphor-react-native';
import { useTheme } from '../context/ThemeContext';

// ============================================================================
// 1. CARREGAMENTO DE ENTRADA / SPLASH SCREEN (LOGO HD + BARRA DE PROGRESSO)
// ============================================================================
interface AppEntranceLoadingProps {
  isReady?: boolean;
  onFinishLoading?: () => void;
  imageSource?: ImageSourcePropType;
  size?: number;
}

export function AppEntranceLoading({
  isReady = false,
  onFinishLoading,
  imageSource,
  size = 220,
}: AppEntranceLoadingProps) {
  const { isDark } = useTheme();
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Iniciando o Treino Pesado App...');

  const logoImage = imageSource || require('../assets/logo-treino-pesado-icon.png');

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (isReady) {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return Math.min(100, prev + 10);
        } else {
          if (prev >= 90) return 90;
          const remaining = 90 - prev;
          const step = Math.max(0.5, remaining * 0.08);
          return Math.min(90, prev + step);
        }
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isReady]);

  useEffect(() => {
    if (Math.round(progress) >= 100 && onFinishLoading) {
      const timeout = setTimeout(() => {
        onFinishLoading();
      }, 200);
      return () => clearTimeout(timeout);
    }
  }, [progress, onFinishLoading]);

  useEffect(() => {
    const currentProgress = Math.round(progress);
    if (currentProgress < 30) {
      setStatusMessage('Iniciando o Treino Pesado App...');
    } else if (currentProgress < 65) {
      setStatusMessage('Verificando sessão de usuário...');
    } else if (currentProgress < 95) {
      setStatusMessage('Carregando fichas e configurações...');
    } else {
      setStatusMessage('Tudo pronto!');
    }
  }, [progress]);

  const displayProgress = Math.min(100, Math.round(progress));

  return (
    <View
      className={`flex-1 justify-center items-center px-8 ${
        isDark ? 'bg-[#09090b]' : 'bg-[#f8f9fa]'
      }`}
    >
      <MotiView
        from={{ scale: 0.7, opacity: 0.15 }}
        animate={{ scale: 1.25, opacity: 0.35 }}
        transition={{
          type: 'timing',
          duration: 1200,
          loop: true,
          repeatReverse: true,
        }}
        className="absolute w-60 h-60 rounded-full bg-[#38E538]/20"
      />

      <MotiView
        from={{ scale: 0.93, opacity: 0.85 }}
        animate={{ scale: 1.05, opacity: 1 }}
        transition={{
          type: 'timing',
          duration: 1000,
          loop: true,
          repeatReverse: true,
        }}
        className="items-center justify-center mb-8"
      >
        <Image
          source={logoImage}
          style={{ width: size, height: size }}
          resizeMode="contain"
        />
      </MotiView>

      <View
        className={`w-1/2 h-2.5 rounded-full overflow-hidden mb-2 border ${
          isDark
            ? 'bg-zinc-800 border-zinc-700'
            : 'bg-zinc-200 border-zinc-300'
        }`}
      >
        <MotiView
          animate={{ width: `${displayProgress}%` }}
          transition={{ type: 'timing', duration: 100 }}
          style={{ backgroundColor: '#38E538' }}
          className="h-full rounded-full"
        />
      </View>

      <View className="w-1/2 flex-row justify-center items-center px-0.5">
        <MotiText
          key={statusMessage}
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`text-[10px] font-sans-medium ${
            isDark ? 'text-zinc-400' : 'text-[#71717a]'
          }`}
        >
          {statusMessage}
        </MotiText>
      </View>
    </View>
  );
}

// ============================================================================
// 2. OVERLAY DE AUTENTICAÇÃO E TRANSIÇÃO (AUTH LOADING OVERLAY)
// ============================================================================
interface AuthLoadingOverlayProps {
  /**
   * Controla se o modal está visível durante a requisição.
   */
  visible: boolean;
  /**
   * Mensagem principal exibida no card (ex: "Acessando conta...").
   * Default: "Validando credenciais..."
   */
  message?: string;
}

export function AuthLoadingOverlay({
  visible,
  message = 'Validando credenciais...',
}: AuthLoadingOverlayProps) {
  const { isDark } = useTheme();

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible}>
      {/* 1. FUNDO ESCURO SEMI-TRANSPARENTE BLOQUEANTE */}
      <View className="flex-1 bg-black/60 justify-center items-center px-6">
        {/* 2. CARTÃO CENTRAL ANIMADO VIA MOTI */}
        <MotiView
          from={{ opacity: 0, scale: 0.85, translateY: 10 }}
          animate={{ opacity: 1, scale: 1, translateY: 0 }}
          transition={{
            type: 'spring',
            damping: 18,
            stiffness: 200,
          }}
          className={`w-full max-w-xs p-6 rounded-3xl border items-center shadow-2xl ${
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-[#e2dfe1]'
          }`}
        >
          {/* 3. ÍCONE DE CADEADO COM BRILHO VERDE PULSANTE */}
          <MotiView
            from={{ scale: 0.9, opacity: 0.7 }}
            animate={{ scale: 1.1, opacity: 1 }}
            transition={{
              type: 'timing',
              duration: 800,
              loop: true,
              repeatReverse: true,
            }}
            className="w-16 h-16 rounded-2xl bg-[#38E538]/10 border border-[#38E538]/30 items-center justify-center mb-4"
          >
            <LockSimple size={32} color="#38E538" weight="bold" />
          </MotiView>

          {/* 4. SPINNER DE APOIO DA COR PRINCIPAL */}
          <ActivityIndicator size="small" color="#38E538" className="mb-3" />

          {/* 5. TEXTO DE MENSAGEM DINÂMICA */}
          <Text
            className={`text-sm font-sans-bold text-center ${
              isDark ? 'text-white' : 'text-[#1b1b1d]'
            }`}
          >
            {message}
          </Text>

          <Text
            className={`text-xs font-sans-medium text-center mt-1 ${
              isDark ? 'text-zinc-400' : 'text-[#71717a]'
            }`}
          >
            Aguarde um momento
          </Text>
        </MotiView>
      </View>
    </Modal>
  );
}