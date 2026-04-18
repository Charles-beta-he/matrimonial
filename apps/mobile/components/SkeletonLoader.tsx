import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

// ── Base shimmer block ──────────────────────────────────────────────────────

interface ShimmerProps {
  width: number | `${number}%`;
  height: number;
  borderRadius?: number;
  style?: object;
}

export function Shimmer({ width, height, borderRadius = 8, style }: ShimmerProps) {
  const sweep = useSharedValue(-300);

  useEffect(() => {
    sweep.value = withRepeat(
      withTiming(300, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
    );
  }, [sweep]);

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sweep.value }],
  }));

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: '#e5e7eb',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: 120,
            backgroundColor: 'rgba(255,255,255,0.45)',
            // Soft edges via narrow gradient-like taper using skewX
          },
          sweepStyle,
        ]}
      />
    </View>
  );
}

// ── Profile card skeleton ───────────────────────────────────────────────────

export function SkeletonCard() {
  return (
    <View style={{ width: '100%', height: '100%', borderRadius: 20, overflow: 'hidden' }}>
      {/* Full-bleed photo shimmer — matches actual ProfileCard */}
      <Shimmer width="100%" height={480} borderRadius={20} />
      {/* Name + info overlay at bottom */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: 20,
          gap: 10,
        }}
      >
        <Shimmer width="55%" height={22} borderRadius={6} />
        <Shimmer width="38%" height={16} borderRadius={6} />
      </View>
    </View>
  );
}

// ── Chat message skeleton ───────────────────────────────────────────────────

const BUBBLES: Array<{ align: 'left' | 'right'; widthPct: number }> = [
  { align: 'left', widthPct: 55 },
  { align: 'right', widthPct: 70 },
  { align: 'left', widthPct: 40 },
];

export function SkeletonMessage() {
  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}>
      {BUBBLES.map((bubble, i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row',
            justifyContent: bubble.align === 'right' ? 'flex-end' : 'flex-start',
          }}
        >
          {bubble.align === 'left' && (
            // Avatar circle
            <Shimmer width={36} height={36} borderRadius={18} style={{ marginRight: 8 }} />
          )}
          <Shimmer
            width={`${bubble.widthPct}%`}
            height={40}
            borderRadius={18}
          />
        </View>
      ))}
    </View>
  );
}
