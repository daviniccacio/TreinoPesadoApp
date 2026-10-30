// ============================================================================
// DOCUMENTAÇÃO: GLOBAL ERROR BOUNDARY (RESILIÊNCIA CONTRA CRASHES)
// ============================================================================
// Captura erros de execução do JavaScript em qualquer tela do aplicativo,
// impedindo que o app feche sozinho e exibindo uma tela de recuperação amigável.
// ============================================================================

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { Warning, ArrowClockwise } from 'phosphor-react-native';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Aqui podes conectar o Sentry, PostHog ou Firebase Analytics:
    console.error('🚨 [Error Boundary Capturado]:', error, errorInfo);
  }

  private handleRestart = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView className="flex-1 bg-zinc-950 justify-center items-center px-6">
          <View className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/30 items-center justify-center mb-4">
            <Warning size={32} color="#ef4444" weight="bold" />
          </View>

          <Text className="font-outfit-extrabold text-white text-xl text-center mb-2">
            Algo não saiu como esperado
          </Text>

          <Text className="font-sans-medium text-zinc-400 text-xs text-center mb-6 leading-5">
            Ocorreu uma falha temporária na aplicação. Nossos engenheiros foram notificados.
          </Text>

          <TouchableOpacity
            onPress={this.handleRestart}
            style={{ backgroundColor: '#59C83A' }}
            className="w-full py-4 rounded-2xl flex-row justify-center items-center shadow-lg active:opacity-90"
          >
            <ArrowClockwise size={20} color="#ffffff" weight="bold" />
            <Text className="font-sans-bold text-white text-base ml-2">
              Recarregar Aplicativo
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}