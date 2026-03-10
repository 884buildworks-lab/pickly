import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Light impact - for selections, tab switches
 */
export function hapticLight() {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

/**
 * Medium impact - for saves, confirmations
 */
export function hapticMedium() {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
}

/**
 * Heavy impact - for deletes, important actions
 */
export function hapticHeavy() {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }
}

/**
 * Selection feedback - for UI selections
 */
export function hapticSelection() {
  if (Platform.OS !== 'web') {
    Haptics.selectionAsync();
  }
}

/**
 * Success notification
 */
export function hapticSuccess() {
  if (Platform.OS !== 'web') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
}

/**
 * Warning notification
 */
export function hapticWarning() {
  if (Platform.OS !== 'web') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }
}

/**
 * Error notification
 */
export function hapticError() {
  if (Platform.OS !== 'web') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }
}
