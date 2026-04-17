import React, { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@matrimonial/ui';
import { Button } from '@matrimonial/ui';
import { useIcebreakers } from '@matrimonial/api-client';

const PARTICLE_COLORS = ['#f43f5e', '#f59e0b', '#ffffff', '#fb7185'];

/** Hooks-compliant: always calls useSharedValue exactly 16 times. */
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
  return [v0, v1, v2, v3, v4, v5, v6, v7, v8, v9, v10, v11, v12, v13, v14, v15];
}

interface ParticleData {
  angle: number;
  distance: number;
  size: number;
  color: string;
}

const PARTICLES: ParticleData[] = Array.from({ length: 16 }, (_, i) => ({
  angle: (i / 16) * 360 + Math.random() * 22.5,
  distance: 80 + Math.random() * 80,
  size: 6 + Math.random() * 4,
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

  const { data: icebreakersData, isLoading: icebreakersLoading } = useIcebreakers(
    matchedUserId ?? '',
    !!matchedUserId,
  );
  const suggestions = icebreakersData?.suggestions ?? [];

  function triggerParticles() {
    // Ring pulse
    ringScale.value = 1;
    ringOpacity.value = 0.6;
    ringScale.value = withTiming(2.2, { duration: 600, easing: Easing.out(Easing.quad) });
    ringOpacity.value = withTiming(0, { duration: 600, easing: Easing.out(Easing.quad) });

    // Particle burst
    PARTICLES.forEach((_, i) => {
      particleProgress[i].value = 0;
      particleProgress[i].value = withDelay(
        i * 20,
        withTiming(1, { duration: 800, easing: Easing.out(Easing.quad) }),
      );
    });
  }

  useEffect(() => {
    overlayOpacity.value = withTiming(1, { duration: 300 });
    leftX.value = withSpring(-40, { damping: 12 });
    rightX.value = withSpring(40, { damping: 12 });
    textScale.value = withDelay(400, withSpring(1, { damping: 10 }));
    triggerParticles();
  }, []);

  const leftStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: leftX.value }],
  }));

  const rightStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: rightX.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    transform: [{ scale: textScale.value }],
    opacity: textScale.value,
  }));

  const bgStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const particleStyles = [
    useAnimatedStyle(() => { const prog = particleProgress[0].value; const rad = (PARTICLES[0].angle * Math.PI) / 180; return { opacity: 1 - prog, transform: [{ translateX: Math.cos(rad) * PARTICLES[0].distance * prog }, { translateY: Math.sin(rad) * PARTICLES[0].distance * prog }] }; }),
    useAnimatedStyle(() => { const prog = particleProgress[1].value; const rad = (PARTICLES[1].angle * Math.PI) / 180; return { opacity: 1 - prog, transform: [{ translateX: Math.cos(rad) * PARTICLES[1].distance * prog }, { translateY: Math.sin(rad) * PARTICLES[1].distance * prog }] }; }),
    useAnimatedStyle(() => { const prog = particleProgress[2].value; const rad = (PARTICLES[2].angle * Math.PI) / 180; return { opacity: 1 - prog, transform: [{ translateX: Math.cos(rad) * PARTICLES[2].distance * prog }, { translateY: Math.sin(rad) * PARTICLES[2].distance * prog }] }; }),
    useAnimatedStyle(() => { const prog = particleProgress[3].value; const rad = (PARTICLES[3].angle * Math.PI) / 180; return { opacity: 1 - prog, transform: [{ translateX: Math.cos(rad) * PARTICLES[3].distance * prog }, { translateY: Math.sin(rad) * PARTICLES[3].distance * prog }] }; }),
    useAnimatedStyle(() => { const prog = particleProgress[4].value; const rad = (PARTICLES[4].angle * Math.PI) / 180; return { opacity: 1 - prog, transform: [{ translateX: Math.cos(rad) * PARTICLES[4].distance * prog }, { translateY: Math.sin(rad) * PARTICLES[4].distance * prog }] }; }),
    useAnimatedStyle(() => { const prog = particleProgress[5].value; const rad = (PARTICLES[5].angle * Math.PI) / 180; return { opacity: 1 - prog, transform: [{ translateX: Math.cos(rad) * PARTICLES[5].distance * prog }, { translateY: Math.sin(rad) * PARTICLES[5].distance * prog }] }; }),
    useAnimatedStyle(() => { const prog = particleProgress[6].value; const rad = (PARTICLES[6].angle * Math.PI) / 180; return { opacity: 1 - prog, transform: [{ translateX: Math.cos(rad) * PARTICLES[6].distance * prog }, { translateY: Math.sin(rad) * PARTICLES[6].distance * prog }] }; }),
    useAnimatedStyle(() => { const prog = particleProgress[7].value; const rad = (PARTICLES[7].angle * Math.PI) / 180; return { opacity: 1 - prog, transform: [{ translateX: Math.cos(rad) * PARTICLES[7].distance * prog }, { translateY: Math.sin(rad) * PARTICLES[7].distance * prog }] }; }),
    useAnimatedStyle(() => { const prog = particleProgress[8].value; const rad = (PARTICLES[8].angle * Math.PI) / 180; return { opacity: 1 - prog, transform: [{ translateX: Math.cos(rad) * PARTICLES[8].distance * prog }, { translateY: Math.sin(rad) * PARTICLES[8].distance * prog }] }; }),
    useAnimatedStyle(() => { const prog = particleProgress[9].value; const rad = (PARTICLES[9].angle * Math.PI) / 180; return { opacity: 1 - prog, transform: [{ translateX: Math.cos(rad) * PARTICLES[9].distance * prog }, { translateY: Math.sin(rad) * PARTICLES[9].distance * prog }] }; }),
    useAnimatedStyle(() => { const prog = particleProgress[10].value; const rad = (PARTICLES[10].angle * Math.PI) / 180; return { opacity: 1 - prog, transform: [{ translateX: Math.cos(rad) * PARTICLES[10].distance * prog }, { translateY: Math.sin(rad) * PARTICLES[10].distance * prog }] }; }),
    useAnimatedStyle(() => { const prog = particleProgress[11].value; const rad = (PARTICLES[11].angle * Math.PI) / 180; return { opacity: 1 - prog, transform: [{ translateX: Math.cos(rad) * PARTICLES[11].distance * prog }, { translateY: Math.sin(rad) * PARTICLES[11].distance * prog }] }; }),
    useAnimatedStyle(() => { const prog = particleProgress[12].value; const rad = (PARTICLES[12].angle * Math.PI) / 180; return { opacity: 1 - prog, transform: [{ translateX: Math.cos(rad) * PARTICLES[12].distance * prog }, { translateY: Math.sin(rad) * PARTICLES[12].distance * prog }] }; }),
    useAnimatedStyle(() => { const prog = particleProgress[13].value; const rad = (PARTICLES[13].angle * Math.PI) / 180; return { opacity: 1 - prog, transform: [{ translateX: Math.cos(rad) * PARTICLES[13].distance * prog }, { translateY: Math.sin(rad) * PARTICLES[13].distance * prog }] }; }),
    useAnimatedStyle(() => { const prog = particleProgress[14].value; const rad = (PARTICLES[14].angle * Math.PI) / 180; return { opacity: 1 - prog, transform: [{ translateX: Math.cos(rad) * PARTICLES[14].distance * prog }, { translateY: Math.sin(rad) * PARTICLES[14].distance * prog }] }; }),
    useAnimatedStyle(() => { const prog = particleProgress[15].value; const rad = (PARTICLES[15].angle * Math.PI) / 180; return { opacity: 1 - prog, transform: [{ translateX: Math.cos(rad) * PARTICLES[15].distance * prog }, { translateY: Math.sin(rad) * PARTICLES[15].distance * prog }] }; }),
  ];

  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
  }));

  return (
    <Animated.View
      className="absolute inset-0 items-center justify-center z-50"
      style={[{ backgroundColor: 'rgba(0,0,0,0.8)' }, bgStyle]}
    >
      {/* Ring pulse */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            width: 100,
            height: 100,
            borderRadius: 50,
            borderWidth: 2,
            borderColor: '#f43f5e',
          },
          ringStyle,
        ]}
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

      {/* Avatars */}
      <View className="flex-row items-center mb-8">
        <Animated.View style={leftStyle}>
          <Avatar source={{ uri: myPhoto }} size={100} />
        </Animated.View>
        <Animated.View style={rightStyle}>
          <Avatar source={{ uri: theirPhoto }} size={100} />
        </Animated.View>
      </View>

      {/* Match text */}
      <Animated.View style={textStyle} className="items-center mb-8">
        <Text className="text-white text-3xl font-bold mb-2">It's a Match!</Text>
        <Text className="text-white/80 text-base">
          你和 {theirName} 互相喜欢了对方
        </Text>
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
