import { forwardRef, useCallback, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { hitTarget, motion, radius, space, type as typeScale, useTheme } from '@/theme';
import { AlertIcon, EyeIcon, EyeOffIcon } from './icons';
import { Text } from './Text';

export type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  /** Mensagem de erro em linguagem de gente. Some assim que o campo é editado. */
  error?: string | null;
  /** Liga o botão de mostrar/ocultar e o teclado de senha. */
  secure?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, secure = false, containerStyle, onFocus, onBlur, editable = true, ...rest },
  ref,
) {
  const { colors, reduceMotion } = useTheme();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const focus = useSharedValue(0);
  const invalid = useDerivedValue(() => (error ? 1 : 0), [error]);

  const duration = reduceMotion ? 0 : motion.duration.fast;

  const border = useAnimatedStyle(() => {
    const base = interpolateColor(
      focus.value,
      [0, 1],
      [colors.fieldLine, colors.fieldLineFocus],
    );
    return {
      borderColor: invalid.value ? colors.danger : base,
      borderWidth: withTiming(focus.value > 0.5 || invalid.value ? 1.5 : StyleSheet.hairlineWidth, {
        duration,
      }),
    };
  });

  const ring = useAnimatedStyle(() => ({
    opacity: withTiming(focus.value && !invalid.value ? 1 : 0, { duration }),
    transform: [{ scale: withTiming(focus.value ? 1 : 0.97, { duration }) }],
  }));

  const handleFocus = useCallback<NonNullable<TextInputProps['onFocus']>>(
    (event) => {
      setFocused(true);
      focus.value = withTiming(1, { duration });
      onFocus?.(event);
    },
    [duration, focus, onFocus],
  );

  const handleBlur = useCallback<NonNullable<TextInputProps['onBlur']>>(
    (event) => {
      setFocused(false);
      focus.value = withTiming(0, { duration });
      onBlur?.(event);
    },
    [duration, focus, onBlur],
  );

  return (
    <View style={containerStyle}>
      <Text
        variant="label"
        tone={focused ? 'brand' : 'muted'}
        style={styles.label}
        maxScale={1.25}
      >
        {label}
      </Text>

      <View>
        {/* Anel de foco: fica fora da borda, não empurra o layout. */}
        <Animated.View
          style={[
            styles.ring,
            { pointerEvents: 'none' },
            { borderColor: colors.ring, opacity: 0 },
            ring,
          ]}
        />
        <Animated.View
          style={[
            styles.field,
            { backgroundColor: colors.field, opacity: editable ? 1 : 0.55 },
            border,
          ]}
        >
          <TextInput
            ref={ref}
            editable={editable}
            secureTextEntry={secure && !revealed}
            placeholderTextColor={colors.faint}
            selectionColor={colors.brand}
            cursorColor={colors.brand}
            accessibilityLabel={label}
            accessibilityState={{ disabled: !editable }}
            maxFontSizeMultiplier={1.25}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={[styles.input, { color: colors.ink }]}
            {...rest}
          />
          {secure ? (
            <Pressable
              onPress={() => setRevealed((v) => !v)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={revealed ? 'Ocultar senha' : 'Mostrar senha'}
              style={styles.reveal}
            >
              {revealed ? (
                <EyeOffIcon color={colors.muted} />
              ) : (
                <EyeIcon color={colors.muted} />
              )}
            </Pressable>
          ) : null}
        </Animated.View>
      </View>

      {error ? (
        <View style={styles.error} accessibilityLiveRegion="polite">
          <AlertIcon color={colors.danger} />
          <Text variant="caption" tone="danger" style={styles.errorText}>
            {error}
          </Text>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  label: { marginBottom: space.sm, marginLeft: 2 },
  ring: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: radius.md + 4,
    borderWidth: 2,
  },
  field: {
    minHeight: hitTarget + 6,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: space.lg,
    paddingRight: space.sm,
  },
  input: {
    flex: 1,
    paddingVertical: space.md,
    fontFamily: typeScale.body.fontFamily,
    fontSize: typeScale.body.fontSize,
  },
  reveal: {
    width: hitTarget - 8,
    height: hitTarget - 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: space.sm,
    marginLeft: 2,
  },
  errorText: { flex: 1 },
});
