import { formatPhone } from "./phone";

/**
 * As mensagens que a operação envia pelo WhatsApp.
 *
 * Ficam aqui, e não espalhadas pelas telas, por dois motivos: o texto que
 * chega ao parceiro é parte do produto — é a primeira coisa que ele associa ao
 * Canaã Resolve — e porque é aqui que se controla **o que sai**.
 *
 * O que o parceiro recebe é o necessário para atender: o problema, onde, a
 * urgência e como falar com a pessoa. Nada além disso. O morador autorizou o
 * encaminhamento para quem pode resolver, não a circulação dos dados dele.
 */

export type OportunidadeMensagem = {
  code: string;
  categoria: string | null;
  servico: string | null;
  descricao: string;
  bairro: string | null;
  urgencia: string | null;
  moradorNome: string;
  moradorWhatsapp: string;
};

const urgenciaTexto: Record<string, string> = {
  urgente: "É urgente — a pessoa precisa hoje",
  "esta-semana": "Pode ser agendado para esta semana",
  "sem-pressa": "Sem pressa — quer orçamento",
};

/** Primeiro nome, para a mensagem soar como gente e não como sistema. */
function primeiroNome(nome: string) {
  return nome.trim().split(/\s+/)[0] ?? nome;
}

export function oportunidadeMensagem(dados: OportunidadeMensagem) {
  return [
    `Olá! Chegou um pedido no Canaã Resolve que combina com o que você faz.`,
    "",
    `*Pedido ${dados.code}*`,
    dados.servico
      ? `*Serviço:* ${dados.servico}`
      : dados.categoria
        ? `*Categoria:* ${dados.categoria}`
        : null,
    "",
    `"${dados.descricao.trim()}"`,
    "",
    dados.bairro ? `*Onde:* ${dados.bairro}` : null,
    dados.urgencia ? `*Prazo:* ${urgenciaTexto[dados.urgencia] ?? dados.urgencia}` : null,
    "",
    `*Falar com:* ${primeiroNome(dados.moradorNome)} — ${formatPhone(dados.moradorWhatsapp)}`,
    "",
    "Se puder atender, fale direto com a pessoa. Se não puder agora, me avise aqui — assim eu encaminho para outro parceiro sem deixar o morador esperando.",
  ]
    .filter((linha) => linha !== null)
    .join("\n");
}

/** Mensagem para o morador, quando a operação avisa que encaminhou. */
export function moradorEncaminhadoMensagem(dados: {
  code: string;
  moradorNome: string;
  quantidade: number;
}) {
  const quem =
    dados.quantidade === 1
      ? "um parceiro que atende esse tipo de serviço"
      : `${dados.quantidade} parceiros que atendem esse tipo de serviço`;

  return [
    `Oi, ${primeiroNome(dados.moradorNome)}! Aqui é do Canaã Resolve.`,
    "",
    `Seu pedido *${dados.code}* foi encaminhado para ${quem} em Canaã.`,
    "",
    "Eles devem falar com você direto pelo WhatsApp. O combinado de preço e prazo é entre você e o profissional — a gente só faz a ponte.",
    "",
    "Se ninguém procurar você ou se já tiver resolvido, me avise por aqui.",
  ].join("\n");
}
