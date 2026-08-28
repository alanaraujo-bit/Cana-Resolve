import { freio, ok, protegido } from "@/lib/api/respond";
import { listCatalog } from "@/lib/domain/catalog";

/**
 * As categorias e serviços que o formulário de pedido oferece.
 *
 * Pública e sem credencial, como a própria tela de `/solicitar`: quem vai
 * abrir um pedido ainda não tem token nenhum. O app não deve embutir esta
 * lista — o catálogo muda pelo Operations, e uma cópia congelada dentro do
 * binário só se corrige com uma versão nova na loja.
 */
export async function GET(request: Request) {
  return protegido("catalogo", async () => {
    const travado = freio(request, "app-catalogo", 60);
    if (travado) return travado;

    return ok({ categorias: await listCatalog({}) });
  });
}
