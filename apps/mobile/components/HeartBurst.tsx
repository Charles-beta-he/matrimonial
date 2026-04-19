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
import { colors } from '../constants/colors';

interface HeartBurstProps {
  onPress: () => void;
  size?: number;
}

const PARTICLE_COLORS = [colors.primary, colors.primaryLight, colors.primaryMuted];
const PARTICLE_COUNT = 8;
const BASE_ANGLES = Array.from({ length: PARTICLE_COUNT }, (_, i) => (i * 360) / PARTICLE_COUNT);

// Seeded pseudo-random jitter so values are stable across renders
function jitter(seed: number): number {
  return ((seed * 9301 + 49297) % 233280) / 233280;
}

const PARTICLES = BASE_ANGLES.map((baseAngle, i) => {
  const angle = baseAngle + (jitter(i * 7 + 1) * 30 - 15); // ±15°
  const distance = 40 + jitter(i * 7 + 2) * 30; // 40-70px
  const particleSize = 8 + jitter(i * 7 + 3) * 6; // 8-14px
  const color = PARTICLE_COLORS[i % PARTICLE_COLORS.length];
  const rad = (angle * Math.PI) / 180;
  const dx = Math.cos(rad) * distance;
  const dy = Math.sin(rad) * distance;
  return { dx, dy, particleSize, color, delay: i * 15 };
});

// ── Single mini-heart particle ──
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

    const cfg = { duration: 600, easing: Easing.out(Easing.cubic) };
    tx.value = withDelay(delay, withTiming(dx, cfg));
    ty.value = withDelay(delay, withTiming(dy, cfg));
    scale.value = withDelay(delay, withSequence(withTiming(1, { duration: 80 }), withTiming(0, cfg)));
    opacity.value = withDelay(delay, withSequence(withTiming(1, { duration: 40 }), withTiming(0, cfg)));
  }, [fireCount]);
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
      <Ionicons name="heart" size={particleSize} color={color} />
    </Animated.View>
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
    scale.value = withTiming(2.5, { duration: 500, easing: Easing.out(Easing.cubic) });
    opacity.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) });
  }, [fireCount]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: 68,
          height: 68,
          borderRadius: 34,
          borderWidth: 2,
          borderColor: colors.primary,
        },
        style,
      ]}
    />
  );
}

// ── HeartBurst ──
export function HeartBurst({ onPress, size = 68 }: HeartBurstProps) {
  const heartScale = useSharedValue(1);
  const [burstKey, setBurstKey] = React.useState(0);

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  function handlePress() {
    heartScale.value = withSequence(
      withSpring(1.4, { damping: 6, stiffness: 300 }),
      withSpring(1.0, { damping: 6, stiffness: 300 }),
    );
    setBurstKey((k) => k + 1);
    onPress();
  }

  const buttonSize = size;
  const borderRadius = buttonSize / 2;

  return (
    <View style={{ width: buttonSize, height: buttonSize, alignItems: 'center', justifyContent: 'center' }}>
      {/* Ring pulse */}
      <RingPulse fireCount={burstKey} />

      {/* Particles */}
      {PARTICLES.map((p, i) => (
        <Particle key={i} {...p} fireCount={burstKey} />
      ))}

      {/* Heart button */}
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => ({
          width: buttonSize,
          height: buttonSize,
          borderRadius,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.35,
          shadowRadius: 6,
          elevation: 6,
          opacity: pressed ? 0.9 : 1,
        })}
      >
        <Animated.View style={heartStyle}>
          <Ionicons name="heart" size={32} color={colors.white} />
        </Animated.View>
      </Pressable>
    </View>
  );
}
