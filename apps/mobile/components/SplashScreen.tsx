/**
 * SplashScreen — cinematic preloader for the matrimonial app.
 *
 * Arc ring technique (no SVG, pure RN):
 *   The ring is drawn with two "half-disc" views each clipped to their half of
 *   the container via `overflow: hidden`.  Rotating each half independently
 *   draws any arc from 0 → 360 °.
 *
 *   Right half:  handles 0 → 50% progress  (rotates 0 → 180°)
 *   Left  half:  handles 50 → 100% progress (rotates 0 → 180°)
 *
 *   Each half's rotating child is a full circle with only the "visible" border
 *   pair coloured (the other pair is transparent so it doesn't bleed through).
 *   The pivot is set so the visible arc sweeps around the ring centre.
 */

import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const RING_SIZE = 120;       // outer diameter of the ring
const RING_BORDER = 4;       // stroke width
const BG = '#0a0a0f';
const ACCENT = '#f43f5e';

interface SplashScreenProps {
  onComplete: () => void;
}

// ---------------------------------------------------------------------------
// Counter sub-component — uses useDerivedValue to bridge worklet → JS state
// ---------------------------------------------------------------------------
function Counter({ progress }: { progress: Animated.SharedValue<number> }) {
  const [value, setValue] = React.useState(0);

  useAnimatedReaction(
    () => Math.round(progress.value * 100),
    (currentValue, previousValue) => {
      if (currentValue !== previousValue) {
        runOnJS(setValue)(currentValue);
      }
    },
  );

  return (
    <Text
      style={{
        color: 'rgba(255,255,255,0.92)',
        fontSize: 22,
        fontWeight: '300',
        letterSpacing: 2,
      }}
    >
      {value}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function SplashScreen({ onComplete }: SplashScreenProps) {
  const progress    = useSharedValue(0);   // 0 → 1, drives ring + counter
  const ringOpacity = useSharedValue(1);

  useEffect(() => {
    // Phase 1: fill the ring over 1 500 ms
    progress.value = withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad) }, (ok) => {
      if (!ok) return;

      // Phase 2: fade out the ring (300 ms), then notify parent
      ringOpacity.value = withTiming(0, { duration: 300 }, (done) => {
        if (done) runOnJS(onComplete)();
      });
    });
  }, []);

  // ---- animated styles ----
  const ringWrapStyle = useAnimatedStyle(() => ({ opacity: ringOpacity.value }));

  // Right half: 0–180° while progress 0–0.5
  const rightRotStyle = useAnimatedStyle(() => {
    const deg = Math.min(progress.value, 0.5) * 2 * 180;
    return { transform: [{ rotate: `${deg}deg` }] };
  });

  // Left half: 0–180° while progress 0.5–1.0
  const leftRotStyle = useAnimatedStyle(() => {
    const deg = Math.max(progress.value - 0.5, 0) * 2 * 180;
    return { transform: [{ rotate: `${deg}deg` }] };
  });

  const R = RING_SIZE;        // shorthand
  const B = RING_BORDER;

  return (
    <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}>

      {/* ── Ambient glow ──────────────────────────────────────────────────── */}
      <View
        style={{
          position: 'absolute',
          width: R * 2.8,
          height: R * 2.8,
          borderRadius: R * 1.4,
          backgroundColor: ACCENT,
          opacity: 0.13,
        }}
      />

      {/* ── Ring + counter ────────────────────────────────────────────────── */}
      <Animated.View style={ringWrapStyle}>
        <View style={{ width: R, height: R, alignItems: 'center', justifyContent: 'center' }}>

          {/* Track (dim full circle) */}
          <View
            style={{
              position: 'absolute',
              width: R,
              height: R,
              borderRadius: R / 2,
              borderWidth: B,
              borderColor: 'rgba(244,63,94,0.18)',
            }}
          />

          {/*
           * RIGHT half — clips the right 50% of the container.
           * The child circle has coloured border only on the top+right edges;
           * left+bottom are transparent.  Rotating it 0→180° sweeps the first
           * half of the arc (12 o'clock → 6 o'clock clockwise).
           *
           * The child is positioned so its vertical centre aligns with the
           * container centre; we translate it left by half its own width so
           * the ring strokes land on the container's ring path.
           */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: R / 2,       // clip: only right half of the container
              width: R / 2,
              height: R,
              overflow: 'hidden',
            }}
          >
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  top: 0,
                  left: -R / 2,   // shift left so the circle centre is at clip edge
                  width: R,
                  height: R,
                  borderRadius: R / 2,
                  borderWidth: B,
                  borderTopColor: ACCENT,
                  borderRightColor: ACCENT,
                  borderBottomColor: 'transparent',
                  borderLeftColor: 'transparent',
                },
                rightRotStyle,
              ]}
            />
          </View>

          {/*
           * LEFT half — clips the left 50% of the container.
           * Coloured border on bottom+left; rotates 0→180° to sweep the second
           * half (6 o'clock → 12 o'clock, still clockwise).
           */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: R / 2,
              height: R,
              overflow: 'hidden',
            }}
          >
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: R,
                  height: R,
                  borderRadius: R / 2,
                  borderWidth: B,
                  borderTopColor: 'transparent',
                  borderRightColor: 'transparent',
                  borderBottomColor: ACCENT,
                  borderLeftColor: ACCENT,
                },
                leftRotStyle,
              ]}
            />
          </View>

          {/* Counter */}
          <Counter progress={progress} />
        </View>
      </Animated.View>
    </View>
  );
}
