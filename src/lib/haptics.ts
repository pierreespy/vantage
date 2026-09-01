/**
 * Retours haptiques sémantiques (Taptic Engine iOS / vibration Android).
 *
 * Vocabulaire volontairement court — un geste = une sensation :
 *  - `hapticError()`     → « non » : une action est refusée (favori au-delà du maximum).
 *  - `hapticSuccess()`   → « c'est fait » : une action a abouti (favori ajouté).
 *  - `hapticTap()`       → sélection : changement d'onglet, de filtre, d'entrée de liste.
 *  - `hapticLight()`     → appui sur un bouton secondaire (partage, lien, ★).
 *  - `hapticMedium()`    → ouverture/fermeture d'une feuille, pull-to-refresh.
 *  - `hapticWarning()`   → avertissement (rien de destructeur, mais à noter).
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

export function hapticWarning(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}

export function hapticTap(): void {
  Haptics.selectionAsync().catch(() => {});
}

export function hapticLight(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function hapticMedium(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}
