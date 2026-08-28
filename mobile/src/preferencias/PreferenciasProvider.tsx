/**
 * A fonte única das preferências da conta.
 *
 * Vive acima das abas, junto da carteira, porque a pausa não é assunto só dos
 * Ajustes: a Home precisa dizer que o recebimento está pausado, ou o
 * profissional esquece que pausou e acha que o aplicativo secou (§27 da
 * Fase 05). Uma preferência que só aparece na tela onde foi ligada é uma
 * armadilha.
 *
 * O salvamento é **otimista**: a tela responde no mesmo toque e o disco vem
 * depois. Se o disco recusar, o valor volta e a tela diz o que houve — nunca o
 * contrário, que seria um interruptor que trava meio segundo a cada toque.
 */

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

import type { CategoriaDePreferencia } from '@/notificacoes/tipos';
import { apenasNesteAparelho, lerPreferencias, salvarPreferencias } from './repositorio';
import { preferenciasPadrao, type PreferenciasDaConta } from './tipos';

type Valor = {
  preferencias: PreferenciasDaConta;
  /** `true` até a primeira leitura terminar. Curto: é disco local. */
  carregando: boolean;
  /** `true` quando a escolha ainda não alcança o servidor. A tela informa. */
  somenteNesteAparelho: boolean;
  /**
   * Liga ou desliga a pausa. Devolve `false` quando não deu para gravar — e a
   * tela avisa, em vez de deixar um estado que some na próxima abertura.
   */
  pausarOportunidades: (pausar: boolean) => Promise<boolean>;
  /**
   * Liga ou desliga um tipo de aviso. Mesma disciplina da pausa: otimista, e
   * volta atrás quando o disco recusa.
   *
   * Isto é **preferência**, e não a permissão do sistema — que é lida em
   * `NotificacoesProvider` e nunca confundida com isto (§88).
   */
  definirAviso: (categoria: CategoriaDePreferencia, ligado: boolean) => Promise<boolean>;
};

const Contexto = createContext<Valor | null>(null);

export function PreferenciasProvider({ children }: { children: ReactNode }) {
  const [preferencias, setPreferencias] = useState<PreferenciasDaConta>(preferenciasPadrao);
  const [carregando, setCarregando] = useState(true);

  const atuais = useRef(preferencias);
  atuais.current = preferencias;

  useEffect(() => {
    let alive = true;
    lerPreferencias()
      .then((p) => alive && setPreferencias(p))
      .finally(() => alive && setCarregando(false));
    return () => {
      alive = false;
    };
  }, []);

  const pausarOportunidades = useCallback(async (pausar: boolean) => {
    const anterior = atuais.current;
    const proximo: PreferenciasDaConta = {
      ...anterior,
      oportunidadesPausadas: pausar,
      pausadasEm: pausar ? (anterior.pausadasEm ?? new Date()) : null,
    };

    setPreferencias(proximo);
    try {
      await salvarPreferencias(proximo);
      return true;
    } catch {
      setPreferencias(anterior);
      return false;
    }
  }, []);

  const definirAviso = useCallback(
    async (categoria: CategoriaDePreferencia, ligado: boolean) => {
      const anterior = atuais.current;
      const proximo: PreferenciasDaConta = {
        ...anterior,
        avisos: { ...anterior.avisos, [categoria]: ligado },
      };

      setPreferencias(proximo);
      try {
        await salvarPreferencias(proximo);
        return true;
      } catch {
        setPreferencias(anterior);
        return false;
      }
    },
    [],
  );

  const valor = useMemo<Valor>(
    () => ({
      preferencias,
      carregando,
      somenteNesteAparelho: apenasNesteAparelho(),
      pausarOportunidades,
      definirAviso,
    }),
    [preferencias, carregando, pausarOportunidades, definirAviso],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function usePreferencias(): Valor {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('usePreferencias precisa estar dentro de <PreferenciasProvider>.');
  return valor;
}
