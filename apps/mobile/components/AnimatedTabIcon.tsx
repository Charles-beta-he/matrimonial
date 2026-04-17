import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  Easing,
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
  const outerRingScale = useSharedValue(0);
  const outerRingOpacity = useSharedValue(0);

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
      glowOpacity.value = withTiming(0.35, { duration: 150 });
      outerRingScale.value = withSequence(
        withTiming(3.0, { duration: 400, easing: Easing.out(Easing.cubic) }),
        withTiming(2.4, { duration: 200 }),
      );
      outerRingOpacity.value = withSequence(
        withTiming(0.5, { duration: 0 }),
        withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) }),
      );
    } else {
      dotScale.value = withTiming(0, { duration: 150 });
      glowScale.value = withTiming(0, { duration: 200 });
      glowOpacity.value = withTiming(0, { duration: 200 });
      outerRingOpacity.value = withTiming(0, { duration: 150 });
    }
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

  const outerRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: outerRingScale.value }],
    opacity: outerRingOpacity.value,
  }));

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View
          style={[{
            position: 'absolute',
            width: 44,
            height: 44,
            borderRadius: 22,
            borderWidth: 1.5,
            borderColor: '#f43f5e',
          }, outerRingStyle]}
        />
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: '#fb7185',
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
