export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="9" className="fill-brand" />
      <path
        d="M16 6.6c-3.7 0-6.7 3-6.7 6.7 0 4.9 5.6 10.4 6.3 11.1a.6.6 0 0 0 .8 0c.7-.7 6.3-6.2 6.3-11.1 0-3.7-3-6.7-6.7-6.7Z"
        className="fill-none stroke-on-brand"
        strokeWidth="1.9"
      />
      <path
        d="m12.9 13.3 2.3 2.4 4.1-4.5"
        className="fill-none stroke-on-brand"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({
  className = "",
  markClassName = "h-8 w-8",
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className={markClassName} />
      <span className="font-display text-[1.0625rem] leading-none font-semibold tracking-[-0.02em] text-ink">
        Canaã{" "}
        <span className="text-brand-ink">Resolve</span>
      </span>
    </span>
  );
}
