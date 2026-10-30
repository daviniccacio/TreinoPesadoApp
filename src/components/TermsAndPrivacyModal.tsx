// ============================================================================
// DOCUMENTAÇÃO: MODAL DE CONFORMIDADE E LGPD (TERMOS DE USO E PRIVACIDADE)
// ============================================================================
// Modal bloqueante que exige a concordância explícita do utilizador antes
// de liberar o acesso às funcionalidades do Treino Pesado.
// ============================================================================

import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { ShieldCheck, ArrowSquareOut, Check } from 'phosphor-react-native';
import { MotiView } from 'moti';

interface TermsAndPrivacyModalProps {
  visible: boolean;
  onAccept: () => void;
  isDark?: boolean;
}

export function TermsAndPrivacyModal({
  visible,
  onAccept,
  isDark = true,
}: TermsAndPrivacyModalProps) {
  const [accepted, setAccepted] = useState(false);

  const privacyUrl = 'https://politicadeprivacidadetreinopesadoapp.netlify.app/';

  const handleOpenPrivacy = async () => {
    const supported = await Linking.canOpenURL(privacyUrl);
    if (supported) {
      await Linking.openURL(privacyUrl);
    }
  };

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View className="flex-1 bg-black/80 justify-center items-center px-5">
        <MotiView
          from={{ opacity: 0, scale: 0.9, translateY: 15 }}
          animate={{ opacity: 1, scale: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 180 }}
          className={`w-full max-w-md p-6 rounded-3xl border ${
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
          }`}
        >
          {/* ÍCONE DE PRIVACIDADE */}
          <View className="w-14 h-14 rounded-2xl bg-[#59C83A]/10 border border-[#59C83A]/30 items-center justify-center mb-4">
            <ShieldCheck size={30} color="#59C83A" weight="bold" />
          </View>

          <Text
            className={`font-outfit-extrabold text-xl mb-2 ${
              isDark ? 'text-white' : 'text-zinc-900'
            }`}
          >
            Termos de Uso e Privacidade
          </Text>

          <Text
            className={`font-sans-medium text-xs mb-4 leading-5 ${
              isDark ? 'text-zinc-400' : 'text-zinc-600'
            }`}
          >
            Para garantir a segurança dos teus dados e o cumprimento da Lei Geral de Proteção de Dados (LGPD), precisamos do teu aceite antes de continuar.
          </Text>

          {/* BOTÃO PARA LER POLÍTICA */}
          <TouchableOpacity
            onPress={handleOpenPrivacy}
            className={`p-3.5 rounded-2xl border flex-row items-center justify-between mb-5 ${
              isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
            }`}
          >
            <Text className="font-sans-bold text-xs text-[#59C83A]">
              Ler Política de Privacidade Completa
            </Text>
            <ArrowSquareOut size={16} color="#59C83A" />
          </TouchableOpacity>

          {/* CHECKBOX DE ACEITE */}
          <TouchableOpacity
            onPress={() => setAccepted(!accepted)}
            className="flex-row items-center mb-6"
            activeOpacity={0.8}
          >
            <View
              className={`w-6 h-6 rounded-lg border items-center justify-center mr-3 ${
                accepted
                  ? 'bg-[#59C83A] border-[#59C83A]'
                  : isDark
                  ? 'border-zinc-700 bg-zinc-800'
                  : 'border-zinc-300 bg-zinc-100'
              }`}
            >
              {accepted && <Check size={16} color="#ffffff" weight="bold" />}
            </View>
            <Text
              className={`font-sans-medium text-xs flex-1 ${
                isDark ? 'text-zinc-300' : 'text-zinc-700'
              }`}
            >
              Li e concordo com os Termos de Uso e a Política de Privacidade.
            </Text>
          </TouchableOpacity>

          {/* BOTÃO DE CONTINUAR */}
          <TouchableOpacity
            onPress={onAccept}
            disabled={!accepted}
            style={{
              backgroundColor: accepted ? '#59C83A' : isDark ? '#27272a' : '#e4e4e7',
            }}
            className="py-4 rounded-2xl items-center shadow-md"
          >
            <Text
              className={`font-outfit-bold text-base ${
                accepted ? 'text-white' : 'text-zinc-500'
              }`}
            >
              Concordar e Continuar
            </Text>
          </TouchableOpacity>
        </MotiView>
      </View>
    </Modal>
  );
}