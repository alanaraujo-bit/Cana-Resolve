import { NextResponse } from "next/server";

import { adaptador } from "@/lib/billing/provedor";
import { nomeDaVariavel, segredoDe, verificarHmac } from "@/lib/billing/webhook";
import { PROVEDORES, type Provedor } from "@/lib/domain/comercial/eventos";

/**
 * A entrada dos eventos financeiros das lojas e do gateway.
 *
 *     POST /api/v1/comercial/webhooks/apple
 *     POST /api/v1/comercial/webhooks/google
 *     POST /api/v1/comercial/webhooks/alternativo
 *
 * ## Por que a rota existe antes de ter credencial
 *
 * Porque a forma dela é a decisão importante, e ela precisa estar escrita
 * antes de a pressa chegar. Renovação, cancelamento, reembolso, chargeback e
 * expiração acontecem **com o aplicativo fechado** (§50) — não dá para
 * depender de o parceiro abrir o app para descobrir que uma compra foi
 * estornada há três semanas.
 *
 * ## Por que ela recusa tudo hoje
 *
 * Sem segredo configurado, não há como distinguir a Apple de qualquer pessoa
 * que descubra a URL. Um endpoint financeiro que aceita evento não verificado
 * é um botão público de conceder acesso pago — então a resposta é **503, e
 * nada é gravado** (§111).
 *
 * Isso é uma escolha, e a alternativa foi considerada e recusada: "aceitar por
 * enquanto e apertar depois" produz exatamente o bug que o §166 chama de
 * bloqueador, com o agravante de ser invisível até alguém abusar dele.
 *
 * ## O que muda quando a credencial chegar
 *
 * A verificação HMAC daqui serve ao provedor alternativo. Apple e Google usam
 * formatos próprios — JWS assinado por cadeia de certificados, no caso da
 * Apple; mensagem do Pub/Sub com token OIDC, no do Google —, e cada um ganha a
 * sua verificação em `lib/billing/webhook.ts`. **O que não muda** é o resto do
 * caminho: evento verificado → `registrarEvento` (idempotente) → efeito. E o
 * efeito é o mesmo dos outros provedores, porque quem concede acesso é uma
 * função só.
 */

function ehProvedor(valor: string): valor is Provedor {
  return (PROVEDORES as string[]).includes(valor);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ provedor: string }> },
) {
  const { provedor: bruto } = await params;

  if (!ehProvedor(bruto) || bruto === "administrativo") {
    // A administração tem porta própria, com autenticação própria. Aceitá-la
    // aqui seria uma segunda entrada para a operação mais sensível do sistema.
    return NextResponse.json({ ok: false, erro: "provedor_desconhecido" }, { status: 404 });
  }

  const provedor: Provedor = bruto;

  if (!segredoDe(provedor)) {
    console.error(
      `[comercial] webhook de ${provedor} recusado: ${nomeDaVariavel(provedor)} não está configurada`,
    );
    return NextResponse.json({ ok: false, erro: "sem_segredo" }, { status: 503 });
  }

  // O corpo **cru**: converter para objeto e voltar reordena chaves e quebra a
  // assinatura por um motivo que ninguém encontra depressa.
  const corpoCru = await request.text();
  const assinatura = request.headers.get("x-cr-assinatura");
  const verificacao = verificarHmac(provedor, corpoCru, assinatura);

  if (!verificacao.ok) {
    console.warn(`[comercial] webhook de ${provedor} rejeitado: ${verificacao.motivo}`);
    return NextResponse.json({ ok: false, erro: verificacao.motivo }, { status: 401 });
  }

  /*
   * Verificado — e ainda assim recusado, enquanto o adaptador do provedor não
   * estiver ligado. Um evento cuja compra não pode ser confirmada contra o
   * provedor não vira acesso: assinatura válida prova quem enviou, não prova
   * que o dinheiro entrou.
   */
  const porta = adaptador(provedor);
  if (!porta.disponivel()) {
    console.error(
      `[comercial] webhook de ${provedor} verificado, mas o adaptador está fechado: ` +
        porta.porqueIndisponivel(),
    );
    return NextResponse.json({ ok: false, erro: "provedor_indisponivel" }, { status: 503 });
  }

  // Daqui em diante: traduzir o evento do provedor, `registrarEvento` e
  // aplicar o efeito por `lib/comercial/adesao.ts`. Nenhuma linha desse trecho
  // é escrita antes de existir um provedor real para exercê-la — código de
  // caminho financeiro que nunca rodou é código que ninguém sabe se funciona.
  return NextResponse.json({ ok: false, erro: "nao_implementado" }, { status: 501 });
}
