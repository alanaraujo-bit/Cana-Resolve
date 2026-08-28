import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  clearStoredSession,
  hasCompletedOnboarding,
  markOnboardingCompleted,
  readStoredSession,
  resetOnboarding,
} from './storage';

/**
 * O estado de entrada do produto, em um lugar só.
 *
 *   carregando → primeira-vez (onboarding) → sem-sessão (login) → autenticado
 *
 * Os papéis já existem aqui porque o morador virá depois: quem decide para
 * onde mandar quem entrou é esta máquina, não a tela.
 */
export type AccountRole = 'profissional' | 'morador';

export type Account = {
  id: string;
  nome: string;
  papel: AccountRole;
  /**
   * De onde esta sessão veio. `servidor` é o único valor possível em produção;
   * `desenvolvimento` só nasce do atalho da tela de entrar, que existe apenas
   * sob `__DEV__` e some do pacote publicado.
   */
  origem: 'servidor' | 'desenvolvimento';
};

export type SessionStage = 'carregando' | 'primeira-vez' | 'sem-sessao' | 'autenticado';

type SessionValue = {
  stage: SessionStage;
  account: Account | null;
  completeOnboarding: () => Promise<void>;
  signIn: (account: Account) => Promise<void>;
  signOut: () => Promise<void>;
  /** Só para desenvolvimento: volta o aplicativo ao primeiro acesso. */
  replayOnboarding: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [done, stored] = await Promise.all([hasCompletedOnboarding(), readStoredSession()]);
      if (!alive) return;
      setOnboarded(done);
      // A sessão guardada ainda não é validada contra servidor nenhum: enquanto
      // não existe backend de autenticação, ninguém entra sem autenticar.
      if (stored) await clearStoredSession();
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const completeOnboarding = useCallback(async () => {
    setOnboarded(true);
    await markOnboardingCompleted();
  }, []);

  const signIn = useCallback(async (next: Account) => {
    setAccount(next);
  }, []);

  const signOut = useCallback(async () => {
    setAccount(null);
    await clearStoredSession();
  }, []);

  const replayOnboarding = useCallback(async () => {
    await resetOnboarding();
    setOnboarded(false);
  }, []);

  const value = useMemo<SessionValue>(() => {
    const stage: SessionStage = !ready
      ? 'carregando'
      : account
        ? 'autenticado'
        : onboarded
          ? 'sem-sessao'
          : 'primeira-vez';
    return { stage, account, completeOnboarding, signIn, signOut, replayOnboarding };
  }, [ready, account, onboarded, completeOnboarding, signIn, signOut, replayOnboarding]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession precisa estar dentro de <SessionProvider>.');
  return value;
}
