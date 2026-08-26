import type { ReactNode } from "react";
import { Container, Eyebrow } from "./ui";

export function LegalPage({
  eyebrow,
  title,
  updatedAt,
  children,
}: {
  eyebrow: string;
  title: string;
  updatedAt: string;
  children: ReactNode;
}) {
  return (
    <Container className="py-14 sm:py-20">
      <div className="mx-auto max-w-2xl">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="mt-4 text-[2rem] leading-[1.12] tracking-[-0.03em] text-balance sm:text-[2.5rem]">
          {title}
        </h1>
        <p className="text-faint mt-4 text-[0.8125rem]">
          Última atualização: {updatedAt}
        </p>

        <div
          className={[
            "mt-10 space-y-8",
            "[&_h2]:font-display [&_h2]:text-ink [&_h2]:text-xl [&_h2]:tracking-[-0.015em]",
            "[&_p]:text-muted [&_p]:mt-3 [&_p]:text-[0.9375rem] [&_p]:leading-relaxed",
            "[&_ul]:text-muted [&_ul]:mt-3 [&_ul]:space-y-2 [&_ul]:text-[0.9375rem] [&_ul]:leading-relaxed",
            "[&_li]:relative [&_li]:pl-5",
            "[&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:top-[0.6em] [&_li]:before:h-1 [&_li]:before:w-1 [&_li]:before:rounded-full [&_li]:before:bg-[var(--cr-brand)] [&_li]:before:content-['']",
            "[&_a]:text-brand-ink [&_a]:underline [&_a]:underline-offset-4",
          ].join(" ")}
        >
          {children}
        </div>
      </div>
    </Container>
  );
}
