"use client";

import Link from "next/link";
import { track } from "@/lib/analytics";

/** Link de categoria com medição agregada; nunca inclui conteúdo do pedido. */
export function CategoryLink({
  category,
  href,
  className,
  children,
}: {
  category: string;
  href: string;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => track("consumidor_category_click", { categoria: category, local: "landing" })}
    >
      {children}
    </Link>
  );
}
