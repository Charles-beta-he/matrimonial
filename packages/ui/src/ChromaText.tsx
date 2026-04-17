import React, { useEffect } from 'react';
import { StyleSheet, Text, TextStyle } from 'react-native';
import Animated, {
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
  const redX = useSharedValue(-2);
  const redY = useSharedValue(1);
  const blueX = useSharedValue(2);
  const blueY = useSharedValue(-1);
  const chromaOpacity = useSharedValue(0.7);

  function runGlitch() {
    'worklet';
    redX.value = withSequence(
      withTiming(-8, { duration: 80 }),
      withTiming(-2, { duration: 120 }),
    );
    redY.value = withSequence(
      withTiming(4, { duration: 80 }),
      withTiming(1, { duration: 120 }),
    );
    blueX.value = withSequence(
      withTiming(8, { duration: 80 }),
      withTiming(2, { duration: 120 }),
    );
    blueY.value = withSequence(
      withTiming(-4, { duration: 80 }),
      withTiming(-1, { duration: 120 }),
    );
    chromaOpacity.value = withSequence(
      withTiming(0.4, { duration: 40 }),
      withTiming(0.7, { duration: 40 }),
      withTiming(0.7, { duration: 0 }),
    );
  }

  useEffect(() => {
    runGlitch();
  }, []);

  useEffect(() => {
    if (trigger) {
      runGlitch();
    }
  }, [trigger]);

  const redAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: redX.value }, { translateY: redY.value }],
    opacity: chromaOpacity.value,
  }));

  const blueAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: blueX.value }, { translateY: blueY.value }],
    opacity: chromaOpacity.value,
  }));

  const { color: passedColor, ...restStyle } = StyleSheet.flatten(style) ?? {};
  const mainColor = (passedColor as string | undefined) ?? 'white';

  return (
    <>
      {/* Red channel — absolutely overlaid, drawn first (bottom-most) */}
      <Animated.Text
        style={[restStyle, styles.absolute, { color: 'rgba(255,0,0,0.7)' }, redAnimStyle]}
        numberOfLines={1}
        accessibilityElementsHidden
      >
        {text}
      </Animated.Text>

      {/* Blue channel — absolutely overlaid */}
      <Animated.Text
        style={[restStyle, styles.absolute, { color: 'rgba(0,100,255,0.7)' }, blueAnimStyle]}
        numberOfLines={1}
        accessibilityElementsHidden
      >
        {text}
      </Animated.Text>

      {/* Main layer — in normal flow, drives layout size, renders on top */}
      <Text style={[restStyle, { color: mainColor }]} numberOfLines={1}>
        {text}
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  absolute: {
    position: 'absolute',
  },
});
