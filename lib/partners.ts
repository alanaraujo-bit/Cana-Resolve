import { site } from "./site";

/**
 * Conteúdo da área de parceiros.
 *
 * Regra que vale para tudo aqui: nada de número inventado. Quantidade de
 * parceiros, de pedidos, de vagas restantes ou de retorno financeiro não
 * aparece porque ainda não existe. O que convence é a clareza do produto.
 */

export const founder = {
  price: "R$ 79",
  period: "primeiros 90 dias",
  priceValue: 79,
  periodDays: 90,
} as const;

/** Estrutura comercial prevista para depois da validação do beta. */
export const regularPlans = [
  { name: "Profissional", price: "a partir de R$79/mês", audience: "Para autônomos, MEIs e pequenos prestadores.", items: ["Perfil profissional, serviços e região atendida", "Contato por WhatsApp e presença na plataforma", "Participação em oportunidades compatíveis", "Acompanhamento básico"] },
  { name: "Empresarial", price: "previsão de R$129/mês", audience: "Para empresas mais estruturadas.", items: ["Perfil empresarial mais completo e portfólio ampliado", "Mais informações comerciais e múltiplos serviços", "Recursos de apresentação e conversão", "Métricas e acompanhamento mais completos"] },
  { name: "Destaque", price: "previsão de R$199/mês", audience: "Para quem deseja maior presença comercial na plataforma.", items: ["Maior destaque em categorias e buscas", "Posicionamentos patrocinados claramente identificados", "Recursos comerciais adicionais e métricas avançadas", "Benefícios premium futuros"] },
] as const;

/** O caminho de um pedido até virar conversa. Serve de fluxo e de passo a passo. */
export const partnerSteps = [
  {
    n: "01",
    beat: "Cadastro",
    title: "Sua empresa entra para a rede",
    text: "Você informa seus serviços, sua categoria e as regiões de Canaã que atende. É isso que define quais pedidos fazem sentido para você.",
  },
  {
    n: "02",
    beat: "O pedido nasce",
    title: "Alguém em Canaã descreve o que precisa",
    text: "Um morador ou uma empresa da cidade conta o problema com as próprias palavras: o que é, onde fica e para quando precisa.",
  },
  {
    n: "03",
    beat: "Encaminhamento",
    title: "O pedido pode ser encaminhado a quem atende aquela área",
    text: "Na primeira fase, o Canaã Resolve identifica a necessidade e a equipe encaminha a oportunidade aos parceiros compatíveis da categoria correspondente.",
  },
  {
    n: "04",
    beat: "Contato",
    title: "Você fala direto com a pessoa",
    text: "A partir daí a conversa é sua: disponibilidade, orçamento, prazo e condições. Ninguém entra no meio.",
  },
  {
    n: "05",
    beat: "Decisão",
    title: "O cliente decide com quem fechar",
    text: "A contratação e a execução acontecem entre você e o cliente. O valor combinado fica inteiro com quem fez o serviço.",
  },
];

export type DemoOpportunity = {
  id: string;
  categoria: string;
  categoriaId: string;
  bairro: string;
  descricao: string;
  urgencia: string;
};

/** Demonstração conceitual do produto — não são pedidos reais. */
export const demoOpportunities: DemoOpportunity[] = [
  {
    id: "ar",
    categoria: "Ar-condicionado",
    categoriaId: "ar-condicionado",
    bairro: "Jardim Europa",
    descricao: "O aparelho liga normalmente, mas não está gelando.",
    urgencia: "Hoje",
  },
  {
    id: "eletrica",
    categoria: "Elétrica",
    categoriaId: "eletricista",
    bairro: "Vale dos Carajás",
    descricao: "Instalação de novos pontos de tomada em uma residência.",
    urgencia: "Esta semana",
  },
  {
    id: "seguranca",
    categoria: "Segurança eletrônica",
    categoriaId: "seguranca",
    bairro: "Centro",
    descricao: "Quero orçamento para colocar câmeras na frente e no depósito da loja.",
    urgencia: "Sem pressa",
  },
];

export const benefits = [
  {
    title: "Pessoas com intenção real",
    text: "Quando alguém descreve uma necessidade, a equipe avalia se ela é compatível com a categoria e a região de atendimento do parceiro.",
  },
  {
    title: "Feito para Canaã",
    text: "A plataforma nasceu para Canaã dos Carajás e é voltada a quem precisa de serviços na cidade e a quem atende a cidade e a região.",
  },
  {
    title: "Contato direto",
    text: "Você conversa com o cliente no seu canal e no seu tom. Sem intermediário na negociação.",
  },
  {
    title: "Sem comissão sobre o serviço",
    text: "O valor combinado entre você e o cliente permanece entre vocês. Neste modelo inicial não há percentual sobre o trabalho.",
  },
  {
    title: "Presença profissional",
    text: "Um espaço adequado para apresentar seus serviços, sua área de atuação e o que ajuda o cliente a decidir.",
  },
  {
    title: "Acompanhamento das oportunidades",
    text: "Conforme o produto evolui, o parceiro passa a visualizar e acompanhar dentro da plataforma os pedidos que recebeu.",
    soon: true,
  },
];

/** Limites do papel da plataforma, ditos de forma direta e sem juridiquês. */
export const boundaries = [
  "Não somos empregadores dos profissionais parceiros.",
  "Não executamos o serviço nem respondemos por ele.",
  "Neste modelo inicial não recebemos o pagamento do cliente.",
  "A negociação acontece diretamente entre cliente e profissional.",
  "Não cobramos comissão sobre o valor do trabalho.",
];

export const founderIncludes = [
  {
    title: "Participação nas oportunidades da sua categoria",
    text: "O motivo de existir do programa: pedidos compatíveis com o que você faz chegam até você.",
    lead: true,
  },
  {
    title: "Contato com quem está procurando o serviço",
    text: "Você fala direto com a pessoa, sem intermediação na negociação.",
    lead: true,
  },
  {
    title: "Presença profissional no Canaã Resolve",
    text: "Seu espaço na plataforma, com os serviços que você oferece e as informações que o cliente precisa.",
  },
  {
    title: "Identificação de Parceiro Fundador",
    text: "A marca de quem participou da primeira fase do Canaã Resolve na cidade — pensada para continuar no perfil depois do beta.",
  },
  {
    title: "Rede inicial organizada por categoria",
    text: "A entrada é controlada por categoria para preservar a qualidade das oportunidades desde o início.",
  },
  {
    title: "Possível condição especial de renovação",
    text: "Quem ajudou a validar a primeira rede poderá receber uma condição especial depois; os detalhes serão comunicados quando estiverem definidos.",
  },
];

export const partnerFaq = [
  {
    q: "Como as oportunidades chegam até mim?",
    a: "Alguém descreve o que precisa no Canaã Resolve. Identificamos a categoria do pedido e ele é encaminhado aos parceiros que atuam naquela área e atendem a região. Nesta fase inicial o encaminhamento é feito pela nossa equipe, pelo WhatsApp que você cadastrar.",
  },
  {
    q: "Existe garantia de que vou receber clientes?",
    a: "Não, e não vamos prometer isso. O volume de pedidos depende do que a cidade procurar e do ritmo de crescimento da plataforma. Durante o beta, o que existe é a sua participação na rede e o encaminhamento de oportunidades compatíveis com a sua categoria e região.",
  },
  {
    q: "O Canaã Resolve cobra comissão sobre o serviço?",
    a: "Não. Neste modelo inicial a plataforma não fica com nenhuma parte do valor combinado entre você e o cliente, e não intermedia o pagamento. O que existe é a condição do programa de fundadores.",
  },
  {
    q: "Quantos profissionais recebem o mesmo pedido?",
    a: "Não há um número fechado ainda — seria inventar uma regra que o produto não tem. O que já está decidido é o princípio: a entrada é limitada por categoria justamente para evitar que muita gente dispute a mesma solicitação na fase inicial.",
  },
  {
    q: "Preciso ter empresa aberta? Autônomo pode participar?",
    a: "Autônomos podem participar e não é obrigatório ter CNPJ. Pedimos CPF ou CNPJ conforme o caso, para a análise cadastral, além de informações que confirmem que você presta aquele serviço em Canaã dos Carajás.",
  },
  {
    q: "Posso escolher quais serviços quero receber?",
    a: "Sim. Você define a sua categoria, os serviços que oferece e as regiões que atende — e é isso que determina quais pedidos fazem sentido encaminhar para você. Dá para ajustar depois, conversando com a equipe.",
  },
  {
    q: "O que significa ser Parceiro Fundador?",
    a: "É a identificação de quem participou da primeira fase do Canaã Resolve em Canaã dos Carajás. Ela representa a condição especial de lançamento e a contribuição para validar a primeira rede. A intenção é que continue no perfil mesmo depois do beta; fundadores também poderão receber uma condição especial de renovação, a ser comunicada quando definida.",
  },
  {
    q: "Quando começam os 90 dias?",
    a: "Com o início oficial da operação para moradores. A análise cadastral e a confirmação da vaga acontecem antes; nenhum dia do beta começa a contar durante essa etapa.",
  },
  {
    q: "O que acontece depois dos 90 dias?",
    a: "Você decide se quer continuar. A estrutura prevista tem os planos Profissional, Empresarial e Destaque, sujeitos a ajustes durante a validação. Não há fidelidade obrigatória depois do beta nem renovação automática silenciosa.",
  },
  {
    q: "Como a minha empresa será apresentada?",
    a: "Com o nome do profissional ou da empresa, a categoria, os serviços oferecidos, as regiões atendidas e o contato. À medida que a plataforma evolui, esse espaço ganha mais recursos de apresentação.",
  },
  {
    q: "Pagar me torna parceiro automaticamente?",
    a: "Não. Toda participação passa por uma análise cadastral simples antes de ser confirmada. É o que protege os clientes e a reputação de quem já está na rede. Se o cadastro não for aprovado, não há cobrança.",
  },
  {
    q: "Posso cancelar?",
    a: "Não há fidelidade obrigatória após o beta. Se quiser sair antes, a sua presença é retirada da plataforma a pedido. As regras completas ficam registradas por escrito no momento da confirmação, antes do pagamento — nada é combinado só de boca.",
  },
];

/** Como o parceiro chegou até aqui. Ajuda a saber quais canais funcionam. */
export const heardOptions = [
  { id: "whatsapp", label: "WhatsApp" },
  { id: "indicacao", label: "Indicação" },
  { id: "redes", label: "Redes sociais" },
  { id: "grupo", label: "Grupo da cidade" },
  { id: "qrcode", label: "QR Code ou material impresso" },
  { id: "outro", label: "Outro" },
];

/** O que a análise cadastral pode pedir depois — dito sem assustar. */
export const cadastroDepois = [
  "Nome do profissional ou da empresa e do responsável",
  "CPF ou CNPJ, conforme o caso",
  "Serviços oferecidos e regiões atendidas",
  "Presença online, se você tiver",
];

export const partnerSeo = {
  title: "Seja parceiro do Canaã Resolve",
  description: `Entre no beta do Canaã Resolve como Parceiro Fundador: ${founder.price} pelos ${founder.period}. Participe da primeira rede de profissionais e empresas de ${site.city}, sem comissão sobre o valor do serviço.`,
};
