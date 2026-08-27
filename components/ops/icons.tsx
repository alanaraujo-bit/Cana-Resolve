import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

/**
 * Ícones do Operations.
 *
 * Mesmo traço dos ícones do site — 24 de caixa, 1.5 de espessura, pontas
 * arredondadas — para que as duas metades do produto continuem parecendo a
 * mesma empresa. Aqui eles aparecem menores e quase sempre ao lado de texto,
 * então cada um precisa ser reconhecível a 18px, e não bonito a 48.
 */
function Base({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

/** Visão geral: o pulso da operação. */
export function IconPulse(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M3 12h3.5l2-5.5 3.5 11 2.5-7 1.6 3H21" />
    </Base>
  );
}

/** Comercial: o funil de prospecção. */
export function IconFunnel(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M3.5 5h17l-6.5 7.5V20l-4-2.2v-5.3z" />
    </Base>
  );
}

/** Cadastros aguardando análise. */
export function IconInbox(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M3.5 13.5V18a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-4.5" />
      <path d="M3.5 13.5 6 5.2A1.5 1.5 0 0 1 7.4 4h9.2a1.5 1.5 0 0 1 1.4 1.2l2.5 8.3" />
      <path d="M3.5 13.5h4l1.2 2.2h6.6l1.2-2.2h4" />
    </Base>
  );
}

/** Parceiros: a rede. */
export function IconNetwork(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="5.5" r="2.5" />
      <circle cx="5" cy="17.5" r="2.5" />
      <circle cx="19" cy="17.5" r="2.5" />
      <path d="M10.2 7.6 6.6 15.3M13.8 7.6l3.6 7.7M7.5 17.5h9" />
    </Base>
  );
}

/** Solicitações: o pedido do morador. */
export function IconRequest(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M20 12.5c0 3.9-3.6 7-8 7-1 0-2-.16-2.9-.46L4 20.5l1.6-3.7A6.6 6.6 0 0 1 4 12.5c0-3.9 3.6-7 8-7s8 3.1 8 7Z" />
      <path d="M9.4 10.6a2.6 2.6 0 0 1 5 .9c0 1.7-2.4 2-2.4 3.4" />
      <path d="M12 16.6h.01" />
    </Base>
  );
}

/** Oportunidades: o encaminhamento chegando a alguém. */
export function IconHandoff(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M3 8.5h11" />
      <path d="m10.5 5 3.5 3.5-3.5 3.5" />
      <path d="M21 15.5H10" />
      <path d="m13.5 12 -3.5 3.5 3.5 3.5" />
    </Base>
  );
}

/** Catálogo: categorias e serviços. */
export function IconCatalog(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="3.5" y="4" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="4" width="7" height="7" rx="1.6" />
      <rect x="3.5" y="13.5" width="7" height="6.5" rx="1.6" />
      <rect x="13.5" y="13.5" width="7" height="6.5" rx="1.6" />
    </Base>
  );
}

/** Analytics. */
export function IconChart(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 20V4" />
      <path d="M4 20h16" />
      <path d="M8 20v-6M12.5 20V8.5M17 20v-9" />
    </Base>
  );
}

export function IconGear(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2M12 18.5v2M20.5 12h-2M5.5 12h-2M17.8 6.2l-1.4 1.4M7.6 16.4l-1.4 1.4M17.8 17.8l-1.4-1.4M7.6 7.6 6.2 6.2" />
    </Base>
  );
}

export function IconMore(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="5.5" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="18.5" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 5v14M5 12h14" />
    </Base>
  );
}

export function IconChevronLeft(props: IconProps) {
  return (
    <Base {...props}>
      <path d="m14.5 5-7 7 7 7" />
    </Base>
  );
}

export function IconChevronRight(props: IconProps) {
  return (
    <Base {...props}>
      <path d="m9.5 5 7 7-7 7" />
    </Base>
  );
}

export function IconExit(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M15 4.5h3.5a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H15" />
      <path d="M11 8.5 14.5 12 11 15.5" />
      <path d="M14 12H4" />
    </Base>
  );
}

export function IconUser(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </Base>
  );
}

export function IconFlag(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M5.5 21V4" />
      <path d="M5.5 5h11l-1.8 3.6L16.5 12h-11" />
    </Base>
  );
}
