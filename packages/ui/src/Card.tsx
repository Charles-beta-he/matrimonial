import React from 'react';
import { Platform, Pressable, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  onPress?: () => void;
  shadow?: boolean;
}

const shadowStyle = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  android: {
    elevation: 2,
  },
  // RN-web 18+ prefers boxShadow over shadow* props
  web: {
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  default: {},
});

const SPRING = { damping: 15, stiffness: 300 };

function PressableCard({ children, className = '', onPress, shadow = true }: CardProps) {
  const scale = useSharedValue(1);
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={scaleStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.97, SPRING); }}
        onPressOut={() => { scale.value = withSpring(1, SPRING); }}
        className={`bg-white rounded-2xl overflow-hidden ${className}`}
        style={shadow ? shadowStyle : undefined}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

export function Card({ children, className = '', onPress, shadow = true }: CardProps) {
  if (onPress) {
    return (
      <PressableCard className={className} onPress={onPress} shadow={shadow}>
        {children}
      </PressableCard>
    );
  }

  return (
    <View
      className={`bg-white rounded-2xl overflow-hidden ${className}`}
      style={shadow ? shadowStyle : undefined}
    >
      {children}
    </View>
  );
}
