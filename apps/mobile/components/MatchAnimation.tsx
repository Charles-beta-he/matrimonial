import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, ChromaText, Button } from '@matrimonial/ui';
import { useIcebreakers } from '@matrimonial/api-client';

const PARTICLE_COLORS = ['#f43f5e', '#f59e0b', '#ffffff', '#fb7185', '#fde68a', '#c084fc'];

/** Hooks-compliant: always calls useSharedValue exactly 24 times. */
function useParticleSharedValues(): SharedValue<number>[] {
  const v0 = useSharedValue(0);
  const v1 = useSharedValue(0);
  const v2 = useSharedValue(0);
  const v3 = useSharedValue(0);
  const v4 = useSharedValue(0);
  const v5 = useSharedValue(0);
  const v6 = useSharedValue(0);
  const v7 = useSharedValue(0);
  const v8 = useSharedValue(0);
  const v9 = useSharedValue(0);
  const v10 = useSharedValue(0);
  const v11 = useSharedValue(0);
  const v12 = useSharedValue(0);
  const v13 = useSharedValue(0);
  const v14 = useSharedValue(0);
  const v15 = useSharedValue(0);
  const v16 = useSharedValue(0);
  const v17 = useSharedValue(0);
  const v18 = useSharedValue(0);
  const v19 = useSharedValue(0);
  const v20 = useSharedValue(0);
  const v21 = useSharedValue(0);
  const v22 = useSharedValue(0);
  const v23 = useSharedValue(0);
  return [v0, v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12, v13, v14, v15, v16, v17, v18, v19, v20, v21, v22, v23];
}

interface ParticleData {
  angle: number;
  distance: number;
  size: number;
  color: string;
}

const PARTICLES: ParticleData[] = Array.from({ length: 24 }, (_, i) => ({
  angle: (i / 24) * 360 + (i % 3) * 5,
  distance: 300 + (i % 3) * 120,
  size: 5 + (i % 4) * 3,
  color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
}));

interface MatchAnimationProps {
  myPhoto: string;
  theirPhoto: string;
  theirName: string;
  matchedUserId?: string;
  onSendMessage: (prefill?: string) => void;
  onContinue: () => void;
}

export function MatchAnimation({
  myPhoto,
  theirPhoto,
  theirName,
  matchedUserId,
  onSendMessage,
  onContinue,
}: MatchAnimationProps) {
  const leftX = useSharedValue(-150);
  const rightX = useSharedValue(150);
  const textScale = useSharedValue(0);
  const overlayOpacity = useSharedValue(0);

  // Particle shared values — progress drives both position and opacity
  const particleProgress = useParticleSharedValues();

  // Ring pulse shared values
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0);
  const ringScale2 = useSharedValue(1);
  const ringOpacity2 = useSharedValue(0);
  const ringScale3 = useSharedValue(1);
  const ringOpacity3 = useSharedValue(0);
  const ringScale4 = useSharedValue(1);
  const ringOpacity4 = useSharedValue(0);
  const ringScale5 = useSharedValue(1);
  const ringOpacity5 = useSharedValue(0);
  // Ring 6 — outermost thin halo
  const ringScale6 = useSharedValue(1);
  const ringOpacity6 = useSharedValue(0);
  // Shockwave fill disc
  const shockwaveScale = useSharedValue(1);
  const shockwaveOpacity = useSharedValue(0);
  // Echo wave — second pulse at ~1400ms
  const echoRingScale1 = useSharedValue(1);
  const echoRingOpacity1 = useSharedValue(0);
  const echoRingScale2 = useSharedValue(1);
  const echoRingOpacity2 = useSharedValue(0);
  const echoRingScale3 = useSharedValue(1);
  const echoRingOpacity3 = useSharedValue(0);

  // Central white flash
  const flashOpacity = useSharedValue(0);

  // Avatar entrance rotation
  const rotL = useSharedValue(-15);
  const rotR = useSharedValue(15);

  // Content group scale-in
  const contentScale = useSharedValue(0.82);

  const { data: icebreakersData, isLoading: icebreakersLoading } = useIcebreakers(
    matchedUserId ?? '',
    !!matchedUserId,
  );
  const suggestions = icebreakersData?.suggestions ?? [];

  function triggerParticles() {
    // Ring 1 — immediate, thick, expands wide
    ringScale.value = 1;
    ringOpacity.value = 0.65;
    ringScale.value = withTiming(11.0, { duration: 1100, easing: Easing.out(Easing.cubic) });
    ringOpacity.value = withTiming(0, { duration: 1100, easing: Easing.out(Easing.cubic) });

    // Ring 2 — 120ms delay
    ringScale2.value = 1;
    ringOpacity2.value = 0;
    ringScale2.value = withDelay(120, withTiming(8.5, { duration: 1000, easing: Easing.out(Easing.cubic) }));
    ringOpacity2.value = withDelay(
      120,
      withSequence(
        withTiming(0.55, { duration: 0 }),
        withTiming(0, { duration: 1000, easing: Easing.out(Easing.cubic) }),
      ),
    );

    // Ring 3 — 280ms delay
    ringScale3.value = 1;
    ringOpacity3.value = 0;
    ringScale3.value = withDelay(280, withTiming(8.0, { duration: 950, easing: Easing.out(Easing.cubic) }));
    ringOpacity3.value = withDelay(
      280,
      withSequence(
        withTiming(0.45, { duration: 0 }),
        withTiming(0, { duration: 950, easing: Easing.out(Easing.cubic) }),
      ),
    );

    // Ring 4 — 480ms delay, gold
    ringScale4.value = 1;
    ringOpacity4.value = 0;
    ringScale4.value = withDelay(480, withTiming(7.5, { duration: 900, easing: Easing.out(Easing.cubic) }));
    ringOpacity4.value = withDelay(
      480,
      withSequence(
        withTiming(0.55, { duration: 0 }),
        withTiming(0, { duration: 900, easing: Easing.out(Easing.cubic) }),
      ),
    );

    // Ring 5 — 700ms delay, white — wide bloom
    ringScale5.value = 1;
    ringOpacity5.value = 0;
    ringScale5.value = withDelay(700, withTiming(7.0, { duration: 850, easing: Easing.out(Easing.cubic) }));
    ringOpacity5.value = withDelay(
      700,
      withSequence(
        withTiming(0.35, { duration: 0 }),
        withTiming(0, { duration: 850, easing: Easing.out(Easing.cubic) }),
      ),
    );

    // Ring 6 — outermost halo at 900ms
    ringScale6.value = 1;
    ringOpacity6.value = 0;
    ringScale6.value = withDelay(900, withTiming(12.0, { duration: 1200, easing: Easing.out(Easing.cubic) }));
    ringOpacity6.value = withDelay(
      900,
      withSequence(
        withTiming(0.25, { duration: 0 }),
        withTiming(0, { duration: 1200, easing: Easing.out(Easing.cubic) }),
      ),
    );

    // Shockwave fill disc — immediate filled bloom
    shockwaveScale.value = 1;
    shockwaveOpacity.value = 0;
    shockwaveScale.value = withTiming(10, { duration: 700, easing: Easing.out(Easing.cubic) });
    shockwaveOpacity.value = withSequence(
      withTiming(0.1, { duration: 0 }),
      withTiming(0, { duration: 700, easing: Easing.out(Easing.cubic) }),
    );

    // Echo wave — second pulse rings at 1400ms
    echoRingScale1.value = 1;
    echoRingOpacity1.value = 0;
    echoRingScale1.value = withDelay(1400, withTiming(7, { duration: 800, easing: Easing.out(Easing.cubic) }));
    echoRingOpacity1.value = withDelay(1400, withSequence(
      withTiming(0.4, { duration: 0 }),
      withTiming(0, { duration: 800, easing: Easing.out(Easing.cubic) }),
    ));

    echoRingScale2.value = 1;
    echoRingOpacity2.value = 0;
    echoRingScale2.value = withDelay(1560, withTiming(6, { duration: 700, easing: Easing.out(Easing.cubic) }));
    echoRingOpacity2.value = withDelay(1560, withSequence(
      withTiming(0.3, { duration: 0 }),
      withTiming(0, { duration: 700, easing: Easing.out(Easing.cubic) }),
    ));

    echoRingScale3.value = 1;
    echoRingOpacity3.value = 0;
    echoRingScale3.value = withDelay(1720, withTiming(5, { duration: 600, easing: Easing.out(Easing.cubic) }));
    echoRingOpacity3.value = withDelay(1720, withSequence(
      withTiming(0.22, { duration: 0 }),
      withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }),
    ));

    // Particle burst
    PARTICLES.forEach((_, i) => {
      particleProgress[i].value = 0;
      particleProgress[i].value = withDelay(
        i * 15,
        withTiming(1, { duration: 1300, easing: Easing.out(Easing.quad) }),
      );
    });
  }

  useEffect(() => {
    overlayOpacity.value = withTiming(1, { duration: 300 });
    // Avatars overshoot on collision then settle
    leftX.value = withSequence(
      withSpring(-52, { damping: 8, stiffness: 160 }),
      withSpring(-40, { damping: 14, stiffness: 200 }),
    );
    rightX.value = withSequence(
      withSpring(52, { damping: 8, stiffness: 160 }),
      withSpring(40, { damping: 14, stiffness: 200 }),
    );
    // Text: spring in, then heartbeat pulse at 1200ms
    textScale.value = withDelay(
      380,
      withSequence(
        withSpring(1, { damping: 9, stiffness: 160 }),
        withDelay(800, withSequence(
          withSpring(1.07, { damping: 7, stiffness: 350 }),
          withSpring(1.0, { damping: 12, stiffness: 250 }),
        )),
      ),
    );
    flashOpacity.value = withSequence(
      withTiming(0.85, { duration: 70 }),
      withTiming(0, { duration: 450, easing: Easing.out(Easing.cubic) }),
    );
    rotL.value = withSpring(0, { damping: 9 });
    rotR.value = withSpring(0, { damping: 9 });
    contentScale.value = withDelay(200, withSpring(1, { damping: 10, stiffness: 130 }));
    triggerParticles();
  }, []);

  const leftStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: leftX.value }, { rotate: `${rotL.value}deg` }],
  }));

  const rightStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: rightX.value }, { rotate: `${rotR.value}deg` }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    transform: [{ scale: textScale.value }],
    opacity: textScale.value,
  }));

  const bgStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const particleStyles = [
    useAnimatedStyle(() => { const prog = particleProgress[0].value; const rad = (PARTICLES[0].angle * Math.PI) / 180; const sc = 1 + prog * 1.4 * (1 - prog) * 2; return { opacity: Math.max(0, 1 - prog * 1.2), transform: [{ translateX: Math.cos(rad) * PARTICLES[0].distance * prog }, { translateY: Math.sin(rad) * PARTICLES[0].distance * prog }, { scale: sc }] }; }),
    useAnimatedStyle(() => { const prog = particleProgress[1].value; const rad = (PARTICLES[1].angle * Math.PI) / 180; const sc = 1 + prog * 1.4 * (1 - prog) * 2; return { opacity: Math.max(0, 1 - prog * 1.2), transform: [{ translateX: Math.cos(rad) * PARTICLES[1].distance * prog }, { translateY: Math.sin(rad) * PARTICLES[1].distance * prog }, { scale: sc }] }; }),
    useAnimatedStyle(() => { const prog = particleProgress[2].value; const rad = (PARTICLES[2].angle * Math.PI) / 180; const sc = 1 + prog * 1.4 * (1 - prog) * 2; return { opacity: Math.max(0, 1 - prog * 1.2), transform: [{ translateX: Math.cos(rad) * PARTICLES[2].distance * prog }, { translateY: Math.sin(rad) * PARTICLES[2].distance * prog }, { scale: sc }] }; }),
    useAnimatedStyle(() => { const prog = particleProgress[3].value; const rad = (PARTICLES[3].angle * Math.PI) / 180; const sc = 1 + prog * 1.4 * (1 - prog) * 2; return { opacity: Math.max(0, 1 - prog * 1.2), transform: [{ translateX: Math.cos(rad) * PARTICLES[3].distance * prog }, { translateY: Math.sin(rad) * PARTICLES[3].distance * prog }, { scale: sc }] }; }),
    useAnimatedStyle(() => { const prog = particleProgress[4].value; const rad = (PARTICLES[4].angle * Math.PI) / 180; const sc = 1 + prog * 1.4 * (1 - prog) * 2; return { opacity: Math.max(0, 1 - prog * 1.2), transform: [{ translateX: Math.cos(rad) * PARTICLES[4].distance * prog }, { translateY: Math.sin(rad) * PARTICLES[4].distance * prog }, { scale: sc }] }; }),
    useAnimatedStyle(() => { const prog = particleProgress[5].value; const rad = (PARTICLES[5].angle * Math.PI) / 180; const sc = 1 + prog * 1.4 * (1 - prog) * 2; return { opacity: Math.max(0, 1 - prog * 1.2), transform: [{ translateX: Math.cos(rad) * PARTICLES[5].distance * prog }, { translateY: Math.sin(rad) * PARTICLES[5].distance * prog }, { scale: sc }] }; }),
    useAnimatedStyle(() => { const prog = particleProgress[6].value; const rad = (PARTICLES[6].angle * Math.PI) / 180; const sc = 1 + prog * 1.4 * (1 - prog) * 2; return { opacity: Math.max(0, 1 - prog * 1.2), transform: [{ translateX: Math.cos(rad) * PARTICLES[6].distance * prog }, { translateY: Math.sin(rad) * PARTICLES[6].distance * prog }, { scale: sc }] }; }),
    useAnimatedStyle(() => { const prog = particleProgress[7].value; const rad = (PARTICLES[7].angle * Math.PI) / 180; const sc = 1 + prog * 1.4 * (1 - prog) * 2; return { opacity: Math.max(0, 1 - prog * 1.2), transform: [{ translateX: Math.cos(rad) * PARTICLES[7].distance * prog }, { translateY: Math.sin(rad) * PARTICLES[7].distance * prog }, { scale: sc }] }; }),
    useAnimatedStyle(() => { const prog = particleProgress[8].value; const rad = (PARTICLES[8].angle * Math.PI) / 180; const sc = 1 + prog * 1.4 * (1 - prog) * 2; return { opacity: Math.max(0, 1 - prog * 1.2), transform: [{ translateX: Math.cos(rad) * PARTICLES[8].distance * prog }, { translateY: Math.sin(rad) * PARTICLES[8].distance * prog }, { scale: sc }] }; }),
    useAnimatedStyle(() => { const prog = particleProgress[9].value; const rad = (PARTICLES[9].angle * Math.PI) / 180; const sc = 1 + prog * 1.4 * (1 - prog) * 2; return { opacity: Math.max(0, 1 - prog * 1.2), transform: [{ translateX: Math.cos(rad) * PARTICLES[9].distance * prog }, { translateY: Math.sin(rad) * PARTICLES[9].distance * prog }, { scale: sc }] }; }),
    useAnimatedStyle(() => { const prog = particleProgress[10].value; const rad = (PARTICLES[10].angle * Math.PI) / 180; const sc = 1 + prog * 1.4 * (1 - prog) * 2; return { opacity: Math.max(0, 1 - prog * 1.2), transform: [{ translateX: Math.cos(rad) * PARTICLES[10].distance * prog }, { translateY: Math.sin(rad) * PARTICLES[10].distance * prog }, { scale: sc }] }; }),
    useAnimatedStyle(() => { const prog = particleProgress[11].value; const rad = (PARTICLES[11].angle * Math.PI) / 180; const sc = 1 + prog * 1.4 * (1 - prog) * 2; return { opacity: Math.max(0, 1 - prog * 1.2), transform: [{ translateX: Math.cos(rad) * PARTICLES[11].distance * prog }, { translateY: Math.sin(rad) * PARTICLES[11].distance * prog }, { scale: sc }] }; }),
    useAnimatedStyle(() => { const prog = particleProgress[12].value; const rad = (PARTICLES[12].angle * Math.PI) / 180; const sc = 1 + prog * 1.4 * (1 - prog) * 2; return { opacity: Math.max(0, 1 - prog * 1.2), transform: [{ translateX: Math.cos(rad) * PARTICLES[12].distance * prog }, { translateY: Math.sin(rad) * PARTICLES[12].distance * prog }, { scale: sc }] }; }),
    useAnimatedStyle(() => { const prog = particleProgress[13].value; const rad = (PARTICLES[13].angle * Math.PI) / 180; const sc = 1 + prog * 1.4 * (1 - prog) * 2; return { opacity: Math.max(0, 1 - prog * 1.2), transform: [{ translateX: Math.cos(rad) * PARTICLES[13].distance * prog }, { translateY: Math.sin(rad) * PARTICLES[13].distance * prog }, { scale: sc }] }; }),
    useAnimatedStyle(() => { const prog = particleProgress[14].value; const rad = (PARTICLES[14].angle * Math.PI) / 180; const sc = 1 + prog * 1.4 * (1 - prog) * 2; return { opacity: Math.max(0, 1 - prog * 1.2), transform: [{ translateX: Math.cos(rad) * PARTICLES[14].distance * prog }, { translateY: Math.sin(rad) * PARTICLES[14].distance * prog }, { scale: sc }] }; }),
    useAnimatedStyle(() => { const prog = particleProgress[15].value; const rad = (PARTICLES[15].angle * Math.PI) / 180; const sc = 1 + prog * 1.4 * (1 - prog) * 2; return { opacity: Math.max(0, 1 - prog * 1.2), transform: [{ translateX: Math.cos(rad) * PARTICLES[15].distance * prog }, { translateY: Math.sin(rad) * PARTICLES[15].distance * prog }, { scale: sc }] }; }),
    useAnimatedStyle(() => { const prog = particleProgress[16].value; const rad = (PARTICLES[16].angle * Math.PI) / 180; const sc = 1 + prog * 1.4 * (1 - prog) * 2; return { opacity: Math.max(0, 1 - prog * 1.2), transform: [{ translateX: Math.cos(rad) * PARTICLES[16].distance * prog }, { translateY: Math.sin(rad) * PARTICLES[16].distance * prog }, { scale: sc }] }; }),
    useAnimatedStyle(() => { const prog = particleProgress[17].value; const rad = (PARTICLES[17].angle * Math.PI) / 180; const sc = 1 + prog * 1.4 * (1 - prog) * 2; return { opacity: Math.max(0, 1 - prog * 1.2), transform: [{ translateX: Math.cos(rad) * PARTICLES[17].distance * prog }, { translateY: Math.sin(rad) * PARTICLES[17].distance * prog }, { scale: sc }] }; }),
    useAnimatedStyle(() => { const prog = particleProgress[18].value; const rad = (PARTICLES[18].angle * Math.PI) / 180; const sc = 1 + prog * 1.4 * (1 - prog) * 2; return { opacity: Math.max(0, 1 - prog * 1.2), transform: [{ translateX: Math.cos(rad) * PARTICLES[18].distance * prog }, { translateY: Math.sin(rad) * PARTICLES[18].distance * prog }, { scale: sc }] }; }),
    useAnimatedStyle(() => { const prog = particleProgress[19].value; const rad = (PARTICLES[19].angle * Math.PI) / 180; const sc = 1 + prog * 1.4 * (1 - prog) * 2; return { opacity: Math.max(0, 1 - prog * 1.2), transform: [{ translateX: Math.cos(rad) * PARTICLES[19].distance * prog }, { translateY: Math.sin(rad) * PARTICLES[19].distance * prog }, { scale: sc }] }; }),
    useAnimatedStyle(() => { const prog = particleProgress[20].value; const rad = (PARTICLES[20].angle * Math.PI) / 180; const sc = 1 + prog * 1.4 * (1 - prog) * 2; return { opacity: Math.max(0, 1 - prog * 1.2), transform: [{ translateX: Math.cos(rad) * PARTICLES[20].distance * prog }, { translateY: Math.sin(rad) * PARTICLES[20].distance * prog }, { scale: sc }] }; }),
    useAnimatedStyle(() => { const prog = particleProgress[21].value; const rad = (PARTICLES[21].angle * Math.PI) / 180; const sc = 1 + prog * 1.4 * (1 - prog) * 2; return { opacity: Math.max(0, 1 - prog * 1.2), transform: [{ translateX: Math.cos(rad) * PARTICLES[21].distance * prog }, { translateY: Math.sin(rad) * PARTICLES[21].distance * prog }, { scale: sc }] }; }),
    useAnimatedStyle(() => { const prog = particleProgress[22].value; const rad = (PARTICLES[22].angle * Math.PI) / 180; const sc = 1 + prog * 1.4 * (1 - prog) * 2; return { opacity: Math.max(0, 1 - prog * 1.2), transform: [{ translateX: Math.cos(rad) * PARTICLES[22].distance * prog }, { translateY: Math.sin(rad) * PARTICLES[22].distance * prog }, { scale: sc }] }; }),
    useAnimatedStyle(() => { const prog = particleProgress[23].value; const rad = (PARTICLES[23].angle * Math.PI) / 180; const sc = 1 + prog * 1.4 * (1 - prog) * 2; return { opacity: Math.max(0, 1 - prog * 1.2), transform: [{ translateX: Math.cos(rad) * PARTICLES[23].distance * prog }, { translateY: Math.sin(rad) * PARTICLES[23].distance * prog }, { scale: sc }] }; }),
  ];

  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
  }));

  const ringStyle2 = useAnimatedStyle(() => ({
    opacity: ringOpacity2.value,
    transform: [{ scale: ringScale2.value }],
  }));

  const ringStyle3 = useAnimatedStyle(() => ({
    opacity: ringOpacity3.value,
    transform: [{ scale: ringScale3.value }],
  }));

  const ringStyle4 = useAnimatedStyle(() => ({
    opacity: ringOpacity4.value,
    transform: [{ scale: ringScale4.value }],
  }));

  const ringStyle5 = useAnimatedStyle(() => ({
    opacity: ringOpacity5.value,
    transform: [{ scale: ringScale5.value }],
  }));

  const ringStyle6 = useAnimatedStyle(() => ({
    opacity: ringOpacity6.value,
    transform: [{ scale: ringScale6.value }],
  }));

  const shockwaveStyle = useAnimatedStyle(() => ({
    opacity: shockwaveOpacity.value,
    transform: [{ scale: shockwaveScale.value }],
  }));

  const echoRingStyle1 = useAnimatedStyle(() => ({
    opacity: echoRingOpacity1.value,
    transform: [{ scale: echoRingScale1.value }],
  }));

  const echoRingStyle2 = useAnimatedStyle(() => ({
    opacity: echoRingOpacity2.value,
    transform: [{ scale: echoRingScale2.value }],
  }));

  const echoRingStyle3 = useAnimatedStyle(() => ({
    opacity: echoRingOpacity3.value,
    transform: [{ scale: echoRingScale3.value }],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  const contentScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: contentScale.value }],
  }));

  return (
    <Animated.View
      className="absolute inset-0 items-center justify-center z-50"
      style={[{ backgroundColor: 'rgba(0,0,0,0.8)' }, bgStyle]}
    >
      {/* Ring pulse — ring 1 (thick, rose) */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            width: 100,
            height: 100,
            borderRadius: 50,
            borderWidth: 4,
            borderColor: '#f43f5e',
          },
          ringStyle,
        ]}
      />

      {/* Ring pulse — ring 2 */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            width: 100,
            height: 100,
            borderRadius: 50,
            borderWidth: 2,
            borderColor: '#fb7185',
          },
          ringStyle2,
        ]}
      />

      {/* Ring pulse — ring 3 */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            width: 100,
            height: 100,
            borderRadius: 50,
            borderWidth: 2,
            borderColor: 'rgba(251, 113, 133, 0.4)',
          },
          ringStyle3,
        ]}
      />

      {/* Ring pulse — ring 4 (gold) */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            width: 100,
            height: 100,
            borderRadius: 50,
            borderWidth: 2,
            borderColor: '#fde68a',
          },
          ringStyle4,
        ]}
      />

      {/* Ring pulse — ring 5 (white bloom) */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            width: 100,
            height: 100,
            borderRadius: 50,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.5)',
          },
          ringStyle5,
        ]}
      />

      {/* Ring 6 — outermost thin halo, 900ms */}
      <Animated.View
        pointerEvents="none"
        style={[{ position: 'absolute', width: 100, height: 100, borderRadius: 50, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' }, ringStyle6]}
      />

      {/* Shockwave fill disc — immediate filled bloom */}
      <Animated.View
        pointerEvents="none"
        style={[{ position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(244,63,94,0.15)' }, shockwaveStyle]}
      />

      {/* Echo rings — second pulse at 1400ms */}
      <Animated.View
        pointerEvents="none"
        style={[{ position: 'absolute', width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: '#f43f5e' }, echoRingStyle1]}
      />
      <Animated.View
        pointerEvents="none"
        style={[{ position: 'absolute', width: 100, height: 100, borderRadius: 50, borderWidth: 1.5, borderColor: '#fb7185' }, echoRingStyle2]}
      />
      <Animated.View
        pointerEvents="none"
        style={[{ position: 'absolute', width: 100, height: 100, borderRadius: 50, borderWidth: 1, borderColor: 'rgba(251,113,133,0.5)' }, echoRingStyle3]}
      />

      {/* Central white flash */}
      <Animated.View
        pointerEvents="none"
        style={[{ ...StyleSheet.absoluteFillObject, backgroundColor: '#ffffff' }, flashStyle]}
      />

      {/* Particle burst */}
      {PARTICLES.map((p, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              width: p.size,
              height: p.size,
              borderRadius: p.size / 2,
              backgroundColor: p.color,
            },
            particleStyles[i],
          ]}
        />
      ))}

      {/* Avatars + content — scale-in together */}
      <Animated.View style={[{ alignItems: 'center', width: '100%' }, contentScaleStyle]}>
        <View className="flex-row items-center mb-8">
          <Animated.View style={leftStyle}>
            <Avatar source={{ uri: myPhoto }} size={100} />
          </Animated.View>
          <Animated.View style={rightStyle}>
            <Avatar source={{ uri: theirPhoto }} size={100} />
          </Animated.View>
        </View>

        {/* Match text with chromatic aberration */}
        <Animated.View style={textStyle} className="items-center mb-8">
          <View style={{ position: 'relative', height: 44, justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
            <ChromaText
              text="It's a Match!"
              style={{ fontSize: 30, fontWeight: '700', color: 'white' }}
            />
          </View>
          <Text className="text-white/80 text-base">
            你和 {theirName} 互相喜欢了对方
          </Text>
        </Animated.View>
      </Animated.View>

      {/* AI Icebreaker suggestions */}
      {matchedUserId && (
        <View className="w-full px-8 mb-6">
          <View className="flex-row items-center justify-center mb-3" style={{ gap: 6 }}>
            <Ionicons name="sparkles" size={14} color="#fde68a" />
            <Text className="text-white/90 text-sm font-semibold">AI 破冰建议</Text>
          </View>
          {icebreakersLoading ? (
            <Text className="text-white/60 text-xs text-center">正在生成建议…</Text>
          ) : (
            <View style={{ gap: 8 }}>
              {suggestions.map((s, i) => (
                <Pressable
                  key={i}
                  onPress={() => onSendMessage(s)}
                  className="bg-white/15 border border-white/25 rounded-full px-4 py-2"
                >
                  <Text className="text-white text-sm text-center">{s}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Action buttons */}
      <View className="w-full px-8" style={{ gap: 12 }}>
        <Button
          title="发消息"
          variant="primary"
          size="lg"
          fullWidth
          onPress={() => onSendMessage()}
        />
        <Button title="继续浏览" variant="outline" size="lg" fullWidth onPress={onContinue} />
      </View>
    </Animated.View>
  );
}
