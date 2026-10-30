// ============================================================================
// DOCUMENTAÇÃO: COMPONENTE BASE DE SKELETON LOADING
// ============================================================================
// Descrição: Bloco de conteúdo animado reutilizável com suporte a modo claro/escuro.
// ============================================================================

import React from 'react';
import { DimensionValue, ViewProps } from 'react-native';
import { MotiView } from 'moti';

interface SkeletonProps extends ViewProps {
  /** Largura do bloco (pode ser número em pixels ou porcentagem ex: "100%", 120) */
  width?: DimensionValue;
  /** Altura do bloco em pixels */
  height?: number;
  /** Raio de arredondamento das bordas */
  borderRadius?: number;
  /** Classes adicionais do Tailwind/NativeWind */
  className?: string;
}

export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = 8,
  className = '',
  style,
  ...rest
}: SkeletonProps) {
  return (
    <MotiView
      from={{ opacity: 0.3 }}
      animate={{ opacity: 0.8 }}
      transition={{
        type: 'timing',
        duration: 800,
        loop: true,
        repeatReverse: true,
      } as any}
      style={[
        {
          width,
          height,
          borderRadius,
        },
        style,
      ]}
      className={`bg-[#e2dfe1] dark:bg-zinc-800 ${className}`}
      {...rest}
    />
  );
}