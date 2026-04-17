import { ReactNode, useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface Props {
  children: ReactNode;
  isOwn: boolean;
  index: number;
  isNew?: boolean;
}

const DURATION = 280;
const TRANSLATE_X_AMOUNT = 40;
const MAX_STAGGER_DELAY = 300;

export function AnimatedMessageBubble({ children, isOwn, index, isNew }: Props) {
  const opacity = useSharedValue(isNew ? 0 : 1);
  const translateX = useSharedValue(isNew ? (isOwn ? TRANSLATE_X_AMOUNT : -TRANSLATE_X_AMOUNT) : 0);

  useEffect(() => {
    if (!isNew) return;
    const delay = Math.min(index * 30, MAX_STAGGER_DELAY);
    const easingFn = Easing.out(Easing.cubic);
    opacity.value = withDelay(delay, withTiming(1, { duration: DURATION, easing: easingFn }));
    translateX.value = withDelay(delay, withTiming(0, { duration: DURATION, easing: easingFn }));
  }, [isNew]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}
