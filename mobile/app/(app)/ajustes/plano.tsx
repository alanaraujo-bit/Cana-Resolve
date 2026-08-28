import { useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LinhaDeAcao, LinhaDeAjuste, LinhaDeValor } from '@/ajustes/componentes';
import { linkDoSuporte } from '@/ajustes/informacoes';
import { ROTA_DE_AJUSTES } from '@/ajustes/rota';
import { abrirExterno } from '@/ajustes/Tela';
import { registrarComercial } from '@/comercial/analytics';
import { useComercial } from '@/comercial/ComercialProvider';
import { CartazDeEstado, CondicaoComercial, PeriodoDoBeta } from '@/comercial/componentes';
import { cenarios, rotuloCenario, type Cenario } from '@/comercial/exemplos';
import { compraNoAplicativoDisponivel } from '@/comercial/repositorio';
import {
  ASSINATURA_LEGIVEL,
  dataLegivel,
  diasLegivel,
  nomeDaArea,
  situacaoConhecida,
  type SituacaoComercial,
} from '@/comercial/tipos';
import { gutter, space } from '@/theme';
import { Bloco, Button, CabecalhoDeTela, Grupo, Nota, Text } from '@/ui';

/**
 * Minha participação — a área comercial do parceiro.
 *
 * ## A hierarquia, e por que ela é essa
 *
 * O que abre a tela é **o estado**, não o preço. Quem entra aqui está
 * perguntando "estou dentro?", "quando começa?", "quanto falta?" — e não
 * "quanto custa?". Um cartão de preço no topo transformaria uma tela de
 * situação numa tela de venda, que é o §2 e o §102 sendo quebrados de uma vez.
 *
 * ## Os estados, e o que cada um precisa dizer
 *
 * | estado | a frase que importa |
 * | --- | --- |
 * | em análise | seu cadastro está sendo avaliado; não há nada a fazer agora |
 * | aprovado | esta é a condição; é assim que se conclui |
 * | pagamento pendente | está processando; não é erro e não é sucesso |
 * | reservado | **sua vaga está garantida**, e os 90 dias ainda não começaram |
 * | ativo | início, fim, e quanto falta |
 * | terminando | falta pouco, dito sem urgência fabricada |
 * | encerrado | acabou, você continua Fundador, e a continuidade está sendo definida |
 * | desconhecido | **não consegui conferir** — que não é a mesma coisa que "acabou" |
 *
 * A última linha é a que mais importa e a mais fácil de errar: uma tela que diz
 * "seu período terminou" quando na verdade a rede caiu está acusando alguém de
 * não ter pago.
 *
 * ## O que não existe aqui
 *
 * Não há botão de comprar. Não porque a tela o esconda, mas porque **não existe
 * caminho de compra dentro do aplicativo nesta fase** — faltam as credenciais
 * das duas lojas e o processo comercial aprovado exclui compra indiscriminada.
 * A tela diz como a contratação acontece de verdade, pelo canal oficial, em vez
 * de mostrar um botão que não leva a lugar nenhum (§45, §75, §76).
 *
 * ## A rota é estável, o título não
 *
 * O endereço é sempre `/ajustes/plano`, porque um deep link de push gravado
 * hoje precisa continuar valendo (§119). O **título** é que muda com o estado
 * (§25): "Minha participação" durante o Beta, "Plano" quando houver um.
 */
export default function Plano() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { situacao, comercial, erro, atualizando, atualizar, cenario, trocarCenario } =
    useComercial();

  useEffect(() => {
    if (situacao !== 'pronto') return;
    registrarComercial('commercial_area_opened', {
      estado: comercial.adesao?.estado ?? 'sem_adesao',
    });
  }, [situacao, comercial.adesao?.estado]);

  useEffect(() => {
    const dias = comercial.adesao?.beta.diasRestantes;
    if (comercial.adesao?.terminando && dias !== null && dias !== undefined) {
      registrarComercial('beta_ending_seen', { diasRestantes: dias });
    }
  }, [comercial.adesao?.terminando, comercial.adesao?.beta.diasRestantes]);

  const voltar = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace(ROTA_DE_AJUSTES);
  }, [router]);

  const falarComOCanal = useCallback(async () => {
    await abrirExterno(linkDoSuporte('participacao'));
  }, []);

  return (
    <View style={[estilos.tela, { paddingTop: insets.top + space.sm }]}>
      <CabecalhoDeTela titulo={nomeDaArea(comercial)} aoVoltar={voltar} />

      <ScrollView
        style={estilos.rolagem}
        contentContainerStyle={[estilos.conteudo, { paddingBottom: insets.bottom + space['4xl'] }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={atualizando} onRefresh={() => void atualizar()} />
        }
      >
        {situacao === 'carregando' ? (
          <View style={estilos.carregando}>
            <ActivityIndicator />
            <Text variant="callout" tone="muted">
              Conferindo sua situação…
            </Text>
          </View>
        ) : (
          <Corpo comercial={comercial} erroTexto={erro?.message ?? null} aoFalar={falarComOCanal} />
        )}

        {/* O histórico continua acessível em **qualquer** estado comercial: é
            dinheiro que a pessoa pagou, e ele pertence a ela (§104). */}
        <Grupo titulo="Cobrança">
          <Bloco>
            <LinhaDeAjuste
              primeira
              titulo="Histórico de cobrança"
              explicacao="O que foi cobrado, quando e por quê"
              onPress={() => router.push('/ajustes/cobrancas')}
            />
          </Bloco>
        </Grupo>

        <SeletorDeCenario cenario={cenario} trocar={trocarCenario} />
      </ScrollView>
    </View>
  );
}

/* -------------------------------------------------------------------------- */

function Corpo({
  comercial,
  erroTexto,
  aoFalar,
}: {
  comercial: SituacaoComercial;
  erroTexto: string | null;
  aoFalar: () => void;
}) {
  /*
   * Não consegui conferir.
   *
   * Repare no que esta tela **não** diz: não diz que o período acabou, não diz
   * que não há participação, e não oferece checkout. Ela diz que não conseguiu
   * perguntar, e oferece tentar de novo. Qualquer outra frase seria uma
   * afirmação sobre a conta de alguém feita sem informação (§107).
   */
  if (!situacaoConhecida(comercial)) {
    return (
      <>
        <CartazDeEstado
          titulo="Situação"
          frase={
            erroTexto ??
            'Não foi possível conferir sua situação agora. Puxe para tentar de novo.'
          }
        />
        <Nota>
          Isto não muda nada na sua participação — é só a conferência que não
          chegou ao servidor. Seus dados, seu histórico e suas oportunidades já
          recebidas continuam onde estavam.
        </Nota>
      </>
    );
  }

  const { adesao, assinatura, operacao, ofertaDisponivel, fundador } = comercial;

  /* ---- Assinatura, quando um dia houver ---- */
  if (assinatura) {
    const fim = dataLegivel(assinatura.periodoFim);
    return (
      <>
        <CartazDeEstado
          titulo={fundador ? 'Parceiro Fundador' : 'Participação'}
          frase={
            assinatura.renova
              ? `Sua participação está ativa e renova ${fim ? `em ${fim}` : 'automaticamente'}.`
              : `A renovação está desligada. Você continua com acesso até ${fim ?? 'o fim do período já pago'}.`
          }
          tom={assinatura.estado === 'pagamento_atrasado' ? 'atencao' : 'confirmado'}
        />

        <Bloco>
          <LinhaDeValor primeira titulo="Situação" valor={ASSINATURA_LEGIVEL[assinatura.estado]} />
          <LinhaDeValor titulo="Renovação" valor={assinatura.renova ? 'Ativa' : 'Desligada'} />
          {fim ? <LinhaDeValor titulo="Período atual até" valor={fim} /> : null}
        </Bloco>

        {/*
         * Cancelar não é escondido, não pede cinco telas e não inverte botões
         * (§88). E ele não vive aqui dentro por uma razão que não é escolha
         * nossa: quando a compra é da loja, quem cancela é a loja — construir
         * um botão que finge cancelar seria pior que não ter botão (§89).
         */}
        <Grupo titulo="Gerenciar">
          <Bloco>
            <LinhaDeAcao
              primeira
              titulo="Cancelar a renovação"
              explicacao={
                assinatura.provedor === 'apple' || assinatura.provedor === 'google'
                  ? 'Abre o gerenciamento de assinaturas da loja, que é onde o cancelamento acontece. Você mantém o acesso até o fim do período já pago.'
                  : 'Fale com o canal oficial. Você mantém o acesso até o fim do período já pago.'
              }
              onPress={() => {
                registrarComercial('subscription_management_opened', {
                  provedor: assinatura.provedor,
                });
                aoFalar();
              }}
            />
          </Bloco>
        </Grupo>
      </>
    );
  }

  /* ---- Sem adesão nenhuma ---- */
  if (!adesao) {
    return (
      <>
        <CartazDeEstado
          titulo="Participação"
          frase="Você ainda não tem uma participação registrada no Canaã Resolve."
        />
        <Nota>
          A entrada na rede é feita pelo canal oficial, com análise por categoria.
          Fale com a gente para saber se a sua categoria está aberta.
        </Nota>
        <Button variant="outline" label="Falar com o Canaã Resolve" onPress={aoFalar} />
      </>
    );
  }

  /* ---- Em análise ---- */
  if (adesao.estado === 'em_analise') {
    return (
      <>
        <CartazDeEstado
          titulo="Cadastro"
          frase="Seu cadastro está em análise. Avisaremos assim que houver uma resposta."
        />
        <Nota>
          A entrada é limitada por categoria, para que não haja dezenas de
          profissionais disputando poucas oportunidades. Enquanto a análise
          corre, não há nada que você precise fazer.
        </Nota>
      </>
    );
  }

  /* ---- Categoria cheia / não elegível ---- */
  if (adesao.estado === 'categoria_cheia' || adesao.estado === 'nao_elegivel') {
    const cheia = adesao.estado === 'categoria_cheia';
    return (
      <>
        <CartazDeEstado
          titulo="Cadastro"
          frase={
            cheia
              ? 'Sua categoria está temporariamente completa. Avisaremos quando abrir uma vaga.'
              : 'Neste momento não conseguimos incluir o seu cadastro na rede.'
          }
        />
        {cheia ? (
          <Nota>
            Limitamos quantos parceiros entram por categoria de propósito: é o
            que faz cada oportunidade valer a pena para quem a recebe.
          </Nota>
        ) : null}
        <Button variant="outline" label="Falar com o Canaã Resolve" onPress={aoFalar} />
      </>
    );
  }

  /* ---- Aprovado: a condição aparece ---- */
  if (adesao.estado === 'aprovado' && ofertaDisponivel) {
    return (
      <>
        <CartazDeEstado
          titulo="Cadastro aprovado"
          frase="Sua vaga está reservada até você concluir a participação."
          tom="confirmado"
        />

        <CondicaoComercial
          oferta={ofertaDisponivel}
          quandoComeca="Quando o Canaã Resolve for oficialmente aberto aos moradores"
        />

        {/*
         * Como se conclui — e a honestidade aqui é a funcionalidade.
         *
         * Não há botão de comprar porque não há caminho de compra dentro do
         * aplicativo nesta fase. Um botão que abrisse um checkout externo sem
         * confirmação de política de loja seria o §45; um que não fizesse nada
         * seria pior. O que existe é o caminho real.
         */}
        <Nota tom="destaque">
          A contratação é concluída pelo canal oficial, com quem já falou com
          você. Assim que o pagamento for confirmado, sua vaga aparece aqui como
          garantida — sem precisar comprar de novo por aqui.
        </Nota>

        <Button
          label="Concluir pelo canal oficial"
          haptic="commit"
          onPress={() => {
            registrarComercial('checkout_started', {
              oferta: ofertaDisponivel.codigo,
              versao: ofertaDisponivel.versao,
            });
            aoFalar();
          }}
        />

        {compraNoAplicativoDisponivel() ? null : (
          <Text variant="caption" tone="faint" maxScale={1.2} center>
            Nenhum pagamento é feito dentro do aplicativo.
          </Text>
        )}
      </>
    );
  }

  /* ---- Pagamento em processamento ---- */
  if (adesao.estado === 'pagamento_pendente') {
    return (
      <>
        <CartazDeEstado
          titulo="Pagamento"
          frase="Pagamento em processamento. Assim que ele for confirmado, sua vaga aparece aqui como garantida."
          tom="atencao"
        />
        <Nota>
          Isto pode levar alguns minutos. Você não precisa pagar de novo — se
          houver qualquer problema, avisaremos por aqui.
        </Nota>
      </>
    );
  }

  /* ---- Reservado: o estado de hoje ---- */
  if (adesao.estado === 'reservado') {
    return (
      <>
        <CartazDeEstado
          titulo="Parceiro Fundador"
          frase="Seus 90 dias começam quando o Canaã Resolve for oficialmente aberto aos moradores."
          destaque="Sua vaga está garantida."
          tom="confirmado"
        />

        {/*
         * §7 em uma linha: sem data oficial, nenhuma data é mostrada. Nem
         * "previsto para", nem "em breve, dia tal". Só o compromisso de avisar.
         */}
        <Nota tom="destaque">
          {operacao.em
            ? `A operação para moradores começa em ${dataLegivel(operacao.em)}.`
            : 'Avisaremos quando a operação começar. Nenhum dia do seu período é consumido até lá.'}
        </Nota>

        {adesao.oferta ? (
          <CondicaoComercial
            oferta={adesao.oferta}
            quandoComeca="Na abertura oficial da operação para moradores"
          />
        ) : null}
      </>
    );
  }

  /* ---- Beta ativo ---- */
  if (adesao.estado === 'ativo') {
    const dias = adesao.beta.diasRestantes;
    return (
      <>
        <CartazDeEstado
          titulo="Parceiro Fundador"
          frase={
            adesao.terminando
              ? 'Quando definirmos a continuidade comercial, você poderá escolher se deseja permanecer na rede.'
              : 'Beta ativo. Você está recebendo oportunidades compatíveis com os seus serviços.'
          }
          destaque={dias !== null ? `${diasLegivel(dias)} restantes` : 'Beta ativo'}
          destaqueFalado={dias !== null ? `Restam ${diasLegivel(dias)} de Beta` : undefined}
          tom={adesao.terminando ? 'atencao' : 'confirmado'}
        />

        <PeriodoDoBeta
          inicio={adesao.beta.inicio}
          fim={adesao.beta.fim}
          diasRestantes={adesao.beta.diasRestantes}
        />

        {adesao.terminando && !comercial.continuidade.definida ? (
          <Nota tom="destaque">
            Estamos finalizando as condições de continuidade após o Beta. Você
            será informado antes do término, e nada é cobrado automaticamente.
          </Nota>
        ) : null}

        {adesao.oferta ? (
          <CondicaoComercial
            oferta={adesao.oferta}
            quandoComeca="Na abertura oficial da operação para moradores"
          />
        ) : null}
      </>
    );
  }

  /* ---- Encerrado ou cancelado ---- */
  const cancelado = adesao.estado === 'cancelado';
  return (
    <>
      <CartazDeEstado
        titulo={fundador ? 'Parceiro Fundador' : 'Participação'}
        frase={
          cancelado
            ? 'Sua participação foi encerrada. Seus dados e seu histórico continuam aqui.'
            : 'Seu período Beta terminou. Seus dados, seu perfil e seu histórico continuam aqui.'
        }
      />

      {!cancelado ? (
        <PeriodoDoBeta
          inicio={adesao.beta.inicio}
          fim={adesao.beta.fim}
          diasRestantes={null}
        />
      ) : null}

      {fundador ? (
        <Nota>
          Você continua registrado como Parceiro Fundador. É um registro do que
          aconteceu — de ter entrado na rede antes de ela existir para os
          moradores. Não é um plano, não é uma nota e não dá prioridade nenhuma
          nas oportunidades.
        </Nota>
      ) : null}

      {!comercial.continuidade.definida ? (
        <Nota tom="destaque">
          Estamos finalizando as condições de continuidade. Nada será cobrado sem
          que você escolha continuar.
        </Nota>
      ) : null}
    </>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * O seletor de cenário — **só desenvolvimento**.
 *
 * Fica dentro da área comercial, e não na tela de Desenvolvimento, seguindo a
 * convenção que aquela tela declara: o cenário se troca onde o efeito é
 * visível. Fora de `__DEV__` ele não é renderizado, e os exemplos não são
 * alcançáveis por caminho nenhum (§147).
 */
function SeletorDeCenario({
  cenario,
  trocar,
}: {
  cenario: Cenario | null;
  trocar: (c: Cenario | null) => void;
}) {
  if (!__DEV__) return null;

  return (
    <Grupo titulo="Desenvolvimento">
      <Nota>
        Cenários de exemplo. Nada aqui é uma compra real, e nada disto existe no
        aplicativo publicado.
      </Nota>
      <Bloco>
        <LinhaDeAcao
          primeira
          titulo="Situação real do servidor"
          explicacao={cenario === null ? 'Em uso' : undefined}
          onPress={() => trocar(null)}
        />
        {cenarios.map((c) => (
          <LinhaDeAcao
            key={c}
            titulo={rotuloCenario[c]}
            explicacao={cenario === c ? 'Em uso' : undefined}
            onPress={() => trocar(c)}
          />
        ))}
      </Bloco>
    </Grupo>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1 },
  rolagem: { flex: 1 },
  conteudo: { paddingHorizontal: gutter, paddingTop: space.lg, gap: space.xl },
  carregando: { alignItems: 'center', gap: space.md, paddingVertical: space['4xl'] },
});
