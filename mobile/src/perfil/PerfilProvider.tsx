/**
 * A fonte única de estado do perfil.
 *
 * A tela do perfil, cada tela de edição e a prévia pública leem **daqui**. Não
 * há duas cópias: o que a edição salva, a prévia mostra na mesma hora, sem
 * ninguém avisar ninguém. Quando a API chegar, é o `repositorio` que muda —
 * este arquivo não.
 *
 * Ele vive acima da pilha do Perfil (`app/(app)/perfil/_layout.tsx`), que é o
 * menor lugar que cobre todas as telas do módulo.
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

import { useSession } from '@/session/SessionProvider';
import { registrar } from './analytics';
import { completude, type Completude } from './completude';
import type { Cenario } from './exemplos';
import {
  apenasLocal,
  comoErroDePerfil,
  esquecer,
  lerPerfil,
  salvarPerfil,
  type ErroDePerfil,
} from './repositorio';
import type { Perfil } from './tipos';

export type Situacao = 'carregando' | 'pronto' | 'erro';

type Valor = {
  situacao: Situacao;
  perfil: Perfil | null;
  erro: ErroDePerfil | null;
  atualizando: boolean;
  salvando: boolean;
  /** Recalculada aqui, para nenhuma tela ter a própria conta do que falta. */
  completude: Completude | null;
  /** `true` enquanto o perfil só existe neste aparelho. */
  somenteLocal: boolean;

  atualizar: () => Promise<void>;
  /**
   * Salva **só os campos que mudaram**, aplicados sobre o perfil atual.
   *
   * Receber o perfil inteiro seria mais simples e desfaria trabalho: uma tela
   * aberta há mais tempo mandaria uma cópia velha por cima do que outra seção
   * acabou de salvar. O remendo chega pequeno e só encosta no que mexeu.
   *
   * Erro sobe para a tela decidir o que dizer.
   */
  salvar: (parte: Partial<Perfil>) => Promise<Perfil>;

  /** Só em desenvolvimento: troca o conjunto de exemplos. */
  cenario: Cenario;
  trocarCenario: (c: Cenario) => Promise<void>;
};

const Contexto = createContext<Valor | null>(null);

export function PerfilProvider({ children }: { children: ReactNode }) {
  const { account } = useSession();
  const nomeDaConta = account?.nome ?? '';

  const [cenario, setCenario] = useState<Cenario>('autonomo');
  const [situacao, setSituacao] = useState<Situacao>('carregando');
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [erro, setErro] = useState<ErroDePerfil | null>(null);
  const [atualizando, setAtualizando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Uma resposta de um cenário antigo não pode sobrescrever o atual.
  const cenarioRef = useRef(cenario);
  cenarioRef.current = cenario;

  const carregar = useCallback(
    async (alvo: Cenario, ehAtualizacao: boolean) => {
      if (ehAtualizacao) setAtualizando(true);
      try {
        const lido = await lerPerfil(alvo, nomeDaConta);
        if (cenarioRef.current !== alvo) return;
        setPerfil(lido);
        setErro(null);
        setSituacao('pronto');
      } catch (e) {
        if (cenarioRef.current !== alvo) return;
        setErro(comoErroDePerfil(e));
        // Numa atualização que falhou, o que já estava na tela continua lá.
        setSituacao((s) => (s === 'pronto' && ehAtualizacao ? 'pronto' : 'erro'));
      } finally {
        if (cenarioRef.current === alvo) setAtualizando(false);
      }
    },
    [nomeDaConta],
  );

  useEffect(() => {
    void carregar(cenario, false);
  }, [carregar, cenario]);

  const atualizar = useCallback(async () => {
    await carregar(cenarioRef.current, true);
  }, [carregar]);

  // O perfil mais recente, para o remendo ser aplicado sobre ele — e não sobre
  // o que a tela viu quando abriu.
  const perfilRef = useRef(perfil);
  perfilRef.current = perfil;

  const salvar = useCallback(async (parte: Partial<Perfil>) => {
    const atual = perfilRef.current;
    if (!atual) throw new Error('Não foi possível salvar: o perfil ainda não carregou.');

    setSalvando(true);
    try {
      const salvo = await salvarPerfil({ ...atual, ...parte });
      setPerfil(salvo);
      setErro(null);
      registrar({ nome: 'perfil_salvo' });
      return salvo;
    } finally {
      setSalvando(false);
    }
  }, []);

  const trocarCenario = useCallback(async (c: Cenario) => {
    await esquecer();
    setSituacao('carregando');
    setPerfil(null);
    setCenario(c);
  }, []);

  const valor = useMemo<Valor>(
    () => ({
      situacao,
      perfil,
      erro,
      atualizando,
      salvando,
      completude: perfil ? completude(perfil) : null,
      somenteLocal: apenasLocal(),
      atualizar,
      salvar,
      cenario,
      trocarCenario,
    }),
    [
      situacao,
      perfil,
      erro,
      atualizando,
      salvando,
      atualizar,
      salvar,
      cenario,
      trocarCenario,
    ],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function usePerfil(): Valor {
  const valor = useContext(Contexto);
  if (!valor) {
    throw new Error('usePerfil precisa estar dentro de <PerfilProvider>.');
  }
  return valor;
}
