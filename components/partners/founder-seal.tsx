import { cx } from "@/components/ui";

/**
 * Selo de Parceiro Fundador.
 *
 * Nada de dourado, medalha ou troféu: um sinete de traço fino, com as
 * curvas de nível que já são a textura da marca. Ele é desenhado em
 * `currentColor` justamente para poder continuar aparecendo no perfil do
 * parceiro depois do lançamento, em qualquer tamanho e nos dois temas.
 */
export function FounderSeal({
  className = "",
  id = "selo-fundador",
  spin = false,
}: {
  className?: string;
  id?: string;
  /** Gira o anel de texto devagar. Só faz sentido nos tamanhos grandes. */
  spin?: boolean;
}) {
  const ring = `${id}-anel`;
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <defs>
        <path
          id={ring}
          d="M50 12a38 38 0 1 1 0 76 38 38 0 1 1 0-76"
        />
      </defs>

      <circle cx="50" cy="50" r="47" stroke="currentColor" strokeWidth="0.9" opacity="0.55" />
      <circle cx="50" cy="50" r="30.5" stroke="currentColor" strokeWidth="0.9" opacity="0.35" />

      <text
        className={spin ? "cr-seal-ring" : undefined}
        fill="currentColor"
        fontSize="7.6"
        fontWeight="600"
        letterSpacing="2.35"
        style={{ textTransform: "uppercase" }}
      >
        <textPath href={`#${ring}`} startOffset="50%" textAnchor="middle">
          Parceiro Fundador · Canaã Resolve ·
        </textPath>
      </text>

      {/* Curvas de nível: a mesma referência topográfica do resto da marca. */}
      <g stroke="currentColor" strokeLinecap="round" fill="none">
        <path d="M35 60c4-11 11-16.5 15-16.5S61 49 65 60" strokeWidth="1.5" />
        <path d="M40.5 60c2.6-7 6.4-10.4 9.5-10.4S56.9 53 59.5 60" strokeWidth="1.2" opacity="0.75" />
        <path d="M45.5 60c1.3-3.4 3.1-5 4.5-5s3.2 1.6 4.5 5" strokeWidth="1" opacity="0.5" />
      </g>
      <circle cx="50" cy="37" r="1.9" fill="currentColor" />
    </svg>
  );
}

/** Versão em linha, para listas, cards e — no futuro — o perfil do parceiro. */
export function FounderBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={cx(
        "border-accent-line bg-accent-soft text-accent-ink inline-flex items-center gap-2 rounded-full border py-1 pr-3.5 pl-1.5",
        "text-[0.6875rem] font-semibold tracking-[0.12em] uppercase",
        className,
      )}
    >
      <FounderSeal className="h-5 w-5 shrink-0" id="selo-fundador-inline" />
      Parceiro Fundador
    </span>
  );
}
