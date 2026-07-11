/**
 * Retours haptiques sémantiques (Taptic Engine iOS / vibration Android).
 *
 * Deux signaux très courts :
 *  - `hapticError()`   → « non / erreur » : une action est refusée (ex. ajouter un
 *    favori alors qu'on est déjà au maximum).
 *  - `hapticSuccess()` → « ok / c'est fait » : une action a abouti (ex. un favori a
 *    réellement été ajouté).
 *
 * Best-effort : ne lève jamais (no-op sur le web / appareils non compatibles).
 */
import * as Haptics from 'expo-haptics';

export function hapticError(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
}

export function hapticSuccess(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
