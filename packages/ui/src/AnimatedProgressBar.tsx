import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

function Segment({ filled, delay }: { filled: boolean; delay: number }) {
  const x = useSharedValue(filled ? -200 : 0);

  useEffect(() => {
    if (filled) {
      x.value = withDelay(delay, withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) }));
    }
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));

  return (
    <View style={{ flex: 1, height: 4, borderRadius: 2, overflow: 'hidden', backgroundColor: '#e5e7eb' }}>
      <Animated.View
        style={[
          { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#f43f5e' },
          style,
        ]}
      />
    </View>
  );
}

export function AnimatedProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4, marginBottom: 32 }}>
      {Array.from({ length: total }, (_, i) => (
        <Segment key={i} filled={i < step} delay={i * 60} />
      ))}
    </View>
  );
}
