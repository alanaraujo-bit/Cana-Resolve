import { residentFromRequest } from "@/lib/auth/bearer";
import { erro, freio, naoAutenticado, ok, protegido } from "@/lib/api/respond";
import { isDatabaseConfigured } from "@/lib/db/client";
import { residentRequests, residentState } from "@/lib/domain/audience";

/**
 * Tudo que este WhatsApp já pediu.
 *
 * O token do morador é verificado por HMAC, sem tocar no banco — por isso a
 * conferência de `isDatabaseConfigured()` é explícita aqui: sem ela, um
 * ambiente sem `DATABASE_URL` responderia 500 a um token perfeitamente válido.
 * No caminho do parceiro isso não aparece porque a sessão dele já mora no
 * banco, e sem banco não há sessão para encontrar.
 */
export async function GET(request: Request) {
  return protegido("morador/solicitacoes", async () => {
    const travado = freio(request, "app-morador", 60);
    if (travado) return travado;

    const viewer = residentFromRequest(request);
    if (!viewer) return naoAutenticado();
    if (!isDatabaseConfigured()) return erro("indisponivel", 503);

    const itens = await residentRequests(viewer.whatsapp);
    // O par título+explicação de cada estado vem do servidor porque é texto de
    // produto, não rótulo de tela: mudar "Procurando profissionais" não pode
    // exigir uma nova versão na loja.
    return ok({ itens: itens.map((item) => ({ ...item, estado: residentState(item.status) })) });
  });
}
