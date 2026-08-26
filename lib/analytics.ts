/**
 * Camada fina de eventos do funil comercial.
 *
 * Ainda não existe uma ferramenta de analytics contratada. Em vez de
 * escolher uma agora, os eventos são publicados em dois lugares neutros:
 * `window.dataLayer` (lido por GTM, GA4 e afins assim que um deles for
 * instalado) e um CustomEvent no documento, útil para depurar no console.
 * Nada aqui quebra se nenhuma ferramenta existir.
 */

export type FunnelEvent =
  | "parceiros_page_view"
  | "parceiros_cta_click"
  | "parceiros_form_start"
  | "parceiros_form_field"
  | "parceiros_form_error"
  | "parceiros_form_submit"
  | "parceiros_saida_sem_envio"
  | "parceiros_whatsapp_click"
  | "parceiros_faq_open"
  | "parceiros_section_view";

type Params = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

/** Origem da visita, para entender de onde vêm os parceiros. */
export function visitSource(): Params {
  if (typeof window === "undefined") return {};
  const url = new URL(window.location.href);
  const get = (k: string) => url.searchParams.get(k) ?? undefined;
  const ref = document.referrer;
  return {
    utm_source: get("utm_source"),
    utm_medium: get("utm_medium"),
    utm_campaign: get("utm_campaign"),
    utm_content: get("utm_content"),
    origem: get("origem") ?? get("utm_source") ?? (ref ? new URL(ref).host : "direto"),
    referrer: ref || undefined,
  };
}

export function track(event: FunnelEvent, params: Params = {}) {
  if (typeof window === "undefined") return;
  const payload = {
    event,
    ...params,
    página: window.location.pathname,
    ts: Date.now(),
  };
  try {
    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push(payload);
    document.dispatchEvent(new CustomEvent("cr:analytics", { detail: payload }));
  } catch {
    /* nunca deixar analytics derrubar a página */
  }
}
