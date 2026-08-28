import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { confirmarSessao, encerrarSessao } from '@/auth/service';
import { revogar as revogarDispositivo } from '@/notificacoes/registro';
import { limparDadosDaConta } from './limpeza';
import {
  clearStoredSession,
  hasCompletedOnboarding,
  markOnboardingCompleted,
  readStoredSession,
  resetOnboarding,
  writeStoredSession,
} from './storage';

/**
 * O estado de entrada do produto, em um lugar só.
 *
 *   carregando → primeira-vez (onboarding) → sem-sessão (entrar) → autenticado
 *
 * Os papéis já existem aqui porque o morador virá depois: quem decide para
 * onde mandar quem entrou é esta máquina, não a tela.
 *
 * **A sessão agora sobrevive ao fechamento do aplicativo.** Até a Fase 04 o
 * token voltava da API e era jogado fora; quem fechasse entrava de novo. O
 * caminho hoje é: abrir → restaurar a credencial do `SecureStore` → **perguntar
 * ao servidor se ela ainda vale** → seguir. As três respostas dessa pergunta
 * estão em `confirmarSessao`, e a do meio — "não vale mais" — é o único caso em
 * que alguém é mandado de volta ao login.
 *
 * Uma regra que vale para o aplicativo inteiro (§84 da Fase 05): **este é o
 * único estado de autenticação**. Nenhuma tela guarda o próprio "estou logado",
 * e nenhuma tela redireciona por conta própria ao receber um 401 — ela avisa
 * aqui, e o porteiro em `app/_layout.tsx` faz a única transição que existe. É o
 * que evita o pingue-pongue entre login e Início.
 */
export type AccountRole = 'profissional' | 'morador';

export type Account = {
  id: string;
  nome: string;
  /**
   * O e-mail de acesso, como o servidor o conhece. `null` quando a conta não
   * tem e-mail cadastrado — possível no banco, e por isso possível aqui.
   *
   * Não é o e-mail comercial do Perfil: aquele é vitrine, este é entrada.
   */
  email: string | null;
  papel: AccountRole;
  /**
   * De onde esta sessão veio. `servidor` é o único valor possível em produção;
   * `desenvolvimento` só nasce do atalho da tela de entrar, que existe apenas
   * sob `__DEV__` e some do pacote publicado.
   */
  origem: 'servidor' | 'desenvolvimento';
};

export type SessionStage = 'carregando' | 'primeira-vez' | 'sem-sessao' | 'autenticado';

/** Por que a última sessão terminou. A tela de entrar consome uma vez e some. */
export type MotivoDeSaida = 'expirada' | null;

type SessionValue = {
  stage: SessionStage;
  account: Account | null;
  /**
   * A credencial da sessão, para quem precisa falar com a API em nome dela.
   *
   * Fica aqui e não em cada módulo porque só existe uma sessão. Nenhuma tela
   * grava isto em lugar nenhum: o token vive na memória e no `SecureStore`.
   */
  token: string | null;
  /** `true` enquanto a sessão restaurada ainda está sendo conferida. */
  confirmando: boolean;
  /**
   * A confirmação da sessão não pôde ser feita (sem internet, servidor fora).
   * A sessão continua valendo; a tela de Conta usa isto para não afirmar o que
   * não sabe.
   */
  semConfirmacao: boolean;
  motivoDeSaida: MotivoDeSaida;
  limparMotivoDeSaida: () => void;

  completeOnboarding: () => Promise<void>;
  signIn: (account: Account, token?: string) => Promise<void>;
  signOut: () => Promise<void>;
  /**
   * O servidor recusou a credencial no meio do caminho. Uma transição só, para
   * o aplicativo inteiro — nunca um `router.replace` dentro de uma tela.
   */
  sessaoExpirou: () => Promise<void>;
  /** Só para desenvolvimento: volta o aplicativo ao primeiro acesso. */
  replayOnboarding: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [semConfirmacao, setSemConfirmacao] = useState(false);
  const [motivoDeSaida, setMotivoDeSaida] = useState<MotivoDeSaida>(null);

  // O token mais recente, para quem sai não depender do estado que a tela viu.
  const tokenRef = useRef<string | null>(null);
  tokenRef.current = token;

  /** O caminho único de saída — usado pelo logout e pela sessão expirada. */
  const encerrar = useCallback(async (motivo: MotivoDeSaida) => {
    setAccount(null);
    setToken(null);
    setConfirmando(false);
    setSemConfirmacao(false);
    setMotivoDeSaida(motivo);
    // A credencial e os dados da conta. `limparDadosDaConta` esvazia também as
    // cópias em memória — apagar só o disco não bastava, e o parceiro seguinte
    // encontraria o perfil do anterior. Ver `limpeza.ts`.
    await Promise.all([clearStoredSession(), limparDadosDaConta()]);
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      const [done, guardada] = await Promise.all([hasCompletedOnboarding(), readStoredSession()]);
      if (!alive) return;

      setOnboarded(done);

      if (!guardada) {
        setReady(true);
        return;
      }

      // Entra com o retrato guardado — a alternativa seria uma tela vazia
      // esperando a rede — e confere logo em seguida.
      setAccount(guardada.conta);
      setToken(guardada.token);
      setConfirmando(true);
      setReady(true);

      try {
        const fresca = await confirmarSessao(guardada.token);
        if (!alive) return;

        if (!fresca) {
          await encerrar('expirada');
          return;
        }

        setAccount(fresca);
        setSemConfirmacao(false);
        // O nome e o e-mail podem ter mudado no servidor desde a última vez.
        await writeStoredSession({ token: guardada.token, conta: fresca });
      } catch {
        // Não deu para perguntar. A sessão continua: ficar sem sinal não pode
        // custar o login de ninguém.
        if (alive) setSemConfirmacao(true);
      } finally {
        if (alive) setConfirmando(false);
      }
    })();

    return () => {
      alive = false;
    };
    // Roda uma vez, na abertura; `encerrar` é estável.
  }, [encerrar]);

  const completeOnboarding = useCallback(async () => {
    setOnboarded(true);
    await markOnboardingCompleted();
  }, []);

  const signIn = useCallback(async (next: Account, credencial?: string) => {
    setAccount(next);
    setToken(credencial ?? null);
    setMotivoDeSaida(null);
    setSemConfirmacao(false);
    // Sem token não há o que guardar: é o atalho de desenvolvimento, que não
    // autenticou ninguém e não deve sobreviver ao fechamento do aplicativo.
    if (credencial) await writeStoredSession({ token: credencial, conta: next });
  }, []);

  const signOut = useCallback(async () => {
    // Avisa o servidor antes de esquecer o token — depois não haveria com o que
    // avisar. Não espera dar certo: sair é imediato para quem pediu.
    const atual = tokenRef.current;
    if (atual) {
      /**
       * **A ordem aqui é a funcionalidade.**
       *
       * Primeiro o aparelho para de receber, e só depois a sessão morre. O
       * servidor identifica quem pede pela credencial: com a sessão já
       * apagada, a revogação leva 401 e a linha fica viva.
       *
       * Isso foi medido, não deduzido. Disparar os dois juntos — que era o que
       * este bloco fazia — dava `204` para a sessão e `401` para o aparelho, e
       * o telefone continuava recebendo "Nova oportunidade · Elétrica ·
       * Centro" de um parceiro que já não estava ali. É o §57, o parágrafo que
       * a especificação chama de crítico, e ele falhava em silêncio.
       *
       * Esperar custa: sair deixa de ser instantâneo. Por isso a revogação tem
       * um limite curto (3s, em `registro.ts`) e a tela já mostra o botão
       * carregando. Se estourar, sair acontece do mesmo jeito — e a proteção
       * que resta é a de sempre: o aviso não carrega dado privado (§10), abrir
       * a oportunidade exige uma sessão que já não existe (§19), e a próxima
       * entrada neste aparelho reaponta o registro (§58).
       */
      await revogarDispositivo(atual);
      // A sessão, depois. Esta não é esperada: o servidor já tem o pedido, e
      // quem saiu não precisa ver a confirmação.
      void encerrarSessao(atual);
    }
    await encerrar(null);
  }, [encerrar]);

  const sessaoExpirou = useCallback(async () => {
    await encerrar('expirada');
  }, [encerrar]);

  const limparMotivoDeSaida = useCallback(() => setMotivoDeSaida(null), []);

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
    return {
      stage,
      account,
      token,
      confirmando,
      semConfirmacao,
      motivoDeSaida,
      limparMotivoDeSaida,
      completeOnboarding,
      signIn,
      signOut,
      sessaoExpirou,
      replayOnboarding,
    };
  }, [
    ready,
    account,
    token,
    confirmando,
    semConfirmacao,
    motivoDeSaida,
    limparMotivoDeSaida,
    onboarded,
    completeOnboarding,
    signIn,
    signOut,
    sessaoExpirou,
    replayOnboarding,
  ]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession precisa estar dentro de <SessionProvider>.');
  return value;
}
