// ============================================================================
// DOCUMENTAÇÃO: BANNER DE STATUS DE CONEXÃO COM A INTERNET (OFFLINE BANNER)
// ============================================================================
// Monitora a conexão do dispositivo em tempo real e exibe um aviso animado
// no topo da tela sempre que o usuário perder o acesso à rede.
// ============================================================================

import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { MotiView } from 'moti';
import { WifiSlash, CheckCircle } from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function OfflineBanner() {
  const netInfo = useNetInfo();
  const insets = useSafeAreaInsets();

  const [wasOffline, setWasOffline] = useState(false);
  const [showRestored, setShowRestored] = useState(false);

  const isOffline = netInfo.isConnected === false;

  useEffect(() => {
    if (isOffline) {
      setWasOffline(true);
    } else if (wasOffline && netInfo.isConnected) {
      // Quando a conexão volta após estar offline, exibe mensagem verde por 2.5s
      setShowRestored(true);
      const timer = setTimeout(() => {
        setShowRestored(false);
        setWasOffline(false);
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [isOffline, netInfo.isConnected, wasOffline]);

  // Se estiver conectado normalmente e não estiver mostrando aviso de "restabelecido", esconde o banner
  if (!isOffline && !showRestored) {
    return null;
  }

  const safeTopPadding = Math.max(insets?.top || 0, 12);

  return (
    <MotiView
      from={{ translateY: -100, opacity: 0 }}
      animate={{ translateY: 0, opacity: 1 }}
      exit={{ translateY: -100, opacity: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 180 }}
      style={{
        paddingTop: safeTopPadding + 6,
        backgroundColor: isOffline ? '#ef4444' : '#59C83A',
      }}
      className="absolute top-0 left-0 right-0 z-50 pb-3 px-5 flex-row items-center justify-center shadow-lg"
    >
      {isOffline ? (
        <>
          <WifiSlash size={18} color="#ffffff" weight="bold" />
          <Text className="font-sans-bold text-white text-xs ml-2">
            Sem conexão com a internet. Verifique sua rede.
          </Text>
        </>
      ) : (
        <>
          <CheckCircle size={18} color="#ffffff" weight="bold" />
          <Text className="font-sans-bold text-white text-xs ml-2">
            Conexão com a internet restabelecida!
          </Text>
        </>
      )}
    </MotiView>
  );
}