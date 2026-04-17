import React, { useEffect } from 'react';
import { StyleSheet, TextStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

export interface ChromaTextProps {
  text: string;
  style?: TextStyle;
  trigger?: boolean;
}

export function ChromaText({ text, style, trigger }: ChromaTextProps) {
  // Start channels maximally separated — will converge on mount (materialization)
  const redX = useSharedValue(-30);
  const redY = useSharedValue(8);
  const blueX = useSharedValue(30);
  const blueY = useSharedValue(-8);
  const chromaOpacity = useSharedValue(0);
  const mainOpacity = useSharedValue(0);

  const CONVERGE = { duration: 650, easing: Easing.out(Easing.cubic) };

  const DRIFT = { duration: 2800, easing: Easing.inOut(Easing.quad) };
  const DRIFT_Y = { duration: 2400, easing: Easing.inOut(Easing.quad) };

  function materialize() {
    mainOpacity.value = withTiming(1, { duration: 220 });
    chromaOpacity.value = withSequence(
      withTiming(1.0, { duration: 0 }),
      withTiming(0.65, { duration: 700, easing: Easing.out(Easing.cubic) }),
    );
    // Converge then continuously micro-drift for living chromatic aberration
    redX.value = withSequence(
      withTiming(-2, CONVERGE),
      withRepeat(withSequence(withTiming(-3.2, DRIFT), withTiming(-0.8, DRIFT)), -1, true),
    );
    redY.value = withSequence(
      withTiming(1, CONVERGE),
      withRepeat(withSequence(withTiming(2.0, DRIFT_Y), withTiming(0.3, DRIFT_Y)), -1, true),
    );
    blueX.value = withSequence(
      withTiming(2, CONVERGE),
      withRepeat(withSequence(withTiming(3.2, DRIFT), withTiming(0.8, DRIFT)), -1, true),
    );
    blueY.value = withSequence(
      withTiming(-1, CONVERGE),
      withRepeat(withSequence(withTiming(-2.0, DRIFT_Y), withTiming(-0.3, DRIFT_Y)), -1, true),
    );
  }

  function runGlitch() {
    redX.value = withSequence(
      withTiming(-10, { duration: 70 }),
      withTiming(-2, { duration: 130 }),
    );
    redY.value = withSequence(
      withTiming(5, { duration: 70 }),
      withTiming(1, { duration: 130 }),
    );
    blueX.value = withSequence(
      withTiming(10, { duration: 70 }),
      withTiming(2, { duration: 130 }),
    );
    blueY.value = withSequence(
      withTiming(-5, { duration: 70 }),
      withTiming(-1, { duration: 130 }),
    );
    chromaOpacity.value = withSequence(
      withTiming(0.4, { duration: 35 }),
      withTiming(0.7, { duration: 35 }),
    );
  }

  useEffect(() => {
    materialize();
  }, []);

  useEffect(() => {
    if (trigger) runGlitch();
  }, [trigger]);

  const redAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: redX.value }, { translateY: redY.value }],
    opacity: chromaOpacity.value,
  }));

  const blueAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: blueX.value }, { translateY: blueY.value }],
    opacity: chromaOpacity.value,
  }));

  const mainAnimStyle = useAnimatedStyle(() => ({
    opacity: mainOpacity.value,
  }));

  const { color: passedColor, ...restStyle } = StyleSheet.flatten(style) ?? {};
  const mainColor = (passedColor as string | undefined) ?? 'white';

  return (
    <>
      <Animated.Text
        style={[restStyle, styles.absolute, { color: 'rgba(255,0,0,0.7)' }, redAnimStyle]}
        numberOfLines={1}
        accessibilityElementsHidden
      >
        {text}
      </Animated.Text>
      <Animated.Text
        style={[restStyle, styles.absolute, { color: 'rgba(0,100,255,0.7)' }, blueAnimStyle]}
        numberOfLines={1}
        accessibilityElementsHidden
      >
        {text}
      </Animated.Text>
      <Animated.Text
        style={[restStyle, { color: mainColor }, mainAnimStyle]}
        numberOfLines={1}
      >
        {text}
      </Animated.Text>
    </>
  );
}

const styles = StyleSheet.create({
  absolute: {
    position: 'absolute',
  },
});
