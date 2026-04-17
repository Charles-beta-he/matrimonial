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
    <View
      style={{
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      {/* Image placeholder — 4:5 aspect ratio */}
      <Shimmer width="100%" height={0} borderRadius={0} style={{ aspectRatio: 4 / 5 }} />

      {/* Text lines below image */}
      <View style={{ padding: 16, gap: 10 }}>
        {/* Name line — 60% width */}
        <Shimmer width="60%" height={18} borderRadius={6} />
        {/* Info line — 40% width */}
        <Shimmer width="40%" height={14} borderRadius={6} />
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
