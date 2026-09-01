/**
 * FavoriteStar — l'étoile ★ des favoris, animée.
 *
 * Au tap : l'étoile fait un « pop » (elle grossit puis revient) et change de couleur.
 * L'animation ne joue que si l'action a réellement abouti — `onToggle` renvoie `false`
 * quand l'ajout est refusé (maximum atteint), auquel cas l'étoile *tremble* brièvement
 * pour matérialiser le refus. Les retours haptiques correspondants (succès / erreur)
 * sont émis ici, une bonne fois pour toutes.
 */
import React, { useCallback, useRef } from 'react';
import { Animated, Pressable, StyleProp, TextStyle } from 'react-native';
import { colors, border } from '@/theme';
import { duration, easing } from '@/lib/motion';
import { hapticError, hapticSuccess } from '@/lib/haptics';

export function FavoriteStar({
  followed,
  onToggle,
  style,
  label = 'Favori',
}: {
  followed: boolean;
  /** Bascule le favori ; renvoie `false` si l'action a été refusée. */
  onToggle: () => boolean;
  style?: StyleProp<TextStyle>;
  label?: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;

  const pop = useCallback(() => {
    scale.setValue(1);
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.45, duration: 110, easing: easing.out, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 4, tension: 140, useNativeDriver: true }),
    ]).start();
  }, [scale]);

  const refuse = useCallback(() => {
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 1, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: duration.press, useNativeDriver: true }),
    ]).start();
  }, [shake]);

  const onPress = () => {
    if (onToggle()) {
      hapticSuccess();
      pop();
    } else {
      hapticError();
      refuse();
    }
  };

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={8}>
      <Animated.Text
        style={[
          style,
          { color: followed ? colors.accent : border.starIdle },
          {
            transform: [
              { scale },
              { translateX: shake.interpolate({ inputRange: [-1, 1], outputRange: [-4, 4] }) },
            ],
          },
        ]}
      >
        ★
      </Animated.Text>
    </Pressable>
  );
}
