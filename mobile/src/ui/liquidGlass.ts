/**
 * Liquid Glass do iOS 26, quando ele existe de verdade.
 *
 * O módulo é resolvido em tempo de execução: se o binário atual (Expo Go, uma
 * build antiga, Android) não trouxer o módulo nativo, nada disso quebra — a
 * disponibilidade vira `false` e a interface usa o fallback.
 */
import { Platform } from 'react-native';
import type { ComponentType } from 'react';
import type { ViewProps } from 'react-native';

export type GlassStyle = 'clear' | 'regular' | 'none';

export type NativeGlassViewProps = ViewProps & {
  glassEffectStyle?: GlassStyle;
  tintColor?: string;
  isInteractive?: boolean;
  colorScheme?: 'auto' | 'light' | 'dark';
};

type GlassModule = {
  GlassView: ComponentType<NativeGlassViewProps>;
  isLiquidGlassAvailable: () => boolean;
};

let cached: GlassModule | null | undefined;

function loadModule(): GlassModule | null {
  if (cached !== undefined) return cached;
  if (Platform.OS !== 'ios') {
    cached = null;
    return cached;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-glass-effect') as Partial<GlassModule> | undefined;
    cached =
      mod && mod.GlassView && typeof mod.isLiquidGlassAvailable === 'function'
        ? (mod as GlassModule)
        : null;
  } catch {
    cached = null;
  }
  return cached;
}

let availability: boolean | undefined;

/** `true` só quando a API nativa responde no aparelho — nunca por suposição. */
export function liquidGlassAvailable(): boolean {
  if (availability !== undefined) return availability;
  const mod = loadModule();
  try {
    availability = mod ? mod.isLiquidGlassAvailable() === true : false;
  } catch {
    availability = false;
  }
  return availability;
}

export function getGlassView(): ComponentType<NativeGlassViewProps> | null {
  return liquidGlassAvailable() ? (loadModule()?.GlassView ?? null) : null;
}
