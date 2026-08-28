/**
 * O que morre quando alguém sai da conta.
 *
 * `chaves.ts` diz **quais** chaves são da conta; este arquivo faz a limpeza
 * acontecer de verdade — e a diferença entre as duas coisas custou um vazamento
 * que passou por tipo, lint e quatro suítes de navegador:
 *
 * > O repositório do perfil guarda uma cópia em memória (`memoria`), e ela é
 * > consultada **antes** do disco. Apagar a chave do `AsyncStorage` no logout
 * > não fazia nada enquanto o aplicativo continuasse aberto: o parceiro
 * > seguinte a entrar no mesmo aparelho abriria o Perfil e encontraria o nome,
 * > o telefone e as fotos do anterior.
 *
 * Daí a regra: **limpar é esvaziar o que está na memória, não só o que está no
 * disco.** Cada módulo que guarda estado de conta expõe o próprio `esquecer()`,
 * e ele é chamado aqui. O varrimento das chaves fica como rede de segurança,
 * para o que porventura não tenha um dono carregado.
 */

import { esquecer as esquecerDestino } from '@/notificacoes/destino';
import { esquecerMemoria as esquecerCarteira } from '@/oportunidades/repositorio';
import { esquecer as esquecerPerfil } from '@/perfil/repositorio';
import { clearAccountData } from './storage';

export async function limparDadosDaConta(): Promise<void> {
  // A carteira guarda decisões — o que foi aceito, o que foi recusado — e, no
  // dia em que a API de dados existir, o telefone do morador já liberado. Ela
  // não sobrevive a uma troca de conta.
  esquecerCarteira();

  await Promise.all([
    // O rascunho do perfil: memória e disco, nessa ordem de importância.
    esquecerPerfil(),
    // O destino que uma notificação deixou pendente. Sem isto, o parceiro
    // seguinte a entrar neste aparelho seria levado direto para a oportunidade
    // do anterior assim que autenticasse — o §19 da Fase 06, com a mesma forma
    // do vazamento do perfil que a Fase 05 encontrou: a memória, não o disco.
    esquecerDestino(),
    // As chaves da conta que restarem — ver `chaves.ts`.
    clearAccountData(),
  ]);
}
