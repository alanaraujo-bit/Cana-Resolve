/**
 * Retorno tátil — só onde ele significa alguma coisa: a virada de uma etapa,
 * a conclusão do onboarding, o erro de um envio. Nunca a cada toque.
 */
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const supported = Platform.OS === 'ios' || Platform.OS === 'android';

function safe(run: () => Promise<unknown>) {
  if (!supported) return;
  run().catch(() => {});
}

export const haptics = {
  /** Mudança de estado leve: virou a página do onboarding. */
  step: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Ação de peso: enviar, concluir. */
  commit: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  error: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
