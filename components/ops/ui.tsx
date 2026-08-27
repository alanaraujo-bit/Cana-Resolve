import type { ReactNode } from "react";

import { cx } from "@/components/ui";
import { stateMeta, type MachineName, type Tone } from "@/lib/domain/states";

/**
 * As peças do Operations.
 *
 * A régua aqui é diferente da do site público. Lá, o objetivo é convencer;
 * aqui, é trabalhar — alguém vai passar horas nesta interface. Então a
 * densidade é maior, os tipos são menores, as linhas são mais próximas e o
 * espaço em branco existe para separar assuntos, não para impressionar.
 *
 * Continua sendo o mesmo produto: as mesmas cores, as mesmas superfícies, o
 * mesmo cuidado. O que muda é o tom de voz.
 */

/* ---------------------------------------------------------------
   Superfícies
   --------------------------------------------------------------- */

export function Panel({
  children,
  className = "",
  as: Tag = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article";
}) {
  return (
    <Tag
      className={cx(
        "border-line bg-surface shadow-hair rounded-xl border",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function PanelHeader({
  title,
  hint,
  actions,
  className = "",
}: {
  title: ReactNode;
  hint?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "border-line flex items-start justify-between gap-4 border-b px-4 py-3",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-ink font-sans text-[0.9375rem] leading-tight font-semibold tracking-normal">
          {title}
        </h2>
        {hint ? (
          <p className="text-faint mt-0.5 text-[0.8125rem] leading-snug">{hint}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/* ---------------------------------------------------------------
   Cabeçalho de página
   --------------------------------------------------------------- */

export function PageHeader({
  eyebrow,
  title,
  lead,
  actions,
  children,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="mb-6">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-faint text-[0.6875rem] font-semibold tracking-[0.14em] uppercase">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-1.5 text-[1.5rem] leading-tight tracking-[-0.025em] sm:text-[1.75rem]">
            {title}
          </h1>
          {lead ? (
            <p className="text-muted mt-1.5 max-w-2xl text-[0.9375rem] leading-relaxed">
              {lead}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {children ? <div className="mt-5">{children}</div> : null}
    </header>
  );
}

/* ---------------------------------------------------------------
   Selos de estado
   --------------------------------------------------------------- */

const toneClass: Record<Tone, string> = {
  neutral: "bg-surface-3 text-muted border-line-strong",
  progress: "bg-brand-soft text-brand-ink border-brand-line",
  attention: "bg-accent-soft text-accent-ink border-accent-line",
  positive: "bg-brand-soft text-brand-ink border-brand-line",
  negative: "bg-danger-soft text-danger border-danger/25",
};

/** Um ponto antes do rótulo separa "positivo" de "em progresso" sem cor nova. */
const toneDot: Record<Tone, string> = {
  neutral: "bg-line-strong",
  progress: "bg-brand/50",
  attention: "bg-accent",
  positive: "bg-brand",
  negative: "bg-danger",
};

export function Badge({
  children,
  tone = "neutral",
  title,
  className = "",
  dot = true,
}: {
  children: ReactNode;
  tone?: Tone;
  title?: string;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      title={title}
      className={cx(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-[3px]",
        "text-[0.75rem] leading-none font-medium whitespace-nowrap",
        toneClass[tone],
        className,
      )}
    >
      {dot ? (
        <span
          aria-hidden="true"
          className={cx("h-1.5 w-1.5 shrink-0 rounded-full", toneDot[tone])}
        />
      ) : null}
      {children}
    </span>
  );
}

/** O selo de um estado, com a explicação do estado no `title`. */
export function StatusBadge({
  machine,
  status,
  className = "",
}: {
  machine: MachineName;
  status: string | null | undefined;
  className?: string;
}) {
  const meta = stateMeta(machine, status);
  if (!meta) return <span className="text-faint text-[0.8125rem]">—</span>;
  return (
    <Badge tone={meta.tone} title={meta.hint} className={className}>
      {meta.label}
    </Badge>
  );
}

/* ---------------------------------------------------------------
   Listas e tabelas
   --------------------------------------------------------------- */

export function TableShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    // A rolagem horizontal fica presa aqui dentro: a página nunca anda de lado.
    <div className={cx("w-full overflow-x-auto", className)}>
      <table className="w-full min-w-[46rem] border-collapse text-left">
        {children}
      </table>
    </div>
  );
}

export function Th({
  children,
  className = "",
  align = "left",
}: {
  children?: ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}) {
  return (
    <th
      scope="col"
      className={cx(
        "border-line bg-surface-2 text-faint sticky top-0 z-10 border-b",
        "px-3 py-2 text-[0.6875rem] font-semibold tracking-[0.08em] uppercase",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className = "",
  align = "left",
}: {
  children?: ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}) {
  return (
    <td
      className={cx(
        "border-line border-b px-3 py-2.5 align-middle text-[0.875rem]",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
    >
      {children}
    </td>
  );
}

export function Tr({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <tr className={cx("hover:bg-surface-2/70 transition-colors", className)}>
      {children}
    </tr>
  );
}

/* ---------------------------------------------------------------
   Estados vazios
   --------------------------------------------------------------- */

export function EmptyState({
  title,
  hint,
  action,
  className = "",
}: {
  title: string;
  hint?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("px-6 py-12 text-center", className)}>
      <p className="text-ink font-sans text-[0.9375rem] font-medium">{title}</p>
      {hint ? (
        <p className="text-muted mx-auto mt-1.5 max-w-sm text-[0.875rem] leading-relaxed">
          {hint}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/* ---------------------------------------------------------------
   Números e pares de informação
   --------------------------------------------------------------- */

export function Metric({
  label,
  value,
  hint,
  tone,
  href,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: Tone;
  href?: string;
}) {
  const body = (
    <>
      <p className="text-faint text-[0.75rem] leading-none font-medium tracking-[0.04em] uppercase">
        {label}
      </p>
      <p
        className={cx(
          "mt-2 font-sans text-[1.75rem] leading-none font-semibold tabular-nums",
          tone === "attention" ? "text-accent-ink" : "text-ink",
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className="text-faint mt-1.5 text-[0.8125rem] leading-snug">{hint}</p>
      ) : null}
    </>
  );

  const className = cx(
    "border-line bg-surface shadow-hair block rounded-xl border px-4 py-3.5",
    href && "hover:border-line-strong hover:bg-surface-2/60 transition-colors",
  );

  if (href) {
    return (
      <a href={href} className={className}>
        {body}
      </a>
    );
  }
  return <div className={className}>{body}</div>;
}

export function KeyValue({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("min-w-0", className)}>
      <dt className="text-faint text-[0.75rem] font-medium tracking-[0.03em] uppercase">
        {label}
      </dt>
      <dd className="text-ink mt-1 text-[0.9375rem] leading-snug break-words">
        {children}
      </dd>
    </div>
  );
}

/** Um valor que ainda não existe. Melhor do que um espaço vazio ambíguo. */
export function Dash() {
  return <span className="text-faint">—</span>;
}

/* ---------------------------------------------------------------
   Datas
   --------------------------------------------------------------- */

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const dateTimeFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  return dateFmt.format(new Date(value));
}

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "—";
  return dateTimeFmt.format(new Date(value));
}

/**
 * "há 3 dias". Em uma operação, o tempo decorrido diz mais do que a data:
 * o que importa é que aquele pedido está parado há dois dias, não que ele
 * entrou numa terça.
 */
export function timeAgo(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  const future = seconds < 0;
  const abs = Math.abs(seconds);

  const say = (n: number, singular: string, plural: string) =>
    future
      ? `em ${n} ${n === 1 ? singular : plural}`
      : `há ${n} ${n === 1 ? singular : plural}`;

  if (abs < 60) return future ? "agora" : "agora mesmo";
  if (abs < 3600) return say(Math.round(abs / 60), "minuto", "minutos");
  if (abs < 86400) return say(Math.round(abs / 3600), "hora", "horas");
  if (abs < 2592000) return say(Math.round(abs / 86400), "dia", "dias");
  if (abs < 31536000) return say(Math.round(abs / 2592000), "mês", "meses");
  return say(Math.round(abs / 31536000), "ano", "anos");
}

/** Data completa no `title`, tempo decorrido na tela. */
export function When({ value }: { value: Date | string | null | undefined }) {
  if (!value) return <Dash />;
  return (
    <time
      dateTime={new Date(value).toISOString()}
      title={formatDateTime(value)}
      className="whitespace-nowrap"
      // O minuto pode virar entre o servidor e o navegador. A informação que
      // vale — a data exata — está no dateTime e no title.
      suppressHydrationWarning
    >
      {timeAgo(value)}
    </time>
  );
}

/* ---------------------------------------------------------------
   A mesma lista, em dois formatos
   --------------------------------------------------------------- */

/**
 * Uma tabela só faz sentido onde cabem colunas. No celular, a mesma informação
 * vira cartão: título, um selo e duas ou três linhas de apoio. Não é a tabela
 * espremida — é outro desenho para o mesmo conteúdo.
 *
 * As duas versões vivem lado a lado e o CSS escolhe. Renderizar as duas custa
 * pouco (é a mesma consulta) e evita o pior dos mundos: uma decisão de layout
 * tomada no servidor, sem saber o tamanho da tela.
 */
export function Responsive({
  tabela,
  cartoes,
}: {
  tabela: ReactNode;
  cartoes: ReactNode;
}) {
  return (
    <>
      <div className="hidden lg:block">{tabela}</div>
      <div className="lg:hidden">{cartoes}</div>
    </>
  );
}

export function CardList({ children }: { children: ReactNode }) {
  return <ul className="divide-line divide-y">{children}</ul>;
}

export function CardRow({
  href,
  titulo,
  selo,
  meta,
  detalhe,
  rodape,
}: {
  href: string;
  titulo: ReactNode;
  selo?: ReactNode;
  /** Linha curta de identificação: código, responsável, telefone. */
  meta?: ReactNode;
  /** O corpo — a descrição do problema, por exemplo. */
  detalhe?: ReactNode;
  rodape?: ReactNode;
}) {
  return (
    <li>
      <a
        href={href}
        className="active:bg-surface-2 block px-4 py-3.5 transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <span className="text-ink min-w-0 flex-1 text-[0.9375rem] leading-snug font-medium">
            {titulo}
          </span>
          {selo ? <span className="shrink-0">{selo}</span> : null}
        </div>
        {meta ? (
          <p className="text-faint mt-1 text-[0.75rem] leading-snug">{meta}</p>
        ) : null}
        {detalhe ? (
          <p className="text-muted mt-1.5 line-clamp-2 text-[0.875rem] leading-snug">
            {detalhe}
          </p>
        ) : null}
        {rodape ? (
          <p className="text-faint mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem]">
            {rodape}
          </p>
        ) : null}
      </a>
    </li>
  );
}

/** Rodapé de lista: total à esquerda, paginação à direita. */
export function ListFooter({
  total,
  singular,
  plural,
  children,
}: {
  total: number;
  singular: string;
  plural: string;
  children?: ReactNode;
}) {
  return (
    <div className="text-faint flex items-center justify-between gap-3 px-4 py-2.5 text-[0.8125rem]">
      <span>
        {total} {total === 1 ? singular : plural}
      </span>
      {children}
    </div>
  );
}
