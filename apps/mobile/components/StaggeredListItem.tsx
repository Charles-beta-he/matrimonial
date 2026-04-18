import React, { useEffect, ReactNode } from 'react';
import { ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
} from 'react-native-reanimated';

interface StaggeredListItemProps {
  children: ReactNode;
  index: number;
  style?: ViewStyle;
}

export function StaggeredListItem({ children, index, style }: StaggeredListItemProps) {
  const translateY = useSharedValue(28);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.94);

  useEffect(() => {
    const delay = Math.min(index * 55, 380);
    translateY.value = withDelay(delay, withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) }));
    opacity.value = withDelay(delay, withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) }));
    // Spring scale gives physical bounce vs flat timing
    scale.value = withDelay(delay, withSpring(1, { damping: 11, stiffness: 200 }));
  }, []); // intentionally empty — entrance animation runs once on mount

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}
