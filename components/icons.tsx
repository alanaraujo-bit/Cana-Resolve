import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

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

/* ---------- categorias ---------- */

export function IconAr(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="2.5" y="4.5" width="19" height="7.5" rx="2" />
      <path d="M6 8.25h8" />
      <path d="M6 15.5c1.2 0 1.2 1.6 2.4 1.6s1.2-1.6 2.4-1.6" />
      <path d="M11.8 18.6c1.2 0 1.2 1.6 2.4 1.6s1.2-1.6 2.4-1.6" />
    </Base>
  );
}

export function IconEletricista(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M13.5 2.5 5 13h5.5L9.8 21.5 18.5 11H13z" />
    </Base>
  );
}

export function IconGuincho(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M2.5 16.5V9h8l3 3.5h6.5a1.5 1.5 0 0 1 1.5 1.5v2.5" />
      <circle cx="7" cy="18.5" r="2" />
      <circle cx="17.5" cy="18.5" r="2" />
      <path d="M9 18.5h6.5" />
      <path d="M4 9V6.5h4.5L14 3" />
    </Base>
  );
}

export function IconMecanica(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M15.6 3.4a5 5 0 0 0-6.2 6.2L3 16v5h5l6.4-6.4a5 5 0 0 0 6.2-6.2l-3 3-3.2-.8-.8-3.2z" />
      <path d="M6.5 17.5h.01" />
    </Base>
  );
}

export function IconConstrucao(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M2.5 8.5h19" />
      <path d="M2.5 15.5h19" />
      <path d="M2.5 4.5v15" />
      <path d="M21.5 4.5v15" />
      <path d="M8.5 4.5v4M15.5 4.5v4M5.5 8.5v7M12 8.5v7M18.5 8.5v7M8.5 15.5v4M15.5 15.5v4" />
    </Base>
  );
}

export function IconSeguranca(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M3 7.8 17.4 4l1.3 5-14.4 3.8z" />
      <path d="M6.2 12.2 7.5 17" />
      <path d="M18.7 9 21 8.4" />
      <path d="M5.5 17h5.5l-2.5 4H8z" />
    </Base>
  );
}

export function IconInformatica(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="2.5" y="4.5" width="19" height="12" rx="2" />
      <path d="M8 20.5h8" />
      <path d="M12 16.5v4" />
      <path d="M7.5 9.5 10 12l-2.5 2.5" />
      <path d="M12.5 14.5h4" />
    </Base>
  );
}

export const categoryIcons: Record<string, (p: IconProps) => React.ReactElement> = {
  "ar-condicionado": IconAr,
  eletricista: IconEletricista,
  guincho: IconGuincho,
  mecanica: IconMecanica,
  construcao: IconConstrucao,
  seguranca: IconSeguranca,
  informatica: IconInformatica,
};

/* ---------- interface ---------- */

export function IconSearch(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </Base>
  );
}

export function IconArrowRight(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4.5 12h14" />
      <path d="m13 6.5 5.5 5.5-5.5 5.5" />
    </Base>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <Base {...props}>
      <path d="m4.5 12.5 5 5 10-11" />
    </Base>
  );
}

export function IconSun(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
    </Base>
  );
}

export function IconMoon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.5 8.5 0 1 0 10.2 10.2z" />
    </Base>
  );
}

export function IconDevice(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="2.5" y="4.5" width="19" height="13" rx="2" />
      <path d="M8 20.5h8" />
    </Base>
  );
}

export function IconMenu(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M3.5 7h17M3.5 12h17M3.5 17h17" />
    </Base>
  );
}

export function IconClose(props: IconProps) {
  return (
    <Base {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </Base>
  );
}

export function IconPin(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </Base>
  );
}

export function IconShield(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 2.8 4.5 6v6c0 4.6 3.2 7.9 7.5 9.2 4.3-1.3 7.5-4.6 7.5-9.2V6z" />
      <path d="m8.8 12 2.2 2.2 4.2-4.4" />
    </Base>
  );
}

export function IconChat(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M20.5 12.2c0 4-3.8 7.2-8.5 7.2a9.8 9.8 0 0 1-2.9-.4L4 20.5l1.4-3.6A6.9 6.9 0 0 1 3.5 12.2C3.5 8.2 7.3 5 12 5s8.5 3.2 8.5 7.2z" />
    </Base>
  );
}

export function IconTag(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M20.5 12.9 12.9 20.5a2 2 0 0 1-2.8 0l-6.6-6.6a2 2 0 0 1-.6-1.6l.5-6.2a2 2 0 0 1 1.8-1.8l6.2-.5a2 2 0 0 1 1.6.6l6.6 6.6a2 2 0 0 1 0 2.8z" />
      <circle cx="8.4" cy="8.4" r="1.4" />
    </Base>
  );
}

export function IconWhatsApp(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
      <path d="M12.04 2C6.6 2 2.2 6.39 2.2 11.82c0 1.94.55 3.75 1.5 5.29L2 22l5.03-1.64a9.85 9.85 0 0 0 5.01 1.36h.01c5.43 0 9.83-4.39 9.83-9.82C21.88 6.39 17.47 2 12.04 2Zm0 17.97h-.01a8.2 8.2 0 0 1-4.16-1.14l-.3-.18-3.09 1.01 1.01-3.01-.2-.31a8.13 8.13 0 0 1-1.25-4.36c0-4.5 3.68-8.16 8.2-8.16a8.15 8.15 0 0 1 8.18 8.17c0 4.5-3.67 8.16-8.18 8.16Zm4.49-6.11c-.25-.12-1.46-.72-1.68-.8-.23-.08-.39-.12-.56.12-.16.25-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.12-1.04-.38-1.98-1.22-.73-.65-1.23-1.45-1.37-1.7-.14-.24-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.15.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.16 0-.43.06-.65.31-.22.24-.85.83-.85 2.03s.87 2.35.99 2.51c.12.16 1.71 2.6 4.14 3.65.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.46-.6 1.66-1.17.21-.58.21-1.07.14-1.17-.06-.11-.22-.17-.47-.29Z" />
    </svg>
  );
}
