import React, { type ReactNode, useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

interface CardStackProps {
  children: ReactNode;
  index: number;
  totalCards: number;
}

export function CardStack({ children, index, totalCards: _totalCards }: CardStackProps) {
  const opacity = useSharedValue(0);
  // Top card pops from further away; next card from closer
  const translateY = useSharedValue(index === 0 ? 48 : 24);
  // Top card: dramatic pop from 0.86; next card: subtle from 0.94
  const entranceScale = useSharedValue(index === 0 ? 0.86 : 0.94);
  // Breathing scale — only animated for the top card (index 0)
  const breathScale = useSharedValue(1);

  useEffect(() => {
    const delay = index * 60;
    const easing = Easing.out(Easing.cubic);

    opacity.value = withDelay(delay, withTiming(1, { duration: 320, easing }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 360, easing }));
    // Top card gets a bouncy overshoot spring, next card stays subtle
    entranceScale.value = withDelay(
      delay,
      index === 0
        ? withSpring(1, { damping: 8, stiffness: 220 })
        : withSpring(1, { damping: 14, stiffness: 160 }),
    );

    if (index === 0) {
      // Start breathing loop after the entrance animation finishes
      const entranceDone = delay + 400;
      const timer = setTimeout(() => {
        breathScale.value = withRepeat(
          withTiming(1.008, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
          -1,
          true,
        );
      }, entranceDone);
      return () => clearTimeout(timer);
    }
  }, []);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: entranceScale.value * (index === 0 ? breathScale.value : 1) },
    ],
  }));

  return (
    <Animated.View
      style={[
        { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
        animatedStyle,
      ]}
    >
      {children}
    </Animated.View>
  );
}
