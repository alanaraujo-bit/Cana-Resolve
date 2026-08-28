import "server-only";

import { destinosDoParceiro, invalidarToken, type Destino } from "./dispositivos";
import { canalDoTipo, conferirPrivacidade, type Aviso } from "./mensagens";

/**
 * A entrega.
 *
 * O provedor é o **Expo Push Service**, e a escolha tem um motivo prático: ele
 * fala com o APNs e com o FCM pelos dois lados, então o servidor guarda um
 * formato de token só e o dia de publicar não muda este arquivo — muda a
 * credencial, que é o que o `BLOCKERS.md` registra.
 *
 * O que este arquivo **não** faz, de propósito:
 *
 * - Não cria a oportunidade. Push é sinalização; a oportunidade existe no
 *   banco antes e independentemente da entrega (§74, §75).
 * - Não promete entrega. `enviar` devolve o que o provedor aceitou, e aceito
 *   não é visto (§94). Nada no produto depende de o push chegar (§76).
 * - Não expõe uma rota HTTP. Quem dispara é código do servidor ou o script de
 *   `scripts/push-teste.ts` — não existe endpoint público de envio para
 *   proteger, o que é a forma mais barata de atender o §117.
 */

const EXPO_ENDPOINT = "https://exp.host/--/api/v2/push/send";

export type ResultadoDeEnvio = {
  /** Quantos endereços o provedor aceitou. */
  aceitos: number;
  /** Endereços que o provedor recusou definitivamente e já foram revogados. */
  invalidados: number;
  /** Aparelhos encontrados para esta conta. Zero é informação, não erro. */
  destinos: number;
  /** Motivos de recusa, para diagnóstico. Nunca contém token. */
  recusas: string[];
  /** `true` quando nada foi enviado por já ter sido enviado antes (§48). */
  duplicado: boolean;
};

/**
 * Memória curta de acontecimentos já enviados.
 *
 * O caso que ela resolve é o do §48: uma retentativa interna disparando o
 * mesmo evento três vezes em segundos. Ela **não** é um registro durável de
 * entrega, e não finge ser — o processo reiniciar esquece tudo. A garantia
 * forte pertence a quem cria o evento (uma oportunidade só nasce uma vez, e a
 * chave sai do id dela); isto é o cinto sobre o suspensório.
 */
const JANELA_MS = 10 * 60_000;
const jaEnviados = new Map<string, number>();

function repetido(chave: string): boolean {
  const agora = Date.now();
  for (const [k, quando] of jaEnviados) {
    if (agora - quando > JANELA_MS) jaEnviados.delete(k);
  }
  const visto = jaEnviados.get(chave);
  if (visto !== undefined) return true;
  jaEnviados.set(chave, agora);
  return false;
}

/** Só para os testes: esquece a janela de deduplicação. */
export function esquecerEnvios(): void {
  jaEnviados.clear();
}

type MensagemExpo = {
  to: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  sound: "default";
  channelId: string;
  /**
   * O agrupamento no Notification Center. Várias oportunidades em pouco tempo
   * viram uma pilha, não uma enxurrada (§49).
   */
  categoryId?: string;
  badge?: number;
  priority: "default" | "high";
};

function comoMensagem(destino: Destino, aviso: Aviso, badge?: number): MensagemExpo {
  return {
    to: destino.pushToken,
    title: aviso.titulo,
    body: aviso.corpo,
    data: { ...aviso.carga },
    // O som padrão da plataforma. Nada personalizado, nada de sirene (§39).
    sound: "default",
    channelId: canalDoTipo[aviso.carga.tipo],
    categoryId: aviso.grupo,
    badge,
    /**
     * `high` para oportunidade porque ela perde valor com o tempo — e é só
     * prioridade de entrega, não `time-sensitive` nem `critical`: uma
     * oportunidade comercial não fura o Foco de ninguém (§41).
     */
    priority: aviso.carga.tipo === "oportunidade.nova" ? "high" : "default",
  };
}

type RespostaExpo = {
  data?: { status: "ok" | "error"; id?: string; message?: string; details?: { error?: string } }[];
  errors?: { message: string }[];
};

/**
 * Manda um aviso para todos os aparelhos ativos de um parceiro.
 *
 * Falhar aqui nunca deve derrubar quem chamou: criar a oportunidade é o que
 * importa, e o push é o aviso. Por isso os erros viram resultado, e não
 * exceção — exceto os dois que significam "este código está errado" e precisam
 * aparecer em desenvolvimento: privacidade violada e falta de credencial.
 */
export async function enviar(aviso: Aviso, badge?: number): Promise<ResultadoDeEnvio> {
  // A rede do §11 é conferida antes de qualquer coisa: um texto que vaza dado
  // pessoal não é enviado com aviso — não é enviado.
  const problema = conferirPrivacidade(aviso);
  if (problema) {
    throw new Error(
      `Aviso recusado: o ${problema.campo} parece conter ${problema.suspeita}. ` +
        "Nenhum dado pessoal pode aparecer na tela bloqueada — ver lib/push/mensagens.ts.",
    );
  }

  const vazio: ResultadoDeEnvio = {
    aceitos: 0,
    invalidados: 0,
    destinos: 0,
    recusas: [],
    duplicado: false,
  };

  if (repetido(aviso.carga.evento)) return { ...vazio, duplicado: true };

  const destinos = await destinosDoParceiro(aviso.carga.para);
  if (destinos.length === 0) return vazio;

  const mensagens = destinos.map((d) => comoMensagem(d, aviso, badge));

  let resposta: RespostaExpo;
  try {
    const http = await fetch(EXPO_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        // O Access Token só é exigido quando a conta Expo tem "Enhanced
        // Security" ligada. Sem ele o envio funciona; ver BLOCKERS.md.
        ...(process.env.EXPO_ACCESS_TOKEN
          ? { authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` }
          : {}),
      },
      body: JSON.stringify(mensagens),
    });

    if (!http.ok) {
      return {
        ...vazio,
        destinos: destinos.length,
        recusas: [`provedor respondeu ${http.status}`],
      };
    }

    resposta = (await http.json()) as RespostaExpo;
  } catch (error) {
    // Provedor fora do ar não é falha do produto: a oportunidade continua lá,
    // e a Central a mostra quando o parceiro abrir (§76, §97).
    return {
      ...vazio,
      destinos: destinos.length,
      recusas: [error instanceof Error ? error.message : "falha de rede"],
    };
  }

  const tickets = resposta.data ?? [];
  const recusas: string[] = (resposta.errors ?? []).map((e) => e.message);
  let aceitos = 0;
  let invalidados = 0;

  for (let i = 0; i < tickets.length; i += 1) {
    const ticket = tickets[i];
    const destino = destinos[i];

    if (ticket.status === "ok") {
      aceitos += 1;
      continue;
    }

    recusas.push(ticket.details?.error ?? ticket.message ?? "recusa sem motivo");

    // O único caso em que o provedor diz "este endereço morreu". Insistir
    // depois disso é gastar entrega num aparelho que não existe (§59).
    if (ticket.details?.error === "DeviceNotRegistered" && destino) {
      invalidados += await invalidarToken(destino.pushToken);
    }
  }

  return { aceitos, invalidados, destinos: destinos.length, recusas, duplicado: false };
}
