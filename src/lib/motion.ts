/**
 * Motion tokens — durées et courbes partagées par toutes les animations de l'app.
 *
 * Une seule règle : le mouvement doit rester « papier journal » — court, sobre, jamais
 * élastique. Tout passe par `Animated` de React Native (aucune dépendance en plus) et,
 * partout où c'est possible, par le **driver natif** (opacité / transform uniquement).
 */
import { Easing } from 'react-native';

export const duration = {
  /** Retour tactile immédiat (enfoncement d'un bouton). */
  press: 90,
  /** Relâchement / rebond léger. */
  release: 160,
  /** Apparition d'un bloc de contenu. */
  enter: 340,
  /** Pop d'une icône (★). */
  pop: 220,
} as const;

/** Décalage entre deux blocs d'une même liste (ms). */
export const STAGGER = 55;
/** Décalage maximal cumulé, pour que le bas de page n'attende pas 3 s. */
export const STAGGER_MAX = 480;

export const easing = {
  /** Sortie douce — la courbe par défaut des apparitions. */
  out: Easing.bezier(0.22, 1, 0.36, 1),
  /** Entrée/sortie symétrique — pour les allers-retours (scale d'un bouton). */
  inOut: Easing.bezier(0.4, 0, 0.2, 1),
} as const;

/** Décalage d'apparition pour le i-ème élément d'une liste. */
export function staggerDelay(index: number): number {
  return Math.min(index * STAGGER, STAGGER_MAX);
}
