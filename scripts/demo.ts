/**
 * Dados de demonstração.
 *
 *   npm run demo:popular    cria um cenário completo para olhar as telas
 *   npm run demo:limpar     apaga tudo e devolve o sistema zerado
 *
 * Serve para duas coisas: revisar a interface com conteúdo de verdade (uma
 * tela vazia esconde metade dos problemas de layout) e para você conhecer o
 * sistema antes de colocar dado real dentro dele.
 *
 * `demo:limpar` apaga **tudo** — inclusive o que for real. É de propósito:
 * uma limpeza que tenta adivinhar o que é demonstração e o que não é acabaria
 * apagando a coisa errada um dia.
 */
import { sql } from "drizzle-orm";

import { db, getPool } from "@/lib/db/client";
import { operators } from "@/lib/db/schema";
import { receivePartnerApplication, receiveServiceRequest } from "@/lib/domain/intake";
import { createOpportunities, setOpportunityStatus } from "@/lib/domain/opportunities";
import {
  approveApplication,
  completeOnboarding,
  registerPayment,
  updatePartner,
} from "@/lib/domain/partners";
import { listApplications } from "@/lib/domain/partners";
import { createProspect, setProspectStatus } from "@/lib/domain/prospects";
import { setRequestStatus } from "@/lib/domain/requests";

async function operador() {
  const [row] = await db.select({ id: operators.id }).from(operators).limit(1);
  if (!row) throw new Error("Crie um operador primeiro: npm run db:operator");
  return { id: row.id };
}

const empresas = [
  {
    empresa: "Frio Norte Refrigeração",
    nome: "Cleiton Barbosa",
    telefone: "94 98401-1201",
    categoria: "ar-condicionado",
    servicos: ["Instalação de split", "Não está gelando", "Limpeza e higienização"],
    descricao: "Instalação, limpeza e manutenção de ar-condicionado residencial e comercial.",
    disponibilidade: "Seg a sáb, 7h às 18h",
  },
  {
    empresa: "Elétrica Carajás",
    nome: "Wesley Nunes",
    telefone: "94 98155-3390",
    categoria: "eletricista",
    servicos: ["Chuveiro elétrico", "Curto-circuito", "Quadro e disjuntores"],
    descricao: "Instalações e manutenção elétrica residencial.",
    disponibilidade: "Todos os dias, inclusive emergência",
  },
  {
    empresa: "Guincho 24h Canaã",
    nome: "Rodrigo Alves",
    telefone: "94 99677-8080",
    categoria: "guincho",
    servicos: ["Reboque", "Pane seca", "Bateria descarregada"],
    descricao: "Reboque e auto socorro na cidade e na BR.",
    disponibilidade: "24 horas",
  },
];

const pedidos = [
  {
    descricao: "Meu ar-condicionado liga, mas não está gelando. Já limpei o filtro e não resolveu.",
    categoria: "ar-condicionado",
    nome: "Maria Aparecida",
    telefone: "94 99201-4477",
    bairro: "Novo Horizonte",
    urgencia: "urgente",
  },
  {
    descricao: "Preciso de um eletricista para instalar um chuveiro novo no banheiro.",
    categoria: "eletricista",
    nome: "Jonas Ribeiro",
    telefone: "94 98844-1023",
    bairro: "Vila Bom Jesus",
    urgencia: "esta-semana",
  },
  {
    descricao: "Meu carro quebrou na BR-155 perto do trevo e preciso de guincho.",
    categoria: "guincho",
    nome: "Denise Moura",
    telefone: "94 99120-6612",
    bairro: null,
    urgencia: "urgente",
  },
  {
    descricao: "Quero orçamento para reformar o banheiro: piso, azulejo e box.",
    categoria: "construcao",
    nome: "Antônio Carlos",
    telefone: "94 98230-7745",
    bairro: "Centro",
    urgencia: "sem-pressa",
  },
];

async function popular() {
  const actor = await operador();

  // Empresas que se cadastraram sozinhas pelo site e foram aprovadas.
  for (const e of empresas) {
    await receivePartnerApplication({
      nome: e.nome,
      empresa: e.empresa,
      telefone: e.telefone,
      categoria: e.categoria,
      atendeCanaa: true,
      comoConheceu: "Instagram",
      origem: "instagram",
      atribuicao: { origem: "instagram" },
    });
  }

  const cadastros = await listApplications({ estado: "pendentes" });

  for (const { application } of cadastros) {
    const dados = empresas.find((e) => e.empresa === application.company);
    if (!dados) continue;

    const { partnerId } = await approveApplication({
      applicationId: application.id,
      actor,
      founder: true,
      categoryIds: [dados.categoria],
      notes: "Conferido: existe, atende Canaã e a categoria bate.",
    });

    const nomes = sql.join(
      dados.servicos.map((n) => sql`${n}`),
      sql`, `,
    );
    const servicos = await db.execute<{ id: string }>(sql`
      select id::text from services
      where category_id = ${dados.categoria} and name in (${nomes})
    `);

    await updatePartner({
      id: partnerId,
      name: dados.empresa,
      ownerName: dados.nome,
      whatsapp: dados.telefone,
      email: null,
      description: dados.descricao,
      document: null,
      availability: dados.disponibilidade,
      servesWholeCity: true,
      neighborhoods: [],
      categoryIds: [dados.categoria],
      serviceIds: servicos.rows.map((r) => r.id),
      notes: null,
    });

    await registerPayment({
      partnerId,
      method: "Pix",
      reference: null,
      paidAt: new Date(),
      notes: null,
      actor,
    });
    await completeOnboarding({ partnerId, actor });
  }

  // Empresas ainda no meio do funil.
  const emAndamento = [
    { nome: "Segurança Vale Camp", contato: "Fábio", tel: "94 98700-1188", cat: "seguranca", ate: "interessado" },
    { nome: "InfoTech Canaã", contato: "Larissa", tel: "94 99444-2210", cat: "informatica", ate: "pagina_enviada" },
    { nome: "Mecânica do Zé", contato: "José", tel: "94 98122-9034", cat: "mecanica", ate: "contatado" },
  ] as const;

  for (const p of emAndamento) {
    const criado = await createProspect({
      name: p.nome,
      contactName: p.contato,
      whatsapp: p.tel,
      categoryId: p.cat,
      source: "mapeamento",
      website: null,
      instagram: null,
      address: null,
      notes: null,
      actor,
    });

    const caminho = ["contatado", "interessado", "pagina_enviada"] as const;
    for (const etapa of caminho) {
      await setProspectStatus({ id: criado.id, to: etapa, actor });
      if (etapa === p.ate) break;
    }
  }

  // Pedidos de moradores.
  const criados: { id: string; categoria: string }[] = [];
  for (const p of pedidos) {
    const r = await receiveServiceRequest({
      descricao: p.descricao,
      categoria: p.categoria,
      nome: p.nome,
      telefone: p.telefone,
      bairro: p.bairro,
      urgencia: p.urgencia,
      consentimento: true,
      origem: "google",
      atribuicao: { origem: "google" },
    });
    criados.push({ id: r.id, categoria: p.categoria });
  }

  // O primeiro pedido percorre o ciclo inteiro; o segundo fica encaminhado; o
  // terceiro espera triagem; o quarto não tem parceiro na categoria ainda.
  const parceiros = await db.execute<{ id: string; category_id: string }>(sql`
    select p.id::text, pc.category_id
    from partners p join partner_categories pc on pc.partner_id = p.id
  `);
  const parceiroDe = (categoria: string) =>
    parceiros.rows.find((r) => r.category_id === categoria)?.id;

  const primeiro = criados[0];
  const parceiroAr = parceiroDe(primeiro.categoria);
  if (parceiroAr) {
    await createOpportunities({
      requestId: primeiro.id,
      partnerIds: [parceiroAr],
      actor,
      jaEnviado: true,
    });
    const [op] = await db.execute<{ id: string }>(sql`
      select id::text from opportunities where request_id = ${primeiro.id} limit 1
    `).then((r) => r.rows);
    await setOpportunityStatus({ id: op.id, to: "respondeu", actor });
    await setOpportunityStatus({ id: op.id, to: "contato_realizado", actor });
    await setOpportunityStatus({ id: op.id, to: "orcamento", actor, quoteAmountCents: 38000 });
    await setOpportunityStatus({ id: op.id, to: "contratado", actor });
  }

  const segundo = criados[1];
  const parceiroEletrica = parceiroDe(segundo.categoria);
  if (parceiroEletrica) {
    await createOpportunities({
      requestId: segundo.id,
      partnerIds: [parceiroEletrica],
      actor,
      jaEnviado: true,
    });
  }

  await setRequestStatus({ id: criados[2].id, to: "em_triagem", actor });
  await setRequestStatus({ id: criados[3].id, to: "em_triagem", actor });
  await setRequestStatus({
    id: criados[3].id,
    to: "sem_parceiro",
    actor,
    reason: "Nenhum parceiro de construção na rede ainda.",
  });

  console.log("Cenário de demonstração criado.");
  console.log("Rode `npm run demo:limpar` para zerar tudo antes de usar de verdade.");
}

async function limpar() {
  await db.execute(sql`
    truncate table
      activities, interactions, opportunities, service_requests,
      partner_applications, payments, partner_services, partner_categories,
      prospects, partners
    restart identity cascade
  `);
  await db.execute(sql`
    alter sequence service_request_code_seq restart with 1;
    alter sequence prospect_code_seq restart with 1;
    alter sequence partner_code_seq restart with 1;
  `);
  console.log("Banco zerado. Operadores, catálogo e configurações foram mantidos.");
}

const comando = process.argv[2];
const acao = comando === "limpar" ? limpar : comando === "popular" ? popular : null;

if (!acao) {
  console.error("Uso: tsx scripts/demo.ts popular | limpar");
  process.exit(1);
}

acao()
  .then(() => getPool().end())
  .catch(async (erro) => {
    console.error(erro);
    await getPool().end();
    process.exit(1);
  });
