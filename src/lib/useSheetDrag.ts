/**
 * Drag-to-dismiss for the bottom sheets (Ajouter un favori / Version étendue).
 *
 * Returns an animated `translateY` to apply to the sheet, and `panHandlers` to spread
 * on the grabber's touch zone. Dragging the grabber down follows the finger; releasing
 * past a threshold (or with a downward flick) closes the sheet, otherwise it springs
 * back. Pure React Native (Animated + PanResponder) — no extra deps.
 *
 * Everything runs JS-driven (`useNativeDriver: false`): the pan uses `setValue`, so the
 * spring/close animations MUST also be JS-driven — mixing in a native-driven animation
 * would "lock" the node and freeze subsequent drags.
 *
 * Only the grabber zone gets the handlers, so the sheet's ScrollView / TextInput keep
 * scrolling and typing normally.
 */
import { useEffect, useRef } from 'react';
import { Animated, PanResponder } from 'react-native';

const DISMISS_DISTANCE = 90; // px dragged down before it closes on release
const DISMISS_VELOCITY = 0.6; // or a downward flick

export function useSheetDrag(visible: boolean, onClose: () => void) {
  const translateY = useRef(new Animated.Value(0)).current;

  // Keep the latest onClose without recreating the PanResponder.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Snap back to the top each time the sheet opens.
  useEffect(() => {
    if (visible) translateY.setValue(0);
  }, [visible, translateY]);

  const springBack = () =>
    Animated.spring(translateY, { toValue: 0, useNativeDriver: false, bounciness: 4 }).start();

  const pan = useRef(
    PanResponder.create({
      // The grabber is a drag handle → claim the touch immediately, and keep it.
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 2,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, g) => {
        // Follow the finger downward; strong resistance upward.
        translateY.setValue(g.dy > 0 ? g.dy : g.dy * 0.1);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > DISMISS_DISTANCE || g.vy > DISMISS_VELOCITY) {
          // Slide fully out, then unmount the modal.
          Animated.timing(translateY, {
            toValue: 900,
            duration: 180,
            useNativeDriver: false,
          }).start(() => onCloseRef.current());
        } else {
          springBack();
        }
      },
      onPanResponderTerminate: springBack,
    })
  ).current;

  return { translateY, panHandlers: pan.panHandlers };
}
