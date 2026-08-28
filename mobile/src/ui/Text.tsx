import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { type, useTheme } from '@/theme';

type Variant = keyof typeof type;
type Tone = 'ink' | 'muted' | 'faint' | 'brand' | 'accent' | 'danger' | 'onBrand' | 'inherit';

export type TextProps = RNTextProps & {
  variant?: Variant;
  tone?: Tone;
  /** Teto do Dynamic Type: o texto cresce, mas a composição não se desmonta. */
  maxScale?: number;
  center?: boolean;
};

export function Text({
  variant = 'body',
  tone = 'ink',
  maxScale = 1.35,
  center,
  style,
  ...rest
}: TextProps) {
  const { colors } = useTheme();
  const color =
    tone === 'inherit'
      ? undefined
      : tone === 'onBrand'
        ? colors.onBrand
        : tone === 'brand'
          ? colors.brandInk
          : tone === 'accent'
            ? colors.accentInk
            : tone === 'danger'
              ? colors.danger
              : tone === 'muted'
                ? colors.muted
                : tone === 'faint'
                  ? colors.faint
                  : colors.ink;

  return (
    <RNText
      maxFontSizeMultiplier={maxScale}
      style={[type[variant], color ? { color } : null, center ? { textAlign: 'center' } : null, style]}
      {...rest}
    />
  );
}
