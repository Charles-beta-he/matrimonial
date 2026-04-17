import { ReactNode, useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface Props {
  children: ReactNode;
  isOwn: boolean;
  index: number;
  isNew?: boolean;
}

const MAX_STAGGER_DELAY = 280;

export function AnimatedMessageBubble({ children, isOwn, index, isNew }: Props) {
  const opacity = useSharedValue(isNew ? 0 : 1);
  const translateX = useSharedValue(isNew ? (isOwn ? 60 : -60) : 0);
  const translateY = useSharedValue(isNew ? 12 : 0);
  const scale = useSharedValue(isNew ? 0.82 : 1);

  useEffect(() => {
    if (!isNew) return;
    const delay = Math.min(index * 28, MAX_STAGGER_DELAY);
    const easing = Easing.out(Easing.cubic);
    opacity.value = withDelay(delay, withTiming(1, { duration: 300, easing }));
    translateX.value = withDelay(delay, withTiming(0, { duration: 320, easing }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 300, easing }));
    scale.value = withDelay(delay, withSpring(1, { damping: 14, stiffness: 200 }));
  }, [isNew]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}
