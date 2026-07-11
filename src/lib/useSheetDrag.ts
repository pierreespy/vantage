/**
 * Drag-to-dismiss for the bottom sheets (Ajouter un favori / Version étendue).
 *
 * Returns an animated `translateY` to apply to the sheet, and `panHandlers` to spread
 * on the grabber's touch zone. Dragging the grabber down follows the finger; releasing
 * past a threshold (or with enough downward velocity) calls `onClose`, otherwise the
 * sheet springs back. Pure React Native (Animated + PanResponder) — no extra deps.
 *
 * Only the grabber zone gets the handlers, so the sheet's ScrollView / TextInput keep
 * scrolling and typing normally.
 */
import { useEffect, useRef } from 'react';
import { Animated, PanResponder } from 'react-native';

const DISMISS_DISTANCE = 110; // px dragged down before it closes on release
const DISMISS_VELOCITY = 0.8; // or a fast downward flick

export function useSheetDrag(visible: boolean, onClose: () => void) {
  const translateY = useRef(new Animated.Value(0)).current;

  // Keep the latest onClose without recreating the PanResponder.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Reset to the top each time the sheet opens (the Modal slide-out leaves it wherever
  // it was dragged; we snap it back on the next open).
  useEffect(() => {
    if (visible) translateY.setValue(0);
  }, [visible, translateY]);

  const springBack = () =>
    Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();

  const pan = useRef(
    PanResponder.create({
      // Claim the gesture only on a clear downward drag.
      onMoveShouldSetPanResponder: (_, g) => g.dy > 4 && g.dy > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > DISMISS_DISTANCE || g.vy > DISMISS_VELOCITY) onCloseRef.current();
        else springBack();
      },
      onPanResponderTerminate: springBack,
    })
  ).current;

  return { translateY, panHandlers: pan.panHandlers };
}
