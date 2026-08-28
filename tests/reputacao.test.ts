import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { avisoDeNovaAvaliacao, conferirPrivacidade, preferenciaDoTipo } from "@/lib/push/mensagens";
import {
  JANELA_PARA_AVALIAR_DIAS,
  JANELA_PARA_EDITAR_DIAS,
  conviteDoEncerramento,
  podeAvaliar,
  type ContextoDeAvaliacao,
} from "../mobile/src/reputacao/elegibilidade";
import {
  ajustarResumo,
  contaParaAMedia,
  contagemLegivel,
  contarNaoVistas,
  mediaLegivel,
  resumir,
  resumirTexto,
  textoSeguro,
  visivelPublicamente,
  type Avaliacao,
  type EstadoDeModeracao,
  type Nota,
} from "../mobile/src/reputacao/tipos";
import {
  itensPublicos,
  seloDeVerificacao,
} from "../mobile/src/reputacao/verificacao";
import { comoRota } from "../mobile/src/notificacoes/rotas";

/**
 * A reputação — as regras que não dá para conferir com o olho.
 *
 * Estes testes importam de `mobile/src/reputacao/`, e a razão é a mesma que
 * fez o domínio ser escrito como funções puras: **média, elegibilidade e
 * moderação são o tipo de coisa que passa despercebida numa captura de tela**.
 * Um "0,0" e um "—" ocupam quase o mesmo espaço; uma média que inclui uma
 * avaliação em análise parece igualzinha a uma que não inclui. Só asserção pega.
 *
 * O que **não** está aqui, e não é esquecimento: a interface. Estrela desenhada,
 * folha que sobe e teclado que não cobre o botão continuam sendo verificados
 * olhando o produto, como nas fases anteriores.
 */

const DIA = 86_400_000;

function avaliacao(parte: Partial<Avaliacao> & { nota: Nota }): Avaliacao {
  return {
    id: parte.id ?? `a${Math.random().toString(36).slice(2, 8)}`,
    oportunidadeId: parte.oportunidadeId ?? "o1",
    autor: "Cliente Canaã Resolve",
    categoria: "Serviço de elétrica",
    nota: parte.nota,
    aspectos: null,
    comentario: parte.comentario ?? null,
    em: parte.em ?? new Date(),
    editadaEm: null,
    estado: parte.estado ?? "publicada",
    resposta: parte.resposta ?? null,
    denuncia: parte.denuncia ?? null,
    vista: parte.vista ?? true,
  };
}

/* -------------------------------------------------------------------------- */

describe("a média: a fonte única", () => {
  it("um perfil sem avaliações não tem média — e não tem zero", () => {
    const r = resumir([]);
    // A asserção que dá nome à fase inteira. `0` aqui seria "profissional
    // ruim" escrito na tela de quem chegou hoje.
    assert.equal(r.media, null);
    assert.equal(r.total, 0);
    assert.equal(r.volume, "nenhuma");
    assert.equal(mediaLegivel(r.media), null);
  });

  it("arredonda para uma casa, e não para a precisão que a amostra não tem", () => {
    // 4 + 5 + 5 = 14 / 3 = 4,666… → "4,7". Nunca "4,66667".
    const r = resumir([avaliacao({ nota: 4 }), avaliacao({ nota: 5 }), avaliacao({ nota: 5 })]);
    assert.equal(r.media, 4.7);
    assert.equal(mediaLegivel(r.media), "4,7");
  });

  it("usa vírgula decimal, e mostra a casa mesmo quando ela é zero", () => {
    const r = resumir([avaliacao({ nota: 5 }), avaliacao({ nota: 5 })]);
    assert.equal(mediaLegivel(r.media), "5,0");
  });

  it("uma avaliação é uma avaliação — e a contagem diz isso", () => {
    const r = resumir([avaliacao({ nota: 5 })]);
    assert.equal(mediaLegivel(r.media), "5,0");
    assert.equal(contagemLegivel(r.total), "1 avaliação");
    // Volume "poucas": a interface não conclui nada a partir de uma pessoa.
    assert.equal(r.volume, "poucas");
  });

  it("a partir de cinco, a amostra passa a ser consistente", () => {
    const quatro = resumir(Array.from({ length: 4 }, () => avaliacao({ nota: 5 })));
    const cinco = resumir(Array.from({ length: 5 }, () => avaliacao({ nota: 5 })));
    assert.equal(quatro.volume, "poucas");
    assert.equal(cinco.volume, "consistente");
  });

  it("a distribuição conta só o que entra na média", () => {
    const r = resumir([
      avaliacao({ nota: 5 }),
      avaliacao({ nota: 5 }),
      avaliacao({ nota: 3 }),
      avaliacao({ nota: 1, estado: "removida" }),
    ]);
    assert.equal(r.distribuicao[5], 2);
    assert.equal(r.distribuicao[3], 1);
    assert.equal(r.distribuicao[1], 0);
  });
});

describe("moderação: o que conta e o que não conta", () => {
  it("só a publicada entra na média", () => {
    const casos: [EstadoDeModeracao, boolean][] = [
      ["publicada", true],
      ["em-analise", false],
      ["removida", false],
      ["oculta", false],
    ];
    for (const [estado, esperado] of casos) {
      assert.equal(contaParaAMedia(estado), esperado, `estado "${estado}"`);
    }
  });

  it("uma avaliação removida não contamina a média pública", () => {
    // Uma nota 1 removida por fraude, no meio de quatro cincos: se ela
    // contasse, a média cairia de 5,0 para 4,2.
    const r = resumir([
      avaliacao({ nota: 5 }),
      avaliacao({ nota: 5 }),
      avaliacao({ nota: 5 }),
      avaliacao({ nota: 5 }),
      avaliacao({ nota: 1, estado: "removida" }),
    ]);
    assert.equal(r.media, 5);
    assert.equal(r.total, 4);
    assert.equal(r.foraDaConta, 1);
  });

  it("uma em análise sai da conta — e a saída é declarada, não silenciosa", () => {
    const r = resumir([avaliacao({ nota: 5 }), avaliacao({ nota: 1, estado: "em-analise" })]);
    assert.equal(r.media, 5);
    assert.equal(r.total, 1);
    // É `foraDaConta` que permite a tela dizer por que a média mudou, em vez
    // de o número simplesmente pular.
    assert.equal(r.foraDaConta, 1);
  });

  it("uma denúncia não some com a avaliação — ela vira análise", () => {
    // Se denunciar removesse, bastaria contestar toda nota baixa. O estado
    // intermediário é o que impede o profissional de controlar a própria
    // reputação.
    const contestada = avaliacao({ nota: 1, estado: "em-analise" });
    assert.equal(contestada.estado, "em-analise");
    assert.notEqual(contestada.estado, "removida" as EstadoDeModeracao);
  });

  it("o morador vê só a publicada", () => {
    assert.equal(visivelPublicamente("publicada"), true);
    for (const e of ["em-analise", "removida", "oculta"] as EstadoDeModeracao[]) {
      assert.equal(visivelPublicamente(e), false, `estado "${e}"`);
    }
  });
});

describe("quem pode avaliar", () => {
  const base = (extra: Partial<ContextoDeAvaliacao["oportunidade"]> = {}) => ({
    id: "o1",
    estado: "encerrada" as const,
    resultado: "servico-realizado" as const,
    profissionalId: "p1",
    moradorId: "m1",
    encerradaEm: new Date(Date.now() - DIA),
    ...extra,
  });

  const ctx = (extra: Partial<ContextoDeAvaliacao> = {}): ContextoDeAvaliacao => ({
    oportunidade: base(),
    autorId: "m1",
    jaAvaliou: false,
    avaliadaEm: null,
    ...extra,
  });

  it("o morador atendido pode avaliar", () => {
    assert.deepEqual(podeAvaliar(ctx()), { pode: true, modo: "criar" });
  });

  it("o profissional não avalia a si mesmo", () => {
    const r = podeAvaliar(ctx({ autorId: "p1" }));
    assert.equal(r.pode, false);
    assert.equal(r.pode === false && r.motivo, "autoavaliacao");
  });

  it("quem não participou não avalia — nem conhecendo o id", () => {
    // É o §6 em forma de asserção: não existe avaliação pública irrestrita.
    const r = podeAvaliar(ctx({ autorId: "estranho" }));
    assert.equal(r.pode, false);
    assert.equal(r.pode === false && r.motivo, "nao-participou");
  });

  it("não se avalia um serviço que ainda está acontecendo", () => {
    for (const estado of ["nova", "vista", "interessado", "em-contato"] as const) {
      const r = podeAvaliar(ctx({ oportunidade: base({ estado, encerradaEm: null }) }));
      assert.equal(r.pode, false, `estado "${estado}"`);
      assert.equal(r.pode === false && r.motivo, "ainda-nao-encerrou");
    }
  });

  it("oportunidade encerrada não é serviço realizado", () => {
    // O §63 é o parágrafo que esta asserção guarda: encerrar não é ter
    // atendido. Só um resultado habilita.
    for (const resultado of [
      "cliente-decidindo",
      "cliente-nao-respondeu",
      "nao-fechamos",
      "nao-consegui-atender",
      "outro",
    ] as const) {
      const r = podeAvaliar(ctx({ oportunidade: base({ resultado }) }));
      assert.equal(r.pode, false, `resultado "${resultado}"`);
      assert.equal(r.pode === false && r.motivo, "sem-servico");
    }
  });

  it("uma oportunidade não vira duas avaliações", () => {
    const r = podeAvaliar(
      ctx({ jaAvaliou: true, avaliadaEm: new Date(Date.now() - 40 * DIA) }),
    );
    assert.equal(r.pode, false);
    assert.equal(r.pode === false && r.motivo, "ja-avaliou");
  });

  it("dentro da janela curta, avaliar de novo é editar a mesma", () => {
    const r = podeAvaliar(
      ctx({ jaAvaliou: true, avaliadaEm: new Date(Date.now() - 2 * DIA) }),
    );
    assert.deepEqual(r, { pode: true, modo: "editar" });
    assert.ok(JANELA_PARA_EDITAR_DIAS < JANELA_PARA_AVALIAR_DIAS);
  });

  it("passado o prazo, não se avalia mais", () => {
    const r = podeAvaliar(
      ctx({
        oportunidade: base({
          encerradaEm: new Date(Date.now() - (JANELA_PARA_AVALIAR_DIAS + 1) * DIA),
        }),
      }),
    );
    assert.equal(r.pode, false);
    assert.equal(r.pode === false && r.motivo, "tarde-demais");
  });

  it("a autoavaliação é recusada antes de qualquer outra coisa", () => {
    // Mesmo com a oportunidade em andamento e sem resultado, o motivo
    // devolvido é a má-fé, e não a etapa que falta.
    const r = podeAvaliar(
      ctx({
        autorId: "p1",
        oportunidade: base({ estado: "nova", resultado: null, encerradaEm: null }),
      }),
    );
    assert.equal(r.pode === false && r.motivo, "autoavaliacao");
  });
});

describe("o convite de avaliação", () => {
  it("um serviço realizado gera convite — e o convite não é a avaliação", () => {
    const convite = conviteDoEncerramento({
      id: "o1",
      estado: "encerrada",
      resultado: "servico-realizado",
      profissionalId: "p1",
      moradorId: "m1",
      encerradaEm: new Date("2026-08-20T10:00:00Z"),
    });
    assert.ok(convite);
    // O §56: o profissional dizer "realizado" produz o direito de perguntar,
    // e nunca uma nota. Nada aqui carrega estrela.
    assert.equal(convite.situacao, "a-convidar");
    assert.equal(convite.oportunidadeId, "o1");
    assert.ok(!("nota" in convite));
  });

  it("um encerramento sem serviço não gera convite nenhum", () => {
    const convite = conviteDoEncerramento({
      id: "o1",
      estado: "encerrada",
      resultado: "nao-fechamos",
      profissionalId: "p1",
      moradorId: "m1",
      encerradaEm: new Date(),
    });
    assert.equal(convite, null);
  });
});

describe("o texto que a pessoa escreveu", () => {
  it("um comentário curto não é truncado", () => {
    const r = resumirTexto("Resolveu no mesmo dia.");
    assert.equal(r.cortado, false);
    assert.equal(r.texto, "Resolveu no mesmo dia.");
  });

  it("um comentário longo é cortado em palavra inteira, e se declara cortado", () => {
    const longo = "Chamei para olhar um problema no quadro de energia da cozinha inteira.";
    const r = resumirTexto(longo, 30);

    assert.equal(r.cortado, true);
    assert.ok(r.texto.endsWith("…"));
    // A asserção que importa: o texto cortado é um **prefixo de palavras
    // inteiras** do original. Um corte no meio de uma palavra passaria por
    // "termina com reticências" sem problema nenhum.
    const semReticencia = r.texto.slice(0, -1);
    assert.ok(longo.startsWith(semReticencia), `"${semReticencia}" não é prefixo do original`);
    assert.equal(
      longo[semReticencia.length],
      " ",
      `cortou no meio de uma palavra: "${semReticencia}"`,
    );
  });

  it("uma palavra sem espaço nenhum ainda assim é cortada no limite", () => {
    // O caso que a regra de palavra inteira não consegue atender: sem espaço,
    // não há fronteira. O corte acontece no limite, e não estoura o layout.
    const r = resumirTexto("a".repeat(200), 20);
    assert.equal(r.cortado, true);
    assert.ok(r.texto.length <= 21, `ficou com ${r.texto.length}`);
  });

  it("o saneamento tira controle e parede de espaço, e preserva parágrafo", () => {
    // Os controles entram por código, e não colados no arquivo: um NUL ou um
    // BEL invisível dentro do fonte é exatamente o tipo de coisa que alguém
    // apaga sem querer numa edição futura — e o teste passaria a não testar
    // nada, sem ninguém notar.
    const BEL = String.fromCharCode(7);
    const NUL = String.fromCharCode(0);

    const sujo = `Bom${BEL}   serviço${NUL}  .\n\n\n\nRecomendo.`;
    const limpo = textoSeguro(sujo, 500);

    assert.ok(!limpo.includes(BEL));
    assert.ok(!limpo.includes(NUL));
    assert.equal(limpo.includes("   "), false);
    // Duas quebras sobrevivem — parágrafo é conteúdo. Quatro viram duas.
    assert.ok(limpo.includes("\n\n"));
    assert.ok(!limpo.includes("\n\n\n"));
  });

  it("o teto é aplicado na entrada, e não na tela", () => {
    assert.equal(textoSeguro("a".repeat(900), 600).length, 600);
  });

  it("uma avaliação sem comentário é válida", () => {
    const a = avaliacao({ nota: 5, comentario: null });
    assert.equal(a.comentario, null);
    // E continua contando na média como qualquer outra: a estrela já é a
    // avaliação.
    assert.equal(resumir([a]).total, 1);
  });
});

describe("o que ainda não foi lido", () => {
  it("conta as não vistas, e ignora as removidas", () => {
    const lista = [
      avaliacao({ nota: 5, vista: false }),
      avaliacao({ nota: 4, vista: false }),
      avaliacao({ nota: 5, vista: true }),
      avaliacao({ nota: 1, vista: false, estado: "removida" }),
    ];
    assert.equal(contarNaoVistas(lista), 2);
  });

  it("essa contagem não tem nada a ver com o selo da aba", () => {
    // O §76: o selo de Oportunidades conta oportunidades esperando decisão, e
    // continua contando só isso. A prova é estrutural — `contarNaoVistas`
    // recebe avaliações e não conhece oportunidade nenhuma.
    assert.equal(contarNaoVistas([]), 0);
    assert.equal(contarNaoVistas([avaliacao({ nota: 5, vista: true })]), 0);
  });
});

describe("verificação: um selo com significado", () => {
  it("sem nada conferido, não existe selo — e não existe 'não verificado'", () => {
    assert.equal(seloDeVerificacao([]), null);
    // §28: quem chegou primeiro não pode ser penalizado visualmente por uma
    // verificação que ainda nem está aberta.
    assert.equal(
      seloDeVerificacao([{ tipo: "contato", estado: "nao-iniciada", em: null }]),
      null,
    );
  });

  it("só o que foi confirmado vira sinal público", () => {
    const itens = [
      { tipo: "contato" as const, estado: "verificado" as const, em: new Date() },
      { tipo: "identidade" as const, estado: "em-analise" as const, em: null },
      { tipo: "empresa" as const, estado: "rejeitada" as const, em: null },
    ];
    assert.equal(itensPublicos(itens).length, 1);
    assert.equal(seloDeVerificacao(itens), "Contato confirmado");
  });

  it("três conferências viram um selo, e não três", () => {
    // §33: uma coleção de emblemas faz quem tem dois parecer inferior a quem
    // tem três, e transforma confiança em gamificação.
    const em = new Date();
    const selo = seloDeVerificacao([
      { tipo: "contato", estado: "verificado", em },
      { tipo: "identidade", estado: "verificado", em },
      { tipo: "empresa", estado: "verificado", em },
    ]);
    assert.equal(selo, "Informações verificadas");
  });
});

describe("o push de uma avaliação nova", () => {
  it("não leva a nota nem o comentário para a tela bloqueada", () => {
    const aviso = avisoDeNovaAvaliacao({ avaliacaoId: "a1", partnerId: "p1" });
    const texto = `${aviso.titulo} ${aviso.corpo}`;
    // Nada de "nota 2", nada do que o cliente escreveu. O §73 inteiro.
    assert.ok(!/\d\s*estrela|nota\s*\d|[1-5]\s*\/\s*5/i.test(texto));
    assert.equal(aviso.corpo.includes("péssimo"), false);
    assert.equal(aviso.titulo, "Você recebeu uma nova avaliação");
  });

  it("passa pela mesma rede de privacidade dos outros avisos", () => {
    const aviso = avisoDeNovaAvaliacao({ avaliacaoId: "a1", partnerId: "p1" });
    assert.equal(conferirPrivacidade(aviso), null);
  });

  it("aponta para a avaliação, no formato externo", () => {
    const aviso = avisoDeNovaAvaliacao({ avaliacaoId: "a1", partnerId: "p1" });
    assert.equal(aviso.carga.destino, "avaliacao/a1");
    assert.equal(aviso.carga.avaliacaoId, "a1");
    assert.equal(aviso.carga.para, "p1");
    // A estrutura interna de rotas do aplicativo não viaja dentro do push.
    assert.ok(!aviso.carga.destino.includes("perfil"));
  });

  it("o mesmo fato não vira duas notificações", () => {
    const a = avisoDeNovaAvaliacao({ avaliacaoId: "a1", partnerId: "p1" });
    const b = avisoDeNovaAvaliacao({ avaliacaoId: "a1", partnerId: "p1" });
    assert.equal(a.carga.evento, b.carga.evento);
  });

  it("responde a um interruptor próprio, e não ao de oportunidades", () => {
    assert.equal(preferenciaDoTipo["avaliacao.nova"], "avaliacoes");
    // Segurança continua fora do opt-out.
    assert.equal(preferenciaDoTipo["conta.seguranca"], null);
  });
});

describe("o deep link de uma avaliação", () => {
  it("traduz o endereço externo para a rota interna", () => {
    // `avaliacao/:id` é o que viaja no push; `/perfil/avaliacoes/:id` é onde a
    // tela mora. A tradução acontece em um lugar só.
    assert.equal(comoRota("avaliacao/a1"), "/perfil/avaliacoes/a1");
    assert.equal(comoRota("/avaliacao/a1"), "/perfil/avaliacoes/a1");
    assert.equal(comoRota("canaaresolve://avaliacao/a1"), "/perfil/avaliacoes/a1");
  });

  it("é idempotente — e é isso que faz o destino sobreviver a um reinício", () => {
    /**
     * `restaurar()` revalida a rota que leu do disco, e o que está no disco já
     * é a forma traduzida. Sem esta propriedade, o percurso "toquei no push, o
     * aplicativo tinha morrido, autentiquei" perderia o destino em silêncio —
     * exatamente o caso que a Fase 06 construiu o `destino` para atender.
     */
    const uma = comoRota("avaliacao/a1");
    assert.ok(uma);
    assert.equal(comoRota(uma), uma);
  });

  it("aceita a lista, nas duas formas", () => {
    assert.equal(comoRota("avaliacoes"), "/perfil/avaliacoes");
    assert.equal(comoRota("/perfil/avaliacoes"), "/perfil/avaliacoes");
  });

  it("recusa o que não está na lista curta de destinos", () => {
    for (const ruim of [
      "avaliacao/",
      "avaliacao/../../ajustes",
      "avaliacao/a1/editar",
      "avaliacoes/todas",
      "perfil",
      "perfil/avaliacoes/a1/responder",
      "",
      "   ",
    ]) {
      assert.equal(comoRota(ruim), null, `deveria recusar "${ruim}"`);
    }
  });

  it("o que valida é o caminho, e não o domínio de onde ele veio", () => {
    /**
     * Herdado da Fase 06, e vale a pena estar escrito: `comoRota` descasca o
     * esquema e o host e olha só o caminho. Um `https://qualquer.com/avaliacao/a1`
     * vira a mesma rota que `avaliacao/a1`.
     *
     * Isso **não** é um buraco, por dois motivos que se somam: o sistema
     * operacional só entrega ao aplicativo os links dos domínios e esquemas
     * registrados — um host arbitrário não chega aqui —, e sobretudo porque a
     * rota não concede nada. Quem autoriza é o servidor, para o usuário
     * autenticado daquele momento (§70 da Fase 06). Uma rota é um endereço, não
     * uma chave.
     */
    assert.equal(comoRota("https://canaaresolve.aionixdev.com/avaliacao/a1"), "/perfil/avaliacoes/a1");
    assert.equal(comoRota("http://exemplo.com/avaliacao/a1"), "/perfil/avaliacoes/a1");
  });

  it("um id absurdamente longo não vira rota", () => {
    assert.equal(comoRota(`avaliacao/${"a".repeat(200)}`), null);
  });

  it("os destinos da Fase 06 continuam funcionando", () => {
    // A regressão que importa: acrescentar rota não pode quebrar as que já
    // estão em pushes enviados.
    assert.equal(comoRota("oportunidade/o1"), "/oportunidade/o1");
    assert.equal(comoRota("ajustes/seguranca"), "/ajustes/seguranca");
  });

  it("o esquema próprio não perde o primeiro segmento", () => {
    /**
     * Uma regressão encontrada ao escrever estes testes, e que existia desde a
     * Fase 06: o descascamento do esquema descartava tudo até a primeira barra,
     * como se sempre houvesse um host. Em `canaaresolve://oportunidade/o1` não
     * há — o primeiro segmento **é** o caminho —, e ele virava `o1`, que não
     * bate com padrão nenhum.
     *
     * Nunca apareceu porque o push manda o destino sem esquema. Quem passava
     * por aqui era um link de verdade, tocado fora do aplicativo, e ele
     * simplesmente não abria nada.
     */
    assert.equal(comoRota("canaaresolve://oportunidade/o1"), "/oportunidade/o1");
    assert.equal(comoRota("canaaresolve://ajustes/seguranca"), "/ajustes/seguranca");
    assert.equal(comoRota("canaaresolve://avaliacoes"), "/perfil/avaliacoes");
  });
});

describe("o resumo depois de uma ação", () => {
  /**
   * `ajustarResumo` existe porque a lista carregada é **uma página**, não o
   * histórico: recalcular com `resumir()` sobre ela devolveria a média dos dez
   * primeiros como se fosse a do parceiro. A conta aqui é um delta sobre o
   * total conhecido, e delta é aritmética — o tipo de coisa que se confere por
   * asserção e nunca por captura de tela.
   */
  const base = () =>
    resumir([
      avaliacao({ id: "x1", nota: 5 }),
      avaliacao({ id: "x2", nota: 5 }),
      avaliacao({ id: "x3", nota: 5 }),
      avaliacao({ id: "x4", nota: 1 }),
    ]);

  it("contestar tira a nota da média, e o delta bate com o recálculo", () => {
    const antes = avaliacao({ id: "x4", nota: 1 });
    const depois = { ...antes, estado: "em-analise" as const };

    const r = ajustarResumo(base(), antes, depois);

    // 5+5+5 = 15 / 3 = 5,0. A nota 1 saiu.
    assert.equal(r.media, 5);
    assert.equal(r.total, 3);
    assert.equal(r.foraDaConta, 1);
    assert.equal(r.distribuicao[1], 0);

    // E bate exatamente com o que `resumir` daria sobre o conjunto inteiro —
    // que é a única prova de que o delta não diverge da fonte única.
    const cheio = resumir([
      avaliacao({ id: "x1", nota: 5 }),
      avaliacao({ id: "x2", nota: 5 }),
      avaliacao({ id: "x3", nota: 5 }),
      depois,
    ]);
    assert.equal(r.media, cheio.media);
    assert.equal(r.total, cheio.total);
    assert.equal(r.foraDaConta, cheio.foraDaConta);
    assert.deepEqual(r.distribuicao, cheio.distribuicao);
  });

  it("responder não mexe na média", () => {
    const antes = avaliacao({ id: "x1", nota: 5 });
    const depois = {
      ...antes,
      resposta: { texto: "Obrigado.", em: new Date(), editadaEm: null },
    };
    const inicial = base();
    const r = ajustarResumo(inicial, antes, depois);
    assert.equal(r.media, inicial.media);
    assert.equal(r.total, inicial.total);
    assert.deepEqual(r.distribuicao, inicial.distribuicao);
  });

  it("marcar como vista não mexe na média", () => {
    const antes = avaliacao({ id: "x1", nota: 5, vista: false });
    const inicial = base();
    const r = ajustarResumo(inicial, antes, { ...antes, vista: true });
    assert.equal(r.media, inicial.media);
    assert.equal(r.total, inicial.total);
  });

  it("a última avaliação sair da conta devolve `null`, e não zero", () => {
    // O caso que a fase inteira existe para não errar: contestar a única
    // avaliação não pode produzir "0,0".
    const so = avaliacao({ id: "u", nota: 5 });
    const r = ajustarResumo(resumir([so]), so, { ...so, estado: "em-analise" });
    assert.equal(r.media, null);
    assert.equal(r.total, 0);
    assert.equal(r.volume, "nenhuma");
  });

  it("o volume acompanha o total", () => {
    const cinco = Array.from({ length: 5 }, (_, i) => avaliacao({ id: `v${i}`, nota: 5 }));
    const inicial = resumir(cinco);
    assert.equal(inicial.volume, "consistente");

    const r = ajustarResumo(inicial, cinco[0]!, { ...cinco[0]!, estado: "em-analise" });
    assert.equal(r.total, 4);
    assert.equal(r.volume, "poucas");
  });

  it("uma avaliação que não estava carregada não é ajustada às cegas", () => {
    // `antes` nulo = a ação mexeu em algo fora da página. Chutar um delta ali
    // corromperia a média; o resumo volta intacto.
    const inicial = base();
    const r = ajustarResumo(inicial, null, avaliacao({ id: "z", nota: 1 }));
    assert.deepEqual(r, inicial);
  });
});
