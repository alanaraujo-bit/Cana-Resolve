import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';
import { BrandMark } from './icons';
import { Text } from './Text';

/**
 * A assinatura da marca dentro do aplicativo: o pino, o nome e — quando faz
 * sentido — a linha que diz de quem é esta área do produto.
 */
export function Wordmark({
  size = 'md',
  subtitle,
  onSurface = false,
}: {
  size?: 'sm' | 'md';
  subtitle?: string;
  /** Sobre superfície de marca (verde), a marca inverte. */
  onSurface?: boolean;
}) {
  const { colors } = useTheme();
  const markSize = size === 'sm' ? 26 : 34;
  const pin = onSurface ? colors.onBrand : colors.brand;
  const check = onSurface ? colors.onBrand : colors.accent;

  return (
    <View style={styles.row} accessible accessibilityRole="header" accessibilityLabel="Canaã Resolve">
      <BrandMark size={markSize} pin={pin} check={check} strokeWidth={2} />
      <View>
        <Text
          variant={size === 'sm' ? 'title' : 'displayMD'}
          style={[styles.name, { color: onSurface ? colors.onBrand : colors.ink }]}
          maxScale={1.2}
        >
          Canaã Resolve
        </Text>
        {subtitle ? (
          <Text variant="overline" tone="muted" style={styles.subtitle}>
            {subtitle.toUpperCase()}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontFamily: 'Fraunces_600SemiBold', fontSize: 19, lineHeight: 24 },
  subtitle: { marginTop: 3 },
});
