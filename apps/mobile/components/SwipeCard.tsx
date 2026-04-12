import React from 'react';
import { Dimensions, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
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
}

export function SwipeCard({ user, onSwipeLeft, onSwipeRight, isNext = false }: SwipeCardProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const panGesture = Gesture.Pan()
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

    const rotate = interpolate(translateX.value, [-SCREEN_WIDTH, SCREEN_WIDTH], [-15, 15]);
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const likeOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], 'clamp'),
  }));

  const skipOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0], 'clamp'),
  }));

  if (isNext) {
    return (
      <Animated.View
        className="absolute inset-0"
        style={[{ zIndex: 0 }, cardStyle]}
      >
        <ProfileCard user={user} />
      </Animated.View>
    );
  }

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View className="absolute inset-0" style={[{ zIndex: 1 }, cardStyle]}>
        <ProfileCard user={user} />

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
