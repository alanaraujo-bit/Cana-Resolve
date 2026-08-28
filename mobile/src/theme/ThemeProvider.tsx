import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AccessibilityInfo, Platform, useColorScheme } from 'react-native';

import { gravarPreferenciaDeTema, type ThemePreference } from './preferencia';
import { palettes, type ColorScheme, type Palette } from './tokens';

export type { ThemePreference };

type ThemeValue = {
  scheme: ColorScheme;
  isDark: boolean;
  colors: Palette;
  /**
   * A escolha explícita: Sistema, Claro ou Escuro.
   *
   * "Sistema" é o padrão e **continua sendo uma preferência** depois de
   * escolhido — não é o tema atual congelado. Quem escolhe Sistema e troca o
   * aparelho para escuro à noite vê o aplicativo acompanhar; é por isso que o
   * que se grava é a palavra, e nunca a cor resultante.
   */
  preference: ThemePreference;
  /** Troca e persiste. A tela responde no mesmo quadro; o disco vem depois. */
  setPreference: (next: ThemePreference) => void;
  /** Acessibilidade do sistema, lida uma vez e observada. */
  reduceMotion: boolean;
  reduceTransparency: boolean;
};

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({
  children,
  /**
   * A preferência lida do disco antes do primeiro quadro. Quem espera por ela
   * é a raiz do aplicativo — ver `theme/preferencia.ts` para o porquê.
   */
  preferenciaInicial = 'system',
}: {
  children: ReactNode;
  preferenciaInicial?: ThemePreference;
}) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>(preferenciaInicial);
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

  const setPreference = useCallback((next: ThemePreference) => {
    // A tela muda agora; gravar é consequência, não pré-requisito. Trocar o
    // tema não pode esperar o disco.
    setPreferenceState(next);
    void gravarPreferenciaDeTema(next);
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
  }, [preference, setPreference, system, reduceMotion, reduceTransparency]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme precisa estar dentro de <ThemeProvider>.');
  return value;
}
