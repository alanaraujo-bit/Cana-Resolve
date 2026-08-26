import { Container } from "@/components/ui";

/** Esqueleto exibido enquanto a rota carrega — mesma malha da página real. */
export default function Loading() {
  return (
    <Container className="py-12 sm:py-16 lg:py-20">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.35fr] lg:gap-16">
        <div className="animate-pulse space-y-4">
          <div className="bg-surface-3 h-3 w-32 rounded" />
          <div className="bg-surface-3 h-10 w-4/5 rounded" />
          <div className="bg-surface-3 h-10 w-3/5 rounded" />
          <div className="bg-surface-3 h-4 w-full rounded" />
          <div className="bg-surface-3 h-4 w-2/3 rounded" />
        </div>
        <div className="border-line bg-surface animate-pulse rounded-2xl border p-6 sm:p-9">
          <div className="space-y-4">
            <div className="bg-surface-3 h-4 w-52 rounded" />
            <div className="bg-surface-3 h-28 w-full rounded-xl" />
            <div className="bg-surface-3 h-4 w-24 rounded" />
            <div className="bg-surface-3 h-10 w-full rounded-xl" />
            <div className="bg-surface-3 h-12 w-full rounded-xl" />
            <div className="bg-surface-3 h-12 w-full rounded-xl" />
          </div>
        </div>
      </div>
      <span className="sr-only" role="status">
        Carregando o formulário de solicitação
      </span>
    </Container>
  );
}
