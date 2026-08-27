import "server-only";

import { and, asc, desc, eq, isNotNull, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { categories, prospects, serviceRequests } from "@/lib/db/schema";
import { recentActivity } from "./activity";
import { launchedAt } from "./settings";

/**
 * O estado da operação.
 *
 * A pergunta que esta tela responde é "o que precisa de mim agora?", não
 * "quantos registros existem". Por isso quase tudo aqui conta o que está
 * **parado esperando alguém** — e não um total acumulado, que sobe para sempre
 * e nunca pede ação nenhuma.
 *
 * Todas as contagens saem de **uma** consulta. Não é micro-otimização: o banco
 * está em outro país, e cada ida e volta custa centenas de milissegundos. A
 * versão anterior disparava quinze consultas em paralelo e esgotava o pool de
 * conexões — a página abria com erro sob a menor concorrência.
 */

export type Pendencia = {
  id: string;
  label: string;
  hint: string;
  count: number;
  href: string;
};

type Contagens = {
  solicitacoes_atencao: number;
  solicitacoes_abertas: number;
  sem_parceiro: number;
  cadastros_pendentes: number;
  prospects_ativos: number;
  prospects_aguardando_pagamento: number;
  prospects_atrasados: number;
  parceiros_ativos: number;
  parceiros_aguardando: number;
  fundadores: number;
  oportunidades_vivas: number;
  aguardando_inicio_beta: number;
};

export async function loadDashboard() {
  const agora = new Date();

  const [numeros, atividade, lancamento, proximasAcoes] = await Promise.all([
    contagens(),
    recentActivity(14),
    launchedAt(),
    db
      .select({
        id: prospects.id,
        code: prospects.code,
        name: prospects.name,
        status: prospects.status,
        nextAction: prospects.nextAction,
        nextActionAt: prospects.nextActionAt,
      })
      .from(prospects)
      .where(
        and(
          isNotNull(prospects.nextActionAt),
          sql`${prospects.status} not in ('parceiro_fundador', 'nao_avancou')`,
        ),
      )
      .orderBy(asc(prospects.nextActionAt))
      .limit(6),
  ]);

  const pendencias: Pendencia[] = [
    {
      id: "solicitacoes",
      label: "Solicitações esperando triagem",
      hint: "Pedidos de moradores que ainda não foram lidos ou encaminhados.",
      count: numeros.solicitacoesAtencao,
      href: "/ops/solicitacoes?estado=abertas",
    },
    {
      id: "cadastros",
      label: "Cadastros para analisar",
      hint: "Empresas que se cadastraram pelo site e aguardam qualificação.",
      count: numeros.cadastrosPendentes,
      href: "/ops/cadastros",
    },
    {
      id: "pagamento",
      label: "Aguardando pagamento",
      hint: "Aprovados que ainda não confirmaram a condição de Fundador.",
      count: numeros.prospectsAguardandoPagamento,
      href: "/ops/comercial?estado=aguardando_pagamento",
    },
    {
      id: "retorno",
      label: "Retornos atrasados",
      hint: "Prospects com próxima ação marcada para uma data que já passou.",
      count: numeros.prospectsAtrasados,
      href: "/ops/comercial?filtro=atrasados",
    },
    {
      id: "sem-parceiro",
      label: "Sem parceiro disponível",
      hint: "Pedidos que a rede atual não conseguiu atender.",
      count: numeros.semParceiro,
      href: "/ops/solicitacoes?estado=sem_parceiro",
    },
  ].filter((p) => p.count > 0);

  return { agora, lancamento, pendencias, numeros, atividade, proximasAcoes };
}

/**
 * Doze contagens em uma ida ao banco.
 *
 * `count(*) filter (where …)` é do Postgres e faz exatamente isso: percorre a
 * tabela uma vez e devolve várias contagens. Escrito à mão porque nenhum
 * construtor de consulta expressa isso sem ficar mais difícil de ler do que o
 * SQL.
 */
async function contagens() {
  const { rows } = await db.execute<Contagens>(sql`
    select
      (select count(*) from service_requests
         where status in ('nova', 'em_triagem', 'pronta'))::int
        as solicitacoes_atencao,
      (select count(*) from service_requests
         where status in ('nova', 'em_triagem', 'pronta', 'encaminhada', 'em_atendimento'))::int
        as solicitacoes_abertas,
      (select count(*) from service_requests where status = 'sem_parceiro')::int
        as sem_parceiro,

      (select count(*) from partner_applications
         where status in ('recebido', 'em_analise'))::int
        as cadastros_pendentes,

      (select count(*) from prospects
         where status not in ('parceiro_fundador', 'nao_avancou', 'aguardando_pagamento'))::int
        as prospects_ativos,
      (select count(*) from prospects where status = 'aguardando_pagamento')::int
        as prospects_aguardando_pagamento,
      (select count(*) from prospects
         where next_action_at is not null
           and next_action_at <= now()
           and status not in ('parceiro_fundador', 'nao_avancou'))::int
        as prospects_atrasados,

      (select count(*) from partners where status = 'ativo')::int
        as parceiros_ativos,
      (select count(*) from partners where status = 'aguardando_lancamento')::int
        as parceiros_aguardando,
      (select count(*) from partners where founder)::int
        as fundadores,
      (select count(*) from partners
         where founder and beta_paid_at is not null
           and onboarding_done_at is not null and beta_started_at is null)::int
        as aguardando_inicio_beta,

      (select count(*) from opportunities
         where status in ('selecionado', 'encaminhado', 'respondeu',
                          'contato_realizado', 'orcamento'))::int
        as oportunidades_vivas
  `);

  const c = rows[0];
  return {
    solicitacoesAtencao: c.solicitacoes_atencao,
    solicitacoesAbertas: c.solicitacoes_abertas,
    semParceiro: c.sem_parceiro,
    cadastrosPendentes: c.cadastros_pendentes,
    prospectsAtivos: c.prospects_ativos,
    prospectsAguardandoPagamento: c.prospects_aguardando_pagamento,
    prospectsAtrasados: c.prospects_atrasados,
    parceirosAtivos: c.parceiros_ativos,
    parceirosAguardando: c.parceiros_aguardando,
    fundadores: c.fundadores,
    oportunidadesVivas: c.oportunidades_vivas,
    aguardandoInicioBeta: c.aguardando_inicio_beta,
  };
}

export async function latestRequests(limit = 8) {
  return db
    .select({
      id: serviceRequests.id,
      code: serviceRequests.code,
      description: serviceRequests.description,
      categoryId: serviceRequests.categoryId,
      categoryName: categories.name,
      status: serviceRequests.status,
      urgency: serviceRequests.urgency,
      neighborhood: serviceRequests.neighborhood,
      createdAt: serviceRequests.createdAt,
    })
    .from(serviceRequests)
    .leftJoin(categories, eq(categories.id, serviceRequests.categoryId))
    .orderBy(desc(serviceRequests.createdAt))
    .limit(limit);
}
