/**
 * Uma família só de ícones: traço de 1.75, pontas arredondadas, grade de 24.
 * Desenhados aqui para não trazer uma biblioteca inteira por seis símbolos —
 * e para que o peso do traço combine com a tipografia da marca.
 */
import type { ReactNode } from 'react';
import Svg, { Path, Circle, G } from 'react-native-svg';

type IconProps = { size?: number; color: string; strokeWidth?: number };

function Icon({
  size = 24,
  children,
}: {
  size?: number;
  children: ReactNode;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {children}
    </Svg>
  );
}

export function EyeIcon({ size = 22, color, strokeWidth = 1.75 }: IconProps) {
  return (
    <Icon size={size}>
      <Path
        d="M2.5 12S6 5.75 12 5.75 21.5 12 21.5 12 18 18.25 12 18.25 2.5 12 2.5 12Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={strokeWidth} />
    </Icon>
  );
}

export function EyeOffIcon({ size = 22, color, strokeWidth = 1.75 }: IconProps) {
  return (
    <Icon size={size}>
      <Path
        d="M3.5 3.5 20.5 20.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Path
        d="M9.9 6.1A9.5 9.5 0 0 1 12 5.75c6 0 9.5 6.25 9.5 6.25a17 17 0 0 1-3 3.72M6.4 8.2A17.4 17.4 0 0 0 2.5 12S6 18.25 12 18.25c1 0 1.92-.17 2.75-.45"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M10.1 10.2a3 3 0 0 0 4.02 4.16"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Icon>
  );
}

export function ArrowRightIcon({ size = 20, color, strokeWidth = 2 }: IconProps) {
  return (
    <Icon size={size}>
      <Path
        d="M4.5 12h14m0 0-5.5-5.5M18.5 12 13 17.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Icon>
  );
}

export function AlertIcon({ size = 16, color, strokeWidth = 1.9 }: IconProps) {
  return (
    <Icon size={size}>
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={strokeWidth} />
      <Path
        d="M12 7.5v5.2M12 16.2h.01"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Icon>
  );
}

/** O "G" oficial do Google, nas cores da marca deles — exigência da plataforma. */
export function GoogleMark({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <G>
        <Path
          fill="#4285F4"
          d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17Z"
        />
        <Path
          fill="#34A853"
          d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46Z"
        />
        <Path
          fill="#FBBC05"
          d="M11.69 28.18c-.44-1.32-.69-2.73-.69-4.18s.25-2.86.69-4.18v-5.7H4.34A21.99 21.99 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7Z"
        />
        <Path
          fill="#EA4335"
          d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07Z"
        />
      </G>
    </Svg>
  );
}

/** A marca do Canaã Resolve: pino e confirmação, o mesmo desenho do site. */
export function BrandMark({
  size = 40,
  pin,
  check,
  strokeWidth = 1.9,
}: {
  size?: number;
  pin: string;
  check: string;
  strokeWidth?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Path
        d="M16 6.6c-3.7 0-6.7 3-6.7 6.7 0 4.9 5.6 10.4 6.3 11.1a.6.6 0 0 0 .8 0c.7-.7 6.3-6.2 6.3-11.1 0-3.7-3-6.7-6.7-6.7Z"
        stroke={pin}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <Path
        d="m12.9 13.3 2.3 2.4 4.1-4.5"
        stroke={check}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/* --- Navegação principal ---------------------------------------------------
   A mesma grade de 24 e o mesmo traço dos demais. O estado selecionado não
   troca de família: engrossa o traço e ganha um preenchimento discreto — assim
   ele se lê mesmo para quem não distingue a cor. */

type NavIconProps = { size?: number; color: string; active?: boolean };

function navStroke(active: boolean) {
  return active ? 2.05 : 1.7;
}

export function HomeIcon({ size = 24, color, active = false }: NavIconProps) {
  return (
    <Icon size={size}>
      <Path
        d="M3.6 10.6 12 3.8l8.4 6.8v8a1.6 1.6 0 0 1-1.6 1.6h-3.6v-5.6H8.8v5.6H5.2a1.6 1.6 0 0 1-1.6-1.6Z"
        stroke={color}
        strokeWidth={navStroke(active)}
        strokeLinejoin="round"
        fill={active ? color : 'none'}
        fillOpacity={active ? 0.13 : 0}
      />
    </Icon>
  );
}

export function OportunidadesIcon({ size = 24, color, active = false }: NavIconProps) {
  return (
    <Icon size={size}>
      <Path
        d="M4.2 6.4A2.2 2.2 0 0 1 6.4 4.2h11.2a2.2 2.2 0 0 1 2.2 2.2v11.2a2.2 2.2 0 0 1-2.2 2.2H6.4a2.2 2.2 0 0 1-2.2-2.2Z"
        stroke={color}
        strokeWidth={navStroke(active)}
        strokeLinejoin="round"
        fill={active ? color : 'none'}
        fillOpacity={active ? 0.13 : 0}
      />
      <Path
        d="M8.2 9.6h7.6M8.2 13.2h5"
        stroke={color}
        strokeWidth={navStroke(active)}
        strokeLinecap="round"
      />
    </Icon>
  );
}

export function PerfilIcon({ size = 24, color, active = false }: NavIconProps) {
  return (
    <Icon size={size}>
      <Circle
        cx={12}
        cy={8.4}
        r={3.6}
        stroke={color}
        strokeWidth={navStroke(active)}
        fill={active ? color : 'none'}
        fillOpacity={active ? 0.13 : 0}
      />
      <Path
        d="M4.9 19.8a7.4 7.4 0 0 1 14.2 0"
        stroke={color}
        strokeWidth={navStroke(active)}
        strokeLinecap="round"
        fill="none"
      />
    </Icon>
  );
}

/** Seta curta de "abre isto" — em linha de lista, nunca em botão. */
export function ChevronRightIcon({ size = 18, color, strokeWidth = 1.9 }: IconProps) {
  return (
    <Icon size={size}>
      <Path
        d="m9.5 5.5 6.5 6.5-6.5 6.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Icon>
  );
}

/** Usado quando algo foi resolvido ou confirmado dentro de uma lista. */
export function CheckIcon({ size = 16, color, strokeWidth = 2 }: IconProps) {
  return (
    <Icon size={size}>
      <Path
        d="m5 12.5 4.2 4.2L19 6.8"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Icon>
  );
}

/** Volta — a mesma seta do chevron, espelhada, para o cabeçalho de detalhe. */
export function ChevronLeftIcon({ size = 22, color, strokeWidth = 1.9 }: IconProps) {
  return (
    <Icon size={size}>
      <Path
        d="M14.5 5.5 8 12l6.5 6.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Icon>
  );
}

/** Fecha uma folha. Nunca aparece sozinho: sempre com rótulo acessível. */
export function CloseIcon({ size = 20, color, strokeWidth = 1.9 }: IconProps) {
  return (
    <Icon size={size}>
      <Path
        d="M6.4 6.4l11.2 11.2M17.6 6.4 6.4 17.6"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Icon>
  );
}

/** Tempo — acompanha "há 8 min" e a urgência. */
export function ClockIcon({ size = 16, color, strokeWidth = 1.75 }: IconProps) {
  return (
    <Icon size={size}>
      <Circle cx={12} cy={12} r={8.4} stroke={color} strokeWidth={strokeWidth} fill="none" />
      <Path
        d="M12 7.6V12l3 1.9"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Icon>
  );
}

/** Região — o pino da marca, reduzido a símbolo de lista. */
export function PinIcon({ size = 16, color, strokeWidth = 1.75 }: IconProps) {
  return (
    <Icon size={size}>
      <Path
        d="M12 21.2s6.4-5.8 6.4-10.4a6.4 6.4 0 1 0-12.8 0C5.6 15.4 12 21.2 12 21.2Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        fill="none"
      />
      <Circle cx={12} cy={10.6} r={2.4} stroke={color} strokeWidth={strokeWidth} fill="none" />
    </Icon>
  );
}

/** O balcão: a categoria do serviço. */
export function TagIcon({ size = 16, color, strokeWidth = 1.75 }: IconProps) {
  return (
    <Icon size={size}>
      <Path
        d="M11.3 3.6H5.4A1.8 1.8 0 0 0 3.6 5.4v5.9c0 .5.2.9.5 1.3l7.3 7.3a1.8 1.8 0 0 0 2.5 0l6-6a1.8 1.8 0 0 0 0-2.5l-7.3-7.3a1.8 1.8 0 0 0-1.3-.5Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        fill="none"
      />
      <Circle cx={7.9} cy={7.9} r={1.35} fill={color} />
    </Icon>
  );
}

/**
 * WhatsApp. É a única marca de terceiro nesta família, e por isso mantém o
 * contorno reconhecível do aplicativo — mas herda a cor do contexto, porque um
 * verde alheio no meio da paleta da casa gritaria.
 */
export function WhatsAppIcon({ size = 20, color }: { size?: number; color: string }) {
  return (
    <Icon size={size}>
      <Path
        d="M3.4 20.6l1.2-4.3a8.2 8.2 0 1 1 3.2 3.1l-4.4 1.2Z"
        stroke={color}
        strokeWidth={1.75}
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M9.1 8.2c.2-.5.4-.5.6-.5h.5c.2 0 .4 0 .6.5l.7 1.6c.1.3 0 .5-.1.6l-.4.5c-.1.2-.2.3 0 .6a6 6 0 0 0 2.6 2.3c.3.1.4 0 .6-.1l.5-.6c.2-.2.4-.2.6-.1l1.6.8c.3.1.4.3.4.5 0 .6-.4 1.4-1.5 1.6-1 .2-2.4 0-4.2-1.2a9 9 0 0 1-3-3.4c-.5-1.1-.4-2.2-.1-2.8Z"
        fill={color}
      />
    </Icon>
  );
}

/** Ligar. Secundário ao WhatsApp, e por isso desenhado com o mesmo peso. */
export function PhoneIcon({ size = 20, color, strokeWidth = 1.75 }: IconProps) {
  return (
    <Icon size={size}>
      <Path
        d="M8.1 4.4H5.5c-.9 0-1.7.8-1.6 1.7.3 3.6 1.9 7 4.4 9.6 2.6 2.5 6 4.1 9.6 4.4.9.1 1.7-.7 1.7-1.6v-2.6c0-.8-.5-1.4-1.3-1.6l-2.3-.5c-.6-.1-1.2.1-1.6.6l-.8 1a12.2 12.2 0 0 1-5-5l1-.8c.5-.4.7-1 .6-1.6l-.5-2.3c-.2-.8-.8-1.3-1.6-1.3Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        fill="none"
      />
    </Icon>
  );
}
