import { useCallback, type ReactNode } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Pressable, type GestureResponderEvent, type ViewStyle } from 'react-native';

interface ScalePressableProps {
  onPress?: (e: GestureResponderEvent) => void;
  disabled?: boolean;
  className?: string;
  style?: ViewStyle;
  containerStyle?: ViewStyle;
  children: ReactNode;
}

export function ScalePressable({ onPress, disabled, className, style, containerStyle, children }: ScalePressableProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.96, { damping: 14, stiffness: 280 });
  }, [scale]);
  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 240 });
  }, [scale]);

  return (
    <Animated.View style={[animStyle, containerStyle]}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        onPressIn={disabled ? undefined : handlePressIn}
        onPressOut={disabled ? undefined : handlePressOut}
        className={className}
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
