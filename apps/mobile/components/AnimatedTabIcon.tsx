import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { colors } from '../constants/colors';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface AnimatedTabIconProps {
  name: IoniconName;
  focused: boolean;
  color: string;
  size?: number;
  badgeCount?: number;
}

export function AnimatedTabIcon({ name, focused, color, size = 24, badgeCount = 0 }: AnimatedTabIconProps) {
  const scale = useSharedValue(1);
  const dotScale = useSharedValue(focused ? 1 : 0);
  // Chromatic aberration on icon — red/blue split on focus
  const chromaRedX = useSharedValue(0);
  const chromaBlueX = useSharedValue(0);
  const chromaOp = useSharedValue(0);
  // Soft fill disc — filled circle bloom behind icon
  const glowFillScale = useSharedValue(0);
  const glowFillOpacity = useSharedValue(0);
  // Inner crisp ring — expands to 1.6× and fades
  const innerRingScale = useSharedValue(0);
  const innerRingOpacity = useSharedValue(0);
  // Outer bloom ring — expands further, softer glow
  const outerBloomScale = useSharedValue(0);
  const outerBloomOpacity = useSharedValue(0);
  // Expanding burst ring (existing outerRing behaviour)
  const burstRingScale = useSharedValue(0);
  const burstRingOpacity = useSharedValue(0);
  const badgeScale = useSharedValue(badgeCount > 0 ? 1 : 0);

  const mounted = useSharedValue(false);

  useEffect(() => {
    if (!mounted.value) {
      mounted.value = true;
      return;
    }
    if (focused) {
      // Soft glow fill — wide bloom fill disc
      glowFillScale.value = withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(2.8, { duration: 550, easing: Easing.out(Easing.cubic) }),
      );
      glowFillOpacity.value = withSequence(
        withTiming(0.22, { duration: 0 }),
        withTiming(0, { duration: 580, easing: Easing.out(Easing.cubic) }),
      );

      // Icon bounce
      scale.value = withSequence(
        withSpring(1.3, { damping: 7, stiffness: 220 }),
        withSpring(1.0, { damping: 10, stiffness: 220 }),
      );
      dotScale.value = withSpring(1, { damping: 8, stiffness: 200 });

      // Chromatic split — red goes left, blue goes right, fade out
      chromaOp.value = withSequence(
        withTiming(0.55, { duration: 0 }),
        withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) }),
      );
      chromaRedX.value = withSequence(
        withTiming(-7, { duration: 80 }),
        withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) }),
      );
      chromaBlueX.value = withSequence(
        withTiming(7, { duration: 80 }),
        withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) }),
      );

      // Inner ring: quick expand + linger with soft opacity
      innerRingScale.value = withSequence(
        withTiming(0, { duration: 0 }),
        withSpring(1.5, { damping: 10, stiffness: 180 }),
      );
      innerRingOpacity.value = withSequence(
        withTiming(0.7, { duration: 0 }),
        withTiming(0.35, { duration: 300 }),
        withTiming(0, { duration: 350, easing: Easing.out(Easing.cubic) }),
      );

      // Outer bloom: slower expand, very soft diffuse glow
      outerBloomScale.value = withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(2.4, { duration: 500, easing: Easing.out(Easing.cubic) }),
      );
      outerBloomOpacity.value = withSequence(
        withTiming(0.45, { duration: 0 }),
        withTiming(0, { duration: 550, easing: Easing.out(Easing.cubic) }),
      );

      // Burst ring: fast single pulse that shoots out
      burstRingScale.value = withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(3.2, { duration: 420, easing: Easing.out(Easing.cubic) }),
      );
      burstRingOpacity.value = withSequence(
        withTiming(0.5, { duration: 0 }),
        withTiming(0, { duration: 420, easing: Easing.out(Easing.cubic) }),
      );
    } else {
      dotScale.value = withTiming(0, { duration: 150 });
      glowFillOpacity.value = withTiming(0, { duration: 150 });
      innerRingOpacity.value = withTiming(0, { duration: 150 });
      outerBloomOpacity.value = withTiming(0, { duration: 150 });
      burstRingOpacity.value = withTiming(0, { duration: 150 });
    }
  }, [focused]);

  useEffect(() => {
    if (badgeCount > 0) {
      badgeScale.value = withSequence(
        withTiming(0, { duration: 0 }),
        withSpring(1.3, { damping: 6, stiffness: 300 }),
        withSpring(1.0, { damping: 10, stiffness: 200 }),
      );
    } else {
      badgeScale.value = withTiming(0, { duration: 150 });
    }
  }, [badgeCount]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const chromaRedStyle = useAnimatedStyle(() => ({
    opacity: chromaOp.value,
    transform: [{ translateX: chromaRedX.value }],
  }));
  const chromaBlueStyle = useAnimatedStyle(() => ({
    opacity: chromaOp.value,
    transform: [{ translateX: chromaBlueX.value }],
  }));
  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale.value }],
  }));
  const glowFillStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowFillScale.value }],
    opacity: glowFillOpacity.value,
  }));
  const innerRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: innerRingScale.value }],
    opacity: innerRingOpacity.value,
  }));
  const outerBloomStyle = useAnimatedStyle(() => ({
    transform: [{ scale: outerBloomScale.value }],
    opacity: outerBloomOpacity.value,
  }));
  const burstRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: burstRingScale.value }],
    opacity: burstRingOpacity.value,
  }));
  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        {/* Soft glow fill disc — filled bloom behind icon */}
        <Animated.View
          pointerEvents="none"
          style={[{
            position: 'absolute',
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: 'rgba(244,63,94,0.30)',
          }, glowFillStyle]}
        />
        {/* Outer bloom — wide soft halo, 8px border for diffuse look */}
        <Animated.View
          pointerEvents="none"
          style={[{
            position: 'absolute',
            width: 44,
            height: 44,
            borderRadius: 22,
            borderWidth: 8,
            borderColor: 'rgba(244,63,94,0.3)',
          }, outerBloomStyle]}
        />
        {/* Burst ring — single sharp pulse shoot-out */}
        <Animated.View
          pointerEvents="none"
          style={[{
            position: 'absolute',
            width: 44,
            height: 44,
            borderRadius: 22,
            borderWidth: 1.5,
            borderColor: colors.primary,
          }, burstRingStyle]}
        />
        {/* Inner crisp ring — stays closer, lingers */}
        <Animated.View
          pointerEvents="none"
          style={[{
            position: 'absolute',
            width: 44,
            height: 44,
            borderRadius: 22,
            borderWidth: 2,
            borderColor: 'rgba(244,63,94,0.6)',
          }, innerRingStyle]}
        />
        {/* Chromatic aberration layers — red left, blue right */}
        <Animated.View pointerEvents="none" style={[{ position: 'absolute' }, chromaRedStyle]}>
          <Ionicons name={name} size={size} color={colors.primary} />
        </Animated.View>
        <Animated.View pointerEvents="none" style={[{ position: 'absolute' }, chromaBlueStyle]}>
          <Ionicons name={name} size={size} color={colors.indigo} />
        </Animated.View>
        <Animated.View style={iconStyle}>
          <Ionicons name={name} size={size} color={color} />
        </Animated.View>
        {badgeCount > 0 && (
          <Animated.View
            style={[{
              position: 'absolute',
              top: -4,
              right: -6,
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 3,
            }, badgeStyle]}
          >
            <Text style={{ color: colors.white, fontSize: 9, fontWeight: '700', lineHeight: 11 }}>
              {badgeCount > 99 ? '99+' : badgeCount}
            </Text>
          </Animated.View>
        )}
      </View>
      <Animated.View
        style={[{
          width: 4,
          height: 4,
          borderRadius: 2,
          backgroundColor: colors.primary,
          marginTop: 3,
        }, dotStyle]}
      />
    </View>
  );
}
