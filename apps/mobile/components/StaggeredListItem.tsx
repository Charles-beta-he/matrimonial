import React, { useEffect, ReactNode } from 'react';
import { ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

interface StaggeredListItemProps {
  children: ReactNode;
  index: number;
  style?: ViewStyle;
}

export function StaggeredListItem({ children, index, style }: StaggeredListItemProps) {
  const translateY = useSharedValue(30);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const delay = Math.min(index * 60, 400);
    const config = { duration: 350, easing: Easing.out(Easing.cubic) };
    translateY.value = withDelay(delay, withTiming(0, config));
    opacity.value = withDelay(delay, withTiming(1, config));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — entrance animation runs once on mount

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}
