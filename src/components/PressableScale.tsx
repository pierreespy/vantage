/**
 * PressableScale — un `Pressable` qui s'enfonce légèrement au toucher.
 *
 * Deux effets combinés, tous deux en driver natif (transform + opacité) :
 *  - un `scale` qui descend à `activeScale` pendant l'appui puis revient,
 *  - un léger fondu, pour que le geste se voie aussi sur les boutons sans fond.
 *
 * `haptic` déclenche la vibration au *press-in* (au moment où le doigt touche, pas au
 * relâchement) — c'est ce qui donne la sensation d'un bouton physique. Mettre `false`
 * quand l'action émet déjà son propre retour (succès / erreur) pour ne pas doubler.
 */
import React, { useCallback, useRef } from 'react';
import { Animated, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import { duration, easing } from '@/lib/motion';
import { hapticLight, hapticTap } from '@/lib/haptics';

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** Échelle atteinte pendant l'appui (0.96 par défaut). */
  activeScale?: number;
  /** Retour haptique au press-in : 'light' (défaut), 'selection', ou aucun. */
  haptic?: 'light' | 'selection' | false;
  children?: React.ReactNode;
};

export function PressableScale({
  style,
  activeScale = 0.96,
  haptic = 'light',
  onPressIn,
  onPressOut,
  disabled,
  children,
  ...rest
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const animate = useCallback(
    (toValue: number, ms: number) => {
      Animated.timing(scale, {
        toValue,
        duration: ms,
        easing: easing.inOut,
        useNativeDriver: true,
      }).start();
    },
    [scale]
  );

  return (
    <Animated.View style={[style, { transform: [{ scale }] }]}>
      <Pressable
        {...rest}
        disabled={disabled}
        onPressIn={(e) => {
          animate(activeScale, duration.press);
          if (!disabled && haptic === 'light') hapticLight();
          if (!disabled && haptic === 'selection') hapticTap();
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          animate(1, duration.release);
          onPressOut?.(e);
        }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
