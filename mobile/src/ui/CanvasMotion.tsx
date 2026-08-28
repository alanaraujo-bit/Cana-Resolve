import { createContext, useContext, type ReactNode } from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';

/**
 * O fundo é um só, vivo entre as telas: o onboarding empurra este valor com o
 * dedo, o login o leva a um repouso. Sem isso, cada tela redesenharia o mesmo
 * fundo do zero e a continuidade se perderia na troca de rota.
 */
const CanvasMotionContext = createContext<SharedValue<number> | null>(null);

export function CanvasMotionProvider({ children }: { children: ReactNode }) {
  const parallax = useSharedValue(0);
  return (
    <CanvasMotionContext.Provider value={parallax}>{children}</CanvasMotionContext.Provider>
  );
}

export function useCanvasParallax(): SharedValue<number> {
  const value = useContext(CanvasMotionContext);
  if (!value) throw new Error('useCanvasParallax precisa estar dentro de <CanvasMotionProvider>.');
  return value;
}
