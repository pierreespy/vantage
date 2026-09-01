/**
 * FadeInView — apparition d'un bloc : fondu + petite remontée.
 *
 * Utilisé pour faire « monter » l'édition du jour à l'ouverture du Journal / du Mot du
 * jour, en cascade (`index` → décalage via `staggerDelay`). L'animation ne joue qu'une
 * fois par montage ; changer `replayKey` la rejoue (ex. après un pull-to-refresh qui
 * remplace l'édition).
 *
 * Driver natif (opacité + translateY) : aucun coût sur le thread JS pendant le scroll.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, ViewStyle } from 'react-native';
import { duration, easing, staggerDelay } from '@/lib/motion';

export function FadeInView({
  children,
  index = 0,
  delay,
  distance = 14,
  replayKey,
  style,
}: {
  children: React.ReactNode;
  /** Rang dans une liste — sert à décaler l'apparition. */
  index?: number;
  /** Décalage explicite (ms) ; prioritaire sur `index`. */
  delay?: number;
  /** Amplitude de la remontée, en px. */
  distance?: number;
  /** Change de valeur → l'animation rejoue depuis le début. */
  replayKey?: string | number;
  style?: StyleProp<ViewStyle>;
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: duration.enter,
      delay: delay ?? staggerDelay(index),
      easing: easing.out,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [progress, index, delay, replayKey]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [distance, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
