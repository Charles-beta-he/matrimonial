import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
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
        translateX.value = withTiming(SCREEN_WIDTH * 1.5, { duration: 300 }, () => {
          if (onSwipeRight) runOnJS(onSwipeRight)();
        });
      } else if (e.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withTiming(-SCREEN_WIDTH * 1.5, { duration: 300 }, () => {
          if (onSwipeLeft) runOnJS(onSwipeLeft)();
        });
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
      scale.value = withSpring(1.0);
    })
    .onFinalize(() => {
      scale.value = withSpring(1.0);
    });

  const cardStyle = useAnimatedStyle(() => {
    if (isNext) {
      const scale = interpolate(
        Math.abs(translateX.value),
        [0, SWIPE_THRESHOLD],
        [0.95, 1],
        'clamp',
      );
      return {
        transform: [{ scale }],
      };
    }

    const rotate = interpolate(translateX.value, [-150, 0, 150], [-15, 0, 15], Extrapolation.CLAMP);
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
        { scale: scale.value },
      ],
    };
  });

  const likeOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [40, 120], [0, 1], Extrapolation.CLAMP),
  }));

  const skipOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-120, -40], [1, 0], Extrapolation.CLAMP),
  }));

  if (isNext) {
    return (
      <Animated.View
        style={[StyleSheet.absoluteFillObject, { zIndex: 0 }, cardStyle]}
      >
        <ProfileCard user={user} />
      </Animated.View>
    );
  }

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[StyleSheet.absoluteFillObject, { zIndex: 1 }, cardStyle]}>
        <ProfileCard user={user} />

        {/* Recommend reason pill */}
        {recommendReason ? (
          <View
            style={{
              position: 'absolute',
              top: 12,
              alignSelf: 'center',
              backgroundColor: 'rgba(0,0,0,0.45)',
              borderRadius: 20,
              paddingHorizontal: 12,
              paddingVertical: 5,
            }}
          >
            <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '500' }}>
              {recommendReason}
            </Text>
          </View>
        ) : null}

        {/* LIKE overlay */}
        <Animated.View
          className="absolute top-16 left-6 border-4 border-green-500 rounded-xl px-4 py-2"
          style={[{ transform: [{ rotate: '-15deg' }] }, likeOverlayStyle]}
        >
          <Text className="text-green-500 text-3xl font-extrabold">LIKE</Text>
        </Animated.View>

        {/* SKIP overlay */}
        <Animated.View
          className="absolute top-16 right-6 border-4 border-red-500 rounded-xl px-4 py-2"
          style={[{ transform: [{ rotate: '15deg' }] }, skipOverlayStyle]}
        >
          <Text className="text-red-500 text-3xl font-extrabold">SKIP</Text>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}
