import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface ChromaTransitionProps {
  children: React.ReactNode;
}

export function ChromaTransition({ children }: ChromaTransitionProps) {
  const glitchProgress = useSharedValue(1);
  const contentOpacity = useSharedValue(0);

  useEffect(() => {
    glitchProgress.value = withTiming(0, {
      duration: 320,
      easing: Easing.out(Easing.cubic),
    });
    contentOpacity.value = withTiming(1, {
      duration: 250,
    });
  }, []);

  const redOverlayStyle = useAnimatedStyle(() => ({
    opacity: glitchProgress.value * 0.3,
    transform: [{ translateX: glitchProgress.value * -10 }],
  }));

  const blueOverlayStyle = useAnimatedStyle(() => ({
    opacity: glitchProgress.value * 0.25,
    transform: [{ translateX: glitchProgress.value * 10 }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    flex: 1,
  }));

  return (
    <View style={{ flex: 1 }}>
      <Animated.View style={contentStyle}>
        {children}
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: '#f43f5e' }, redOverlayStyle]}
      />
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: '#3b82f6' }, blueOverlayStyle]}
      />
    </View>
  );
}
