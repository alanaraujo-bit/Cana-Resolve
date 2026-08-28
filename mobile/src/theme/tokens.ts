/**
 * Canaã Resolve — fundação visual do aplicativo.
 *
 * A paleta nasce da landing (`app/globals.css`), mas foi reancorada para tela
 * de celular: superfícies um pouco mais separadas, texto um pouco mais denso,
 * e um verde de marca que continua legível sobre fundo escuro.
 *
 * Regra da casa: nenhuma tela inventa valor. Cor, espaço, raio, tipo, tempo e
 * curva saem daqui. Se faltar um valor, ele é adicionado aqui primeiro.
 */

export type ColorScheme = 'light' | 'dark';

export type Palette = {
  /** Fundo da tela, do mais raso ao mais profundo. */
  bg: string;
  bgDeep: string;
  /** Superfícies empilhadas sobre o fundo. */
  surface: string;
  surface2: string;
  surface3: string;
  /** Traços. */
  line: string;
  lineStrong: string;
  /** Texto. */
  ink: string;
  muted: string;
  faint: string;
  /** Marca. */
  brand: string;
  brandPressed: string;
  brandInk: string;
  brandSoft: string;
  brandLine: string;
  onBrand: string;
  /** Preenchimento de superfície grande (CTA). No escuro, um verde mais
   *  profundo que o verde de texto — um pill inteiro em verde-menta berra. */
  brandFill: string;
  onBrandFill: string;
  /** Destaque terracota — usado com parcimônia. */
  accent: string;
  accentInk: string;
  accentSoft: string;
  accentLine: string;
  /** Estados. */
  danger: string;
  dangerSoft: string;
  success: string;
  /** Campos de formulário. */
  field: string;
  fieldLine: string;
  fieldLineFocus: string;
  /** Anel de foco. */
  ring: string;
  /** Vidro de imitação (fallback do Liquid Glass). */
  glassTint: string;
  glassLine: string;
  glassHighlight: string;
  /** Sombras. */
  shadow: string;
  /** Elementos gráficos de fundo (curvas de nível, auroras). */
  contour: string;
  auroraBrand: string;
  auroraAccent: string;
  /** Overlay de toque. */
  pressOverlay: string;
};

const light: Palette = {
  bg: '#FBF9F5',
  bgDeep: '#F3EFE6',
  surface: '#FFFFFF',
  surface2: '#F7F4EC',
  surface3: '#EFEAE0',

  line: '#E6E0D3',
  lineStrong: '#D3CCBB',

  ink: '#17201B',
  muted: '#59635C',
  faint: '#7A857D',

  brand: '#0E5C42',
  brandPressed: '#0A4732',
  brandInk: '#0B4B36',
  brandSoft: '#E6F0EA',
  brandLine: '#C4DBCD',
  onBrand: '#FFFFFF',
  brandFill: '#0E5C42',
  onBrandFill: '#FFFFFF',

  accent: '#A9501D',
  accentInk: '#8F4315',
  accentSoft: '#FBEEE3',
  accentLine: '#ECD6C1',

  danger: '#A32B1C',
  dangerSoft: '#FDECEB',
  success: '#0E5C42',

  field: '#FFFFFF',
  fieldLine: '#DCD5C6',
  fieldLineFocus: '#0E5C42',

  ring: '#0E5C42',

  glassTint: 'rgba(255,255,255,0.62)',
  glassLine: 'rgba(23,32,27,0.10)',
  glassHighlight: 'rgba(255,255,255,0.75)',

  shadow: '#17201B',

  contour: '#0E5C42',
  auroraBrand: 'rgba(14,92,66,0.16)',
  auroraAccent: 'rgba(169,80,29,0.13)',

  pressOverlay: 'rgba(23,32,27,0.06)',
};

const dark: Palette = {
  bg: '#0C1310',
  bgDeep: '#080D0B',
  surface: '#121D18',
  surface2: '#17241E',
  surface3: '#1D2C25',

  line: '#253429',
  lineStrong: '#35473C',

  ink: '#E9EFEA',
  muted: '#A1AEA6',
  faint: '#8B998F',

  brand: '#4ECB92',
  brandPressed: '#26855C',
  brandInk: '#7AE0B0',
  brandSoft: '#12291F',
  brandLine: '#264635',
  onBrand: '#06130D',
  brandFill: '#2F9F70',
  onBrandFill: '#04120C',

  accent: '#E59A5C',
  accentInk: '#F0AE74',
  accentSoft: '#2A1C12',
  accentLine: '#48301D',

  danger: '#F08B7E',
  dangerSoft: '#2B1512',
  success: '#4ECB92',

  field: '#0E1713',
  fieldLine: '#2C3D33',
  fieldLineFocus: '#4ECB92',

  ring: '#4ECB92',

  glassTint: 'rgba(24,38,31,0.58)',
  glassLine: 'rgba(233,239,234,0.12)',
  glassHighlight: 'rgba(233,239,234,0.10)',

  shadow: '#000000',

  contour: '#7AE0B0',
  auroraBrand: 'rgba(78,203,146,0.16)',
  auroraAccent: 'rgba(229,154,92,0.12)',

  pressOverlay: 'rgba(233,239,234,0.08)',
};

export const palettes: Record<ColorScheme, Palette> = { light, dark };

/** Escala de espaço — múltiplos de 4, com um passo de 2 para ajustes finos. */
export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
} as const;

/** Margem lateral padrão do conteúdo. Tudo se alinha a ela. */
export const gutter = 24;

export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 26,
  '2xl': 32,
  pill: 999,
} as const;

export const fonts = {
  display: 'Fraunces_600SemiBold',
  displayBold: 'Fraunces_700Bold',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemiBold: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',
} as const;

/**
 * Escala tipográfica. `display` é a Fraunces — só em títulos de tela.
 * O resto é Inter. Nada abaixo de 13 em texto de leitura.
 */
export const type = {
  displayXL: { fontFamily: fonts.display, fontSize: 40, lineHeight: 44, letterSpacing: -1.1 },
  displayLG: { fontFamily: fonts.display, fontSize: 31, lineHeight: 36, letterSpacing: -0.8 },
  displayMD: { fontFamily: fonts.display, fontSize: 27, lineHeight: 32, letterSpacing: -0.6 },
  title: { fontFamily: fonts.sansSemiBold, fontSize: 20, lineHeight: 26, letterSpacing: -0.3 },
  body: { fontFamily: fonts.sans, fontSize: 16, lineHeight: 24, letterSpacing: -0.1 },
  bodyStrong: { fontFamily: fonts.sansMedium, fontSize: 16, lineHeight: 24, letterSpacing: -0.1 },
  callout: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 22, letterSpacing: -0.1 },
  label: { fontFamily: fonts.sansMedium, fontSize: 14, lineHeight: 18, letterSpacing: 0 },
  caption: { fontFamily: fonts.sans, fontSize: 13, lineHeight: 18, letterSpacing: 0 },
  overline: { fontFamily: fonts.sansSemiBold, fontSize: 11, lineHeight: 14, letterSpacing: 1.2 },
  button: { fontFamily: fonts.sansSemiBold, fontSize: 16, lineHeight: 20, letterSpacing: -0.1 },
} as const;

/**
 * Movimento. Uma gramática só: as mesmas durações e as mesmas curvas em todo
 * o produto. `ease` é a saída suave da landing (0.16, 1, 0.3, 1).
 */
export const motion = {
  duration: {
    /** Resposta ao toque. Precisa ser imperceptível. */
    instant: 120,
    fast: 180,
    /** Padrão para transições de estado. */
    base: 280,
    /** Entrada de conteúdo, troca de tela. */
    slow: 420,
    /** Só para o que atravessa a tela inteira. */
    deliberate: 620,
  },
  easing: {
    out: [0.16, 1, 0.3, 1] as const,
    inOut: [0.65, 0, 0.35, 1] as const,
    in: [0.55, 0, 1, 0.45] as const,
  },
  spring: {
    /** Botões e chips: firme, sem quicar. */
    press: { damping: 26, stiffness: 420, mass: 0.7 },
    /** Elementos que entram em cena. */
    enter: { damping: 22, stiffness: 190, mass: 0.9 },
    /** Paginação e gestos. */
    glide: { damping: 30, stiffness: 240, mass: 1 },
  },
  /** Deslocamento vertical padrão de entrada. */
  rise: 14,
} as const;

/** Alvo mínimo de toque. Não descer daqui. */
export const hitTarget = 48;

export const elevation = {
  none: {},
  card: {
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    shadowOpacity: 0.1,
    elevation: 4,
  },
  lifted: {
    shadowOffset: { width: 0, height: 16 },
    shadowRadius: 40,
    shadowOpacity: 0.16,
    elevation: 10,
  },
} as const;
