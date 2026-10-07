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

/** Interrupteur global, piloté par le réglage « Retours haptiques » (SettingsProvider). */
let enabled = true;

export function setHapticsEnabled(value: boolean): void {
  enabled = value;
}

export function hapticError(): void {
  if (!enabled) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
}

export function hapticSuccess(): void {
  if (!enabled) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

export function hapticWarning(): void {
  if (!enabled) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}

export function hapticTap(): void {
  if (!enabled) return;
  Haptics.selectionAsync().catch(() => {});
}

export function hapticLight(): void {
  if (!enabled) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function hapticMedium(): void {
  if (!enabled) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}
