import type { ReactNode } from "react";

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("mx-auto w-full max-w-[74rem] px-5 sm:px-8", className)}>
      {children}
    </div>
  );
}

type Variant = "brand" | "accent" | "outline" | "ghost" | "surface";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  brand:
    "bg-brand text-on-brand hover:bg-brand-hover shadow-hair active:translate-y-px",
  accent:
    "bg-accent text-on-accent hover:brightness-[1.07] shadow-hair active:translate-y-px",
  outline:
    "border border-line-strong text-ink hover:bg-surface-2 hover:border-brand-line active:translate-y-px",
  surface:
    "bg-surface text-ink border border-line hover:border-line-strong shadow-hair active:translate-y-px",
  ghost: "text-muted hover:text-ink hover:bg-surface-2",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[0.8125rem] gap-1.5 rounded-lg",
  md: "h-11 px-5 text-[0.9375rem] gap-2 rounded-xl",
  lg: "h-[3.25rem] px-6 text-base gap-2 rounded-xl",
};

export function buttonClass(
  variant: Variant = "brand",
  size: Size = "md",
  className = "",
) {
  return cx(
    "inline-flex select-none items-center justify-center font-medium",
    "transition-[background-color,border-color,color,transform,filter] duration-150",
    "disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Eyebrow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cx(
        "flex items-center gap-2.5 text-[0.6875rem] font-semibold tracking-[0.16em] text-faint uppercase",
        className,
      )}
    >
      <span aria-hidden="true" className="bg-brand h-px w-6 opacity-60" />
      {children}
    </p>
  );
}

export function SectionHead({
  eyebrow,
  title,
  lead,
  align = "left",
  className = "",
}: {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={cx(
        "max-w-2xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      {eyebrow ? (
        <Eyebrow className={align === "center" ? "justify-center" : ""}>
          {eyebrow}
        </Eyebrow>
      ) : null}
      <h2 className="mt-4 text-[1.75rem] leading-[1.15] text-balance sm:text-[2.125rem] lg:text-[2.5rem]">
        {title}
      </h2>
      {lead ? (
        <p className="mt-4 text-[1.0625rem] leading-relaxed text-pretty text-muted">
          {lead}
        </p>
      ) : null}
    </div>
  );
}

export function Section({
  id,
  children,
  className = "",
}: {
  id?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cx("py-20 sm:py-24 lg:py-28", className)}>
      {children}
    </section>
  );
}
