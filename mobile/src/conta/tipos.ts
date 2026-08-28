/**
 * A Conta — e o que ela **não** é.
 *
 * O Perfil Profissional (Fase 04) responde "como eu apareço para o morador":
 * nome comercial, serviços, área atendida, portfólio, contatos públicos. A
 * Conta responde outra pergunta, e só ela: **como eu entro aqui, e o que
 * protege isso**. E-mail de acesso, método de autenticação, senha, sessão.
 *
 * As duas se relacionam — a mesma pessoa — mas não se misturam. O e-mail de
 * acesso não é o e-mail comercial; trocar um não troca o outro. Foi por isso
 * que este módulo nasceu separado de `src/perfil/`, e não como mais uma seção
 * dele.
 *
 * Nada aqui guarda estado de autenticação: a sessão tem uma fonte só, que é o
 * `SessionProvider` (§84 da Fase 05). Este arquivo **deriva** — ele lê o que a
 * sessão sabe e o que o aparelho oferece, e responde perguntas de tela.
 */

import { Platform } from 'react-native';

import type { Account } from '@/session/SessionProvider';

/* -------------------------------------------------------------------------- */
/*  Métodos de entrada                                                        */
/* -------------------------------------------------------------------------- */

export type MetodoId = 'senha' | 'google' | 'apple';

/**
 * Em que pé está cada forma de entrar.
 *
 * `conectado` é o estado que mais exige honestidade: ele só pode aparecer
 * quando entrar por ali realmente funciona. Google e Apple hoje **não**
 * funcionam — a API responde 501 dizendo isso —, então nenhum dos dois pode
 * dizer "Conectado" só porque o botão existe na tela de entrada (§11 e §12).
 */
export type EstadoDoMetodo =
  /** É por aqui que esta conta entra hoje. */
  | 'em-uso'
  /** Existe, funciona, e esta conta não usa. Nenhum caso hoje. */
  | 'disponivel'
  /** Ainda não foi ligado no servidor. Ver BLOCKERS.md. */
  | 'nao-ligado'
  /** Este aparelho não oferece. Ex.: Apple fora do iOS. */
  | 'indisponivel';

export type Metodo = {
  id: MetodoId;
  rotulo: string;
  estado: EstadoDoMetodo;
  /** Uma frase que explica o estado. Nunca vocabulário de servidor. */
  situacao: string;
};

export const rotuloDoMetodo: Record<MetodoId, string> = {
  senha: 'E-mail e senha',
  google: 'Google',
  apple: 'Apple',
};

/**
 * Como esta conta entra — a resposta que a tela de Conta precisa dar.
 *
 * **Por que a senha é sempre a que está em uso.** Hoje existe um caminho só
 * até uma sessão: e-mail e senha contra a API. Google e Apple param no
 * servidor, que recusa os dois com todas as letras. Então quem tem sessão
 * entrou por senha — não é suposição, é a única porta aberta.
 *
 * No dia em que Google ou Apple forem ligados, isso deixa de ser dedução e o
 * servidor precisa dizer por onde a conta entra. O lugar de mudar é aqui, e o
 * contrato está em `AJUSTES.md`.
 */
export function metodosDaConta(conta: Account | null, appleNoAparelho: boolean): Metodo[] {
  const entrouDeVerdade = conta?.origem === 'servidor';

  const metodos: Metodo[] = [
    {
      id: 'senha',
      rotulo: rotuloDoMetodo.senha,
      estado: entrouDeVerdade ? 'em-uso' : 'indisponivel',
      situacao: entrouDeVerdade
        ? 'É assim que você entra hoje'
        : 'Sessão de desenvolvimento, sem autenticação',
    },
    {
      id: 'google',
      rotulo: rotuloDoMetodo.google,
      // Ter os identificadores no aparelho não liga nada: entrar pelo Google
      // depende do outro lado, e o servidor ainda recusa. Enquanto recusar, a
      // única palavra honesta é esta.
      estado: 'nao-ligado',
      situacao: 'Ainda não disponível para entrar',
    },
  ];

  // No Android não existe motivo para mostrar uma linha da Apple que nunca vai
  // fazer nada ali. Simetria não é utilidade (§12).
  if (Platform.OS === 'ios' && appleNoAparelho) {
    metodos.push({
      id: 'apple',
      rotulo: rotuloDoMetodo.apple,
      estado: 'nao-ligado',
      situacao: 'Ainda não disponível para entrar',
    });
  }

  return metodos;
}

/** Esta conta tem senha local para trocar? */
export function temSenhaLocal(conta: Account | null): boolean {
  // Mesmo raciocínio de `metodosDaConta`: a única porta aberta é a senha.
  // Quando houver conta que entrou só por Google ou Apple, a tela de Segurança
  // deixa de oferecer "Alterar senha" — e é este `false` que a esconde (§14).
  return conta?.origem === 'servidor';
}

/* -------------------------------------------------------------------------- */
/*  Sessão                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * O que se pode dizer sobre a sessão sem inventar.
 *
 * Não existe central de dispositivos, e não vai existir uma falsa: o servidor
 * guarda as sessões, mas não há rota para listá-las. O que a tela mostra é o
 * aparelho de agora e o estado da confirmação — nada além (§16, §17).
 */
export type EstadoDaSessao = 'confirmada' | 'confirmando' | 'sem-confirmacao' | 'local';

export function estadoDaSessao(opcoes: {
  conta: Account | null;
  confirmando: boolean;
  semConfirmacao: boolean;
}): EstadoDaSessao {
  if (opcoes.conta?.origem !== 'servidor') return 'local';
  if (opcoes.confirmando) return 'confirmando';
  if (opcoes.semConfirmacao) return 'sem-confirmacao';
  return 'confirmada';
}

export const frasesDaSessao: Record<EstadoDaSessao, string> = {
  confirmada: 'Sessão ativa neste aparelho',
  confirmando: 'Conferindo sua sessão…',
  'sem-confirmacao': 'Não deu para conferir sua sessão agora — sem conexão',
  local: 'Sessão de desenvolvimento, sem autenticação',
};

/** O aparelho em uso, dito como gente. */
export function aparelhoAtual(): string {
  if (Platform.OS === 'ios') return 'iPhone';
  if (Platform.OS === 'android') return 'Android';
  return 'Navegador';
}
