import { useCallback, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { motion, radius as radii, type as typeScale, useTheme } from '@/theme';
import { GlassSurface } from './GlassSurface';
import { Text } from './Text';
import { haptics } from './haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type ButtonVariant = 'primary' | 'glass' | 'quiet' | 'outline';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  /** Ícone à esquerda do rótulo — opcional, sempre decorativo. */
  icon?: ReactNode;
  /** Vibra ao acionar. Reservado para ações de peso. */
  haptic?: 'none' | 'step' | 'commit';
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
  testID?: string;
};

const HEIGHT = 54;

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  haptic = 'none',
  style,
  accessibilityHint,
  testID,
}: Props) {
  const { colors, reduceMotion } = useTheme();
  const press = useSharedValue(0);
  const inert = disabled || loading;

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: reduceMotion ? 1 : 1 - press.value * 0.022 }],
    opacity: 1 - press.value * 0.06,
  }));

  const overlay = useAnimatedStyle(() => ({ opacity: press.value * 0.9 }));

  const setPressed = useCallback(
    (on: boolean) => {
      press.value = reduceMotion
        ? withTiming(on ? 1 : 0, { duration: motion.duration.instant })
        : withSpring(on ? 1 : 0, motion.spring.press);
    },
    [press, reduceMotion],
  );

  const handlePress = useCallback(() => {
    if (inert) return;
    if (haptic === 'step') haptics.step();
    if (haptic === 'commit') haptics.commit();
    onPress?.();
  }, [inert, haptic, onPress]);

  const body = (
    <View style={styles.row}>
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? colors.onBrandFill : colors.brandInk}
          accessibilityLabel="Carregando"
        />
      ) : (
        <>
          {icon ? <View style={styles.icon}>{icon}</View> : null}
          <Text
            variant="button"
            tone="inherit"
            maxScale={1.2}
            numberOfLines={1}
            style={{
              color:
                variant === 'primary'
                  ? colors.onBrandFill
                  : variant === 'quiet'
                    ? colors.muted
                    : colors.ink,
            }}
          >
            {label}
          </Text>
        </>
      )}
    </View>
  );

  const shared: StyleProp<ViewStyle> = [
    styles.base,
    { opacity: disabled ? 0.45 : 1 },
    style,
  ];

  return (
    <AnimatedPressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inert, busy: loading }}
      disabled={inert}
      onPress={handlePress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[shared, animated]}
    >
      {variant === 'glass' ? (
        <GlassSurface radius={radii.pill} interactive style={StyleSheet.absoluteFill} />
      ) : (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: radii.pill,
              backgroundColor:
                variant === 'primary'
                  ? colors.brandFill
                  : variant === 'outline'
                    ? colors.surface
                    : 'transparent',
              borderWidth: variant === 'outline' ? StyleSheet.hairlineWidth : 0,
              borderColor: colors.lineStrong,
            },
          ]}
        />
      )}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            pointerEvents: 'none',
            borderRadius: radii.pill,
            backgroundColor: variant === 'primary' ? colors.brandPressed : colors.pressOverlay,
          },
          overlay,
        ]}
      />
      {body}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: HEIGHT,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: typeScale.button.lineHeight,
  },
  icon: { alignItems: 'center', justifyContent: 'center' },
});
