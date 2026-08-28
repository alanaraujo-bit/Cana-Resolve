import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Platform, useColorScheme } from 'react-native';

import { palettes, type ColorScheme, type Palette } from './tokens';

export type ThemePreference = 'system' | 'light' | 'dark';

type ThemeValue = {
  scheme: ColorScheme;
  isDark: boolean;
  colors: Palette;
  /** Preferência explícita do usuário. Hoje sempre "system"; a troca manual
   *  entra quando existir tela de ajustes — a fundação já suporta. */
  preference: ThemePreference;
  setPreference: (next: ThemePreference) => void;
  /** Acessibilidade do sistema, lida uma vez e observada. */
  reduceMotion: boolean;
  reduceTransparency: boolean;
};

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>('system');
  const [reduceMotion, setReduceMotion] = useState(false);
  const [reduceTransparency, setReduceTransparency] = useState(false);

  useEffect(() => {
    let alive = true;

    AccessibilityInfo.isReduceMotionEnabled().then((on) => alive && setReduceMotion(on));
    const motionSub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);

    let transparencySub: { remove: () => void } | undefined;
    if (Platform.OS === 'ios') {
      AccessibilityInfo.isReduceTransparencyEnabled().then(
        (on) => alive && setReduceTransparency(on),
      );
      transparencySub = AccessibilityInfo.addEventListener(
        'reduceTransparencyChanged',
        setReduceTransparency,
      );
    }

    return () => {
      alive = false;
      motionSub.remove();
      transparencySub?.remove();
    };
  }, []);

  const value = useMemo<ThemeValue>(() => {
    const scheme: ColorScheme =
      preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
    return {
      scheme,
      isDark: scheme === 'dark',
      colors: palettes[scheme],
      preference,
      setPreference,
      reduceMotion,
      reduceTransparency,
    };
  }, [preference, system, reduceMotion, reduceTransparency]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme precisa estar dentro de <ThemeProvider>.');
  return value;
}
