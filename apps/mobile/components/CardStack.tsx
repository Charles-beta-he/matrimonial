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
  const translateY = useSharedValue(60);
  // Entrance scale — top card pops from 0.92→1, others from 0.96→1
  const entranceScale = useSharedValue(index === 0 ? 0.92 : 0.96);
  // Breathing scale — only animated for the top card (index 0)
  const breathScale = useSharedValue(1);

  useEffect(() => {
    const delay = index * 80;
    const easing = Easing.out(Easing.cubic);

    opacity.value = withDelay(delay, withTiming(1, { duration: 400, easing }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 400, easing }));
    entranceScale.value = withDelay(delay, withSpring(1, { damping: 14, stiffness: 160 }));

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
