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
    } else {
      dotScale.value = withTiming(0, { duration: 150 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale.value }],
  }));

  return (
    <View style={{ alignItems: 'center' }}>
      <Animated.View style={iconStyle}>
        <Ionicons name={name} size={size} color={color} />
      </Animated.View>
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
