import { cx } from "@/components/ui";
import type { TimelineEntry } from "@/lib/domain/activity";
import { EmptyState, formatDateTime, timeAgo } from "./ui";

/**
 * A linha do tempo de um registro.
 *
 * Responde à pergunta que o estado sozinho não responde: **como isso chegou
 * aqui**. Mudanças automáticas e anotações de pessoas aparecem no mesmo fio,
 * porque para quem lê elas contam uma história só — o que muda é a marca à
 * esquerda: cheia quando alguém escreveu, vazada quando foi o sistema.
 */
export function Timeline({
  entries,
  vazio = "Nada aconteceu ainda.",
}: {
  entries: TimelineEntry[];
  vazio?: string;
}) {
  if (entries.length === 0) {
    return (
      <EmptyState
        title="Sem histórico"
        hint={vazio}
      />
    );
  }

  return (
    <ol className="relative px-4 py-3">
      {/* O fio que liga os acontecimentos. */}
      <span
        aria-hidden="true"
        className="bg-line absolute top-5 bottom-5 left-[1.3125rem] w-px"
      />
      {entries.map((entry) => (
        <li key={entry.id} className="relative flex gap-3 py-2">
          <span
            aria-hidden="true"
            className={cx(
              "bg-surface relative z-10 mt-[5px] h-[9px] w-[9px] shrink-0 rounded-full border-2",
              entry.kind === "interacao" ? "border-brand bg-brand" : "border-line-strong",
            )}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <p className="text-ink text-[0.875rem] leading-snug">{entry.summary}</p>
              <time
                dateTime={new Date(entry.at).toISOString()}
                title={formatDateTime(entry.at)}
                className="text-faint shrink-0 text-[0.75rem] whitespace-nowrap"
                suppressHydrationWarning
              >
                {timeAgo(entry.at)}
              </time>
            </div>
            {entry.body ? (
              <p className="text-muted mt-1 text-[0.875rem] leading-relaxed whitespace-pre-line">
                {entry.body}
              </p>
            ) : null}
            <p className="text-faint mt-0.5 text-[0.75rem]">
              {entry.operatorName ?? "Sistema"}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
