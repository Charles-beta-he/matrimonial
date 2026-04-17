import React, { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

interface StarBurstProps {
  onPress: () => void;
  size?: number;
}

const PARTICLE_COLORS = ['#f59e0b', '#fbbf24', '#fde68a', '#ffffff'];
const PARTICLE_COUNT = 6;
const BASE_ANGLES = Array.from({ length: PARTICLE_COUNT }, (_, i) => (i * 360) / PARTICLE_COUNT);

// Seeded pseudo-random jitter so values are stable across renders
function jitter(seed: number): number {
  return ((seed * 9301 + 49297) % 233280) / 233280;
}

const PARTICLES = BASE_ANGLES.map((baseAngle, i) => {
  const angle = baseAngle + (jitter(i * 7 + 1) * 30 - 15); // ±15°
  const distance = 50 + jitter(i * 7 + 2) * 40; // 50-90px
  const particleSize = 10 + jitter(i * 7 + 3) * 6; // 10-16px
  const color = PARTICLE_COLORS[i % PARTICLE_COLORS.length];
  const rad = (angle * Math.PI) / 180;
  const dx = Math.cos(rad) * distance;
  const dy = Math.sin(rad) * distance;
  return { dx, dy, particleSize, color, delay: i * 25 };
});

// Sparkle diamonds at 45° offsets (between star particles)
const SPARKLE_ANGLES = [45, 135, 225, 315];
const SPARKLES = SPARKLE_ANGLES.map((angle, i) => {
  const distance = 35 + jitter(i * 13 + 5) * 20; // 35-55px
  const rad = (angle * Math.PI) / 180;
  return {
    dx: Math.cos(rad) * distance,
    dy: Math.sin(rad) * distance,
    delay: i * 20 + 50,
  };
});

// ── Single star particle ──
function Particle({
  dx,
  dy,
  particleSize,
  color,
  delay,
  fireCount,
}: {
  dx: number;
  dy: number;
  particleSize: number;
  color: string;
  delay: number;
  fireCount: number;
}) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (fireCount === 0) return;

    tx.value = 0;
    ty.value = 0;
    scale.value = 0;
    opacity.value = 0;

    const cfg = { duration: 700, easing: Easing.out(Easing.cubic) };
    tx.value = withDelay(delay, withTiming(dx, cfg));
    ty.value = withDelay(delay, withTiming(dy, cfg));
    scale.value = withDelay(delay, withSequence(withTiming(1, { duration: 80 }), withTiming(0, cfg)));
    opacity.value = withDelay(delay, withSequence(withTiming(1, { duration: 40 }), withTiming(0, cfg)));
  }, [fireCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: particleSize,
          height: particleSize,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Ionicons name="star" size={particleSize} color={color} />
    </Animated.View>
  );
}

// ── Diamond sparkle ──
function Sparkle({
  dx,
  dy,
  delay,
  fireCount,
}: {
  dx: number;
  dy: number;
  delay: number;
  fireCount: number;
}) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (fireCount === 0) return;

    tx.value = 0;
    ty.value = 0;
    scale.value = 0;
    opacity.value = 0;

    const cfg = { duration: 600, easing: Easing.out(Easing.cubic) };
    tx.value = withDelay(delay, withTiming(dx, cfg));
    ty.value = withDelay(delay, withTiming(dy, cfg));
    scale.value = withDelay(delay, withSequence(withTiming(1, { duration: 60 }), withTiming(0, cfg)));
    opacity.value = withDelay(delay, withSequence(withTiming(1, { duration: 30 }), withTiming(0, cfg)));
  }, [fireCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
      { rotate: '45deg' },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: 6,
          height: 6,
          backgroundColor: '#fbbf24',
        },
        style,
      ]}
    />
  );
}

// ── Ring pulse ──
function RingPulse({ fireCount }: { fireCount: number }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (fireCount === 0) return;
    scale.value = 1;
    opacity.value = 0.6;
    scale.value = withTiming(3.0, { duration: 600, easing: Easing.out(Easing.cubic) });
    opacity.value = withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) });
  }, [fireCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: 56,
          height: 56,
          borderRadius: 28,
          borderWidth: 2,
          borderColor: '#f59e0b',
        },
        style,
      ]}
    />
  );
}

// ── StarBurst ──
export function StarBurst({ onPress, size = 56 }: StarBurstProps) {
  const starScale = useSharedValue(1);
  const [burstKey, setBurstKey] = React.useState(0);

  const starStyle = useAnimatedStyle(() => ({
    transform: [{ scale: starScale.value }],
  }));

  function handlePress() {
    starScale.value = withSequence(
      withSpring(1.5, { damping: 5, stiffness: 250 }),
      withSpring(1.0, { damping: 10, stiffness: 300 }),
    );
    setBurstKey((k) => k + 1);
    onPress();
  }

  const borderRadius = size / 2;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Ring pulse */}
      <RingPulse fireCount={burstKey} />

      {/* Star particles */}
      {PARTICLES.map((p, i) => (
        <Particle key={i} {...p} fireCount={burstKey} />
      ))}

      {/* Diamond sparkles */}
      {SPARKLES.map((s, i) => (
        <Sparkle key={i} {...s} fireCount={burstKey} />
      ))}

      {/* Star button */}
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => ({
          width: size,
          height: size,
          borderRadius,
          backgroundColor: '#fef3c7',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#f59e0b',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 4,
          elevation: 3,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Animated.View style={starStyle}>
          <Ionicons name="star" size={30} color="#f59e0b" />
        </Animated.View>
      </Pressable>
    </View>
  );
}
