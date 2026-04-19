import { useEffect } from 'react';
import { View } from 'react-native';
import { colors } from '../constants/colors';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

function Dot({ delayMs }: { delayMs: number }) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(-7, { duration: 260, easing: Easing.out(Easing.cubic) }),
          withTiming(0, { duration: 260, easing: Easing.in(Easing.cubic) }),
          withTiming(0, { duration: 200 }),
        ),
        -1,
        false,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[{
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: colors.gray400,
        marginHorizontal: 3,
      }, style]}
    />
  );
}

export function AnimatedTypingIndicator() {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.gray100,
        borderRadius: 16,
        borderTopLeftRadius: 4,
        paddingHorizontal: 12,
        paddingVertical: 10,
        alignSelf: 'flex-start',
      }}
    >
      <Dot delayMs={0} />
      <Dot delayMs={160} />
      <Dot delayMs={320} />
    </View>
  );
}
