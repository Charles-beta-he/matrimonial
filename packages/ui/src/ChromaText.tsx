import React, { useEffect } from 'react';
import { StyleSheet, Text, TextStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
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
  const redX = useSharedValue(-22);
  const redY = useSharedValue(5);
  const blueX = useSharedValue(22);
  const blueY = useSharedValue(-5);
  const chromaOpacity = useSharedValue(0);
  const mainOpacity = useSharedValue(0);

  const CONVERGE = { duration: 650, easing: Easing.out(Easing.cubic) };

  function materialize() {
    mainOpacity.value = withTiming(1, { duration: 220 });
    chromaOpacity.value = withSequence(
      withTiming(1.0, { duration: 0 }),
      withTiming(0.7, { duration: 700, easing: Easing.out(Easing.cubic) }),
    );
    redX.value = withTiming(-2, CONVERGE);
    redY.value = withTiming(1, CONVERGE);
    blueX.value = withTiming(2, CONVERGE);
    blueY.value = withTiming(-1, CONVERGE);
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
