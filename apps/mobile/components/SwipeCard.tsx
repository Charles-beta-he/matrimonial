import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { ProfileCardUser } from '@matrimonial/ui';
import { ProfileCard } from '@matrimonial/ui';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

interface SwipeCardProps {
  user: ProfileCardUser;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  isNext?: boolean;
  recommendReason?: string;
}

export function SwipeCard({ user, onSwipeLeft, onSwipeRight, isNext = false, recommendReason }: SwipeCardProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1.0);
  const decisionFlash = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      scale.value = withSpring(1.05);
    })
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.3;
    })
    .onEnd((e) => {
      if (e.translationX > SWIPE_THRESHOLD) {
        decisionFlash.value = withSequence(withTiming(0.55, { duration: 0 }), withTiming(0, { duration: 350 }));
        const dur = Math.max(80, 280 - Math.abs(e.velocityX) * 0.1);
        translateX.value = withTiming(SCREEN_WIDTH * 1.6, { duration: dur }, () => {
          if (onSwipeRight) runOnJS(onSwipeRight)();
        });
        translateY.value = withTiming(e.translationY + e.velocityY * 0.06, { duration: dur });
      } else if (e.translationX < -SWIPE_THRESHOLD) {
        decisionFlash.value = withSequence(withTiming(0.5, { duration: 0 }), withTiming(0, { duration: 350 }));
        const dur = Math.max(80, 280 - Math.abs(e.velocityX) * 0.1);
        translateX.value = withTiming(-SCREEN_WIDTH * 1.6, { duration: dur }, () => {
          if (onSwipeLeft) runOnJS(onSwipeLeft)();
        });
        translateY.value = withTiming(e.translationY + e.velocityY * 0.06, { duration: dur });
      } else {
        translateX.value = withSpring(0, { damping: 8, stiffness: 180 });
        translateY.value = withSpring(0, { damping: 8, stiffness: 180 });
      }
      scale.value = withSpring(1.0, { damping: 9, stiffness: 180 });
    })
    .onFinalize(() => {
      scale.value = withSpring(1.0);
    });

  const cardStyle = useAnimatedStyle(() => {
    if (isNext) {
      const s = interpolate(
        Math.abs(translateX.value),
        [0, SWIPE_THRESHOLD],
        [0.95, 1],
        'clamp',
      );
      return { transform: [{ scale: s }] };
    }

    const rotate = interpolate(translateX.value, [-150, 0, 150], [-15, 0, 15], Extrapolation.EXTEND);
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
        { scale: scale.value },
      ],
    };
  });

  // Full-card directional glow — green when swiping right, rose when swiping left
  const likeGlowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SCREEN_WIDTH * 0.38], [0, 0.38], Extrapolation.CLAMP),
  }));
  const skipGlowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SCREEN_WIDTH * 0.38, 0], [0.32, 0], Extrapolation.CLAMP),
  }));

  // Edge shimmer strip — narrows beam of intense color at leading edge
  const likeEdgeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [20, 100], [0, 0.7], Extrapolation.CLAMP),
  }));
  const skipEdgeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-100, -20], [0.7, 0], Extrapolation.CLAMP),
  }));

  // Ghost trail — lags at 45% translateX with fading opacity
  const ghostStyle = useAnimatedStyle(() => {
    const drag = Math.abs(translateX.value);
    const rotate = interpolate(translateX.value, [-150, 0, 150], [-8, 0, 8], Extrapolation.EXTEND);
    return {
      opacity: interpolate(drag, [0, 60], [0, 0.18], Extrapolation.CLAMP),
      transform: [
        { translateX: translateX.value * 0.45 },
        { translateY: translateY.value * 0.3 },
        { rotate: `${rotate}deg` },
        { scale: 0.97 },
      ],
    };
  });

  // Decision flash — bright white pulse on commit swipe
  const isRight = useAnimatedStyle(() => ({
    opacity: translateX.value > 0 ? decisionFlash.value : 0,
  }));
  const isLeft = useAnimatedStyle(() => ({
    opacity: translateX.value < 0 ? decisionFlash.value : 0,
  }));

  // LIKE/SKIP labels — scale bounces in alongside opacity
  const likeOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [35, 110], [0, 1], Extrapolation.CLAMP),
    transform: [
      { rotate: '-15deg' },
      { scale: interpolate(translateX.value, [35, 120], [0.4, 1.08], Extrapolation.CLAMP) },
    ],
  }));
  const skipOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-110, -35], [1, 0], Extrapolation.CLAMP),
    transform: [
      { rotate: '15deg' },
      { scale: interpolate(translateX.value, [-120, -35], [1.08, 0.4], Extrapolation.CLAMP) },
    ],
  }));

  if (isNext) {
    return (
      <Animated.View style={[StyleSheet.absoluteFillObject, { zIndex: 0 }, cardStyle]}>
        <ProfileCard user={user} />
      </Animated.View>
    );
  }

  return (
    <>
      {/* Ghost trail — card silhouette that lags behind during drag */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, styles.ghostCard, ghostStyle]}
      />
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[StyleSheet.absoluteFillObject, { zIndex: 1 }, cardStyle]}>
        <ProfileCard user={user} />

        {/* Directional glow — green (like) */}
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFillObject, styles.glowOverlay, { backgroundColor: '#22c55e' }, likeGlowStyle]}
        />
        {/* Directional glow — rose (skip) */}
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFillObject, styles.glowOverlay, { backgroundColor: '#f43f5e' }, skipGlowStyle]}
        />

        {/* Left edge shimmer strip (like direction) */}
        <Animated.View
          pointerEvents="none"
          style={[styles.edgeLeft, { backgroundColor: '#4ade80' }, likeEdgeStyle]}
        />
        {/* Right edge shimmer strip (skip direction) */}
        <Animated.View
          pointerEvents="none"
          style={[styles.edgeRight, { backgroundColor: '#fb7185' }, skipEdgeStyle]}
        />

        {/* Recommend reason pill */}
        {recommendReason ? (
          <View style={styles.reasonPill}>
            <Text style={styles.reasonText}>{recommendReason}</Text>
          </View>
        ) : null}

        {/* Decision flash — green for like, rose for skip */}
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFillObject, { backgroundColor: '#22c55e', borderRadius: 24 }, isRight]}
        />
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFillObject, { backgroundColor: '#f43f5e', borderRadius: 24 }, isLeft]}
        />

        {/* LIKE label */}
        <Animated.View
          style={[styles.likeLabel, likeOverlayStyle]}
        >
          <Text style={[styles.labelText, { color: '#22c55e' }]}>LIKE</Text>
        </Animated.View>

        {/* SKIP label */}
        <Animated.View
          style={[styles.skipLabel, skipOverlayStyle]}
        >
          <Text style={[styles.labelText, { color: '#f43f5e' }]}>SKIP</Text>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
    </>
  );
}

const styles = StyleSheet.create({
  ghostCard: {
    borderRadius: 24,
    backgroundColor: '#e5e7eb',
    zIndex: 0,
  },
  glowOverlay: {
    borderRadius: 24,
  },
  edgeLeft: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 5,
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
  },
  edgeRight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 5,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
  },
  reasonPill: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  reasonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  likeLabel: {
    position: 'absolute',
    top: 64,
    left: 24,
    borderWidth: 3,
    borderColor: '#22c55e',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skipLabel: {
    position: 'absolute',
    top: 64,
    right: 24,
    borderWidth: 3,
    borderColor: '#f43f5e',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  labelText: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
