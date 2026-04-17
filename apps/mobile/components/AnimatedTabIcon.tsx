import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface AnimatedTabIconProps {
  name: IoniconName;
  focused: boolean;
  color: string;
  size?: number;
}

export function AnimatedTabIcon({ name, focused, color, size = 24 }: AnimatedTabIconProps) {
  const scale = useSharedValue(1);
  const dotScale = useSharedValue(focused ? 1 : 0);
  const glowScale = useSharedValue(0);
  const glowOpacity = useSharedValue(0);

  // Track whether this is the initial mount to skip animation
  const mounted = useSharedValue(false);

  useEffect(() => {
    if (!mounted.value) {
      mounted.value = true;
      return;
    }
    if (focused) {
      scale.value = withSequence(
        withSpring(1.3, { damping: 8, stiffness: 200 }),
        withSpring(1.0, { damping: 8, stiffness: 200 }),
      );
      dotScale.value = withSpring(1, { damping: 8, stiffness: 200 });
      glowScale.value = withSequence(
        withSpring(1.8, { damping: 6, stiffness: 150 }),
        withSpring(1.2, { damping: 12, stiffness: 200 }),
      );
      glowOpacity.value = withTiming(0.25, { duration: 150 });
    } else {
      dotScale.value = withTiming(0, { duration: 150 });
      glowScale.value = withTiming(0, { duration: 200 });
      glowOpacity.value = withTiming(0, { duration: 200 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: '#f43f5e',
            },
            glowStyle,
          ]}
        />
        <Animated.View style={iconStyle}>
          <Ionicons name={name} size={size} color={color} />
        </Animated.View>
      </View>
      <Animated.View
        style={[
          {
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: '#f43f5e',
            marginTop: 3,
          },
          dotStyle,
        ]}
      />
    </View>
  );
}
