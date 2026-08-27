import { RouteTransition } from "@/components/route-transition";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

/**
 * O chrome do site público.
 *
 * Ficava no layout raiz. Saiu de lá quando o Operations nasceu: cabeçalho de
 * marca, rodapé institucional e transição de rota fazem sentido para o morador
 * e não fazem nenhum para quem está trabalhando dentro da operação.
 */
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <a
        href="#conteudo"
        className="bg-brand text-on-brand sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[60] focus:rounded-lg focus:px-4 focus:py-2 focus:text-sm focus:font-medium"
      >
        Pular para o conteúdo
      </a>
      <SiteHeader />
      <main id="conteudo" className="flex-1">
        <RouteTransition>{children}</RouteTransition>
      </main>
      <SiteFooter />
    </>
  );
}
