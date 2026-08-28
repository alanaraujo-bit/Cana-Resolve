import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { LinhaDeAjuste, LinhaDeValor } from '@/ajustes/componentes';
import { TelaDeAjuste } from '@/ajustes/Tela';
import { appleDisponivel } from '@/auth/apple';
import {
  aparelhoAtual,
  estadoDaSessao,
  frasesDaSessao,
  metodosDaConta,
  temSenhaLocal,
} from '@/conta/tipos';
import { guardaSeguraDisponivel } from '@/session/storage';
import { useSession } from '@/session/SessionProvider';
import { Bloco, Grupo, Nota } from '@/ui';

/**
 * Login e segurança.
 *
 * Ela responde **como eu entro na minha conta** e **o que protege isso**. Duas
 * regras a governam, e as duas são sobre não mentir:
 *
 * 1. **Nenhum estado falso.** Google e Apple aparecem porque a pessoa precisa
 *    saber que existem e que ainda não valem — e não dizem "Conectado", porque
 *    nada está conectado. No dia em que estiverem, a frase muda sozinha
 *    (`conta/tipos.ts`).
 * 2. **Senha só quando existe senha.** Uma conta que entrasse apenas por
 *    Google não veria "Alterar senha", porque não há senha para alterar. Hoje
 *    todas entram por senha; a tela já sabe se adaptar quando isso mudar (§14).
 *
 * O que não existe aqui, de propósito: lista de dispositivos conectados. O
 * servidor guarda as sessões, mas não há como listá-las — e uma tela com um
 * aparelho inventado seria pior que nenhuma (§17).
 */
export default function Seguranca() {
  const router = useRouter();
  const { account, confirmando, semConfirmacao } = useSession();
  const [temApple, setTemApple] = useState(false);

  useEffect(() => {
    let alive = true;
    appleDisponivel().then((ok) => alive && setTemApple(ok));
    return () => {
      alive = false;
    };
  }, []);

  const metodos = metodosDaConta(account, temApple);
  const podeTrocarSenha = temSenhaLocal(account);
  const sessao = estadoDaSessao({ conta: account, confirmando, semConfirmacao });

  return (
    <TelaDeAjuste titulo="Login e segurança">
      <Grupo titulo="Como você entra">
        <Bloco>
          {metodos.map((m, i) => (
            <LinhaDeValor key={m.id} primeira={i === 0} titulo={m.rotulo} valor={m.situacao} />
          ))}
        </Bloco>
        {/* A frase segue o que a lista realmente mostra: no Android não existe
            linha da Apple, e prometer preparação de algo que nem aparece ali
            confunde em vez de informar. */}
        <Nota>
          {temApple
            ? 'Entrar pelo Google e pela Apple está em preparação. Enquanto isso, sua conta entra pelo e-mail e senha — e é por isso que ele não pode ser desligado.'
            : 'Entrar pelo Google está em preparação. Enquanto isso, sua conta entra pelo e-mail e senha — e é por isso que ele não pode ser desligado.'}
        </Nota>
      </Grupo>

      {podeTrocarSenha ? (
        <Grupo titulo="Senha">
          <Bloco>
            <LinhaDeAjuste
              primeira
              titulo="Alterar senha"
              explicacao="Você vai precisar da senha atual"
              onPress={() => router.push('/ajustes/senha')}
            />
          </Bloco>
        </Grupo>
      ) : null}

      <Grupo titulo="Sessão">
        <Bloco>
          <LinhaDeValor primeira titulo="Aparelho" valor={aparelhoAtual()} />
          <LinhaDeValor titulo="Situação" valor={frasesDaSessao[sessao]} />
        </Bloco>
        {sessao === 'sem-confirmacao' ? (
          <Nota tom="destaque">
            Você continua conectado. Assim que houver conexão, a sessão é conferida sozinha.
          </Nota>
        ) : null}
        {!guardaSeguraDisponivel() ? (
          <Nota>
            Nesta prévia pelo navegador a sessão não fica guardada — no celular, ela continua aberta
            entre uma abertura e outra.
          </Nota>
        ) : null}
      </Grupo>
    </TelaDeAjuste>
  );
}
