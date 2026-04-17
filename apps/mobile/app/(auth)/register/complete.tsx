import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button, ChromaText } from '@matrimonial/ui';
import { Ionicons } from '@expo/vector-icons';
import { useAnalytics } from '../../../hooks/useAnalytics';

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <View className="flex-row mb-8" style={{ gap: 4 }}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          className={`flex-1 h-1 rounded-full ${i < step ? 'bg-rose-500' : 'bg-gray-200'}`}
        />
      ))}
    </View>
  );
}

export default function RegisterComplete() {
  const router = useRouter();
  const { track } = useAnalytics();

  // Celebration animations
  const iconScale = useSharedValue(0);
  const iconOpacity = useSharedValue(0);
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0);
  const ring2Scale = useSharedValue(1);
  const ring2Opacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const subtitleOpacity = useSharedValue(0);
  const ctaOpacity = useSharedValue(0);
  const ctaY = useSharedValue(20);

  useEffect(() => {
    track('register_complete', { total_duration_ms: 0 });

    const e = Easing.out(Easing.cubic);

    // Checkmark: dramatic bounce overshoot
    iconOpacity.value = withTiming(1, { duration: 200 });
    iconScale.value = withSequence(
      withSpring(1.35, { damping: 6, stiffness: 200 }),
      withSpring(1.0, { damping: 12, stiffness: 200 }),
    );

    // Two expanding rings on icon appearance
    ringScale.value = withSequence(
      withTiming(1, { duration: 0 }),
      withTiming(2.8, { duration: 700, easing: e }),
    );
    ringOpacity.value = withSequence(
      withTiming(0.5, { duration: 0 }),
      withTiming(0, { duration: 700, easing: e }),
    );
    ring2Scale.value = withSequence(
      withTiming(1, { duration: 0 }),
      withDelay(180, withTiming(2.4, { duration: 600, easing: e })),
    );
    ring2Opacity.value = withSequence(
      withTiming(0, { duration: 0 }),
      withDelay(180, withSequence(
        withTiming(0.35, { duration: 0 }),
        withTiming(0, { duration: 600, easing: e }),
      )),
    );

    // Title + subtitle stagger
    titleOpacity.value = withDelay(280, withTiming(1, { duration: 350, easing: e }));
    subtitleOpacity.value = withDelay(420, withTiming(1, { duration: 350, easing: e }));
    ctaOpacity.value = withDelay(560, withTiming(1, { duration: 300, easing: e }));
    ctaY.value = withDelay(560, withTiming(0, { duration: 300, easing: e }));
  }, [track]);

  const iconStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
    transform: [{ scale: iconScale.value }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
  }));
  const ring2Style = useAnimatedStyle(() => ({
    opacity: ring2Opacity.value,
    transform: [{ scale: ring2Scale.value }],
  }));
  const titleStyle = useAnimatedStyle(() => ({ opacity: titleOpacity.value }));
  const subtitleStyle = useAnimatedStyle(() => ({ opacity: subtitleOpacity.value }));
  const ctaStyle = useAnimatedStyle(() => ({
    opacity: ctaOpacity.value,
    transform: [{ translateY: ctaY.value }],
  }));

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6 pt-4">
        <ProgressBar step={4} total={4} />

        <View className="flex-1 items-center justify-center" style={{ gap: 16 }}>
          {/* Icon with ring pulses */}
          <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
            <Animated.View
              pointerEvents="none"
              style={[{
                position: 'absolute',
                width: 80,
                height: 80,
                borderRadius: 40,
                borderWidth: 2,
                borderColor: '#f43f5e',
              }, ringStyle]}
            />
            <Animated.View
              pointerEvents="none"
              style={[{
                position: 'absolute',
                width: 80,
                height: 80,
                borderRadius: 40,
                borderWidth: 1.5,
                borderColor: '#fb7185',
              }, ring2Style]}
            />
            <Animated.View
              className="w-20 h-20 rounded-full bg-rose-50 items-center justify-center"
              style={iconStyle}
            >
              <Ionicons name="checkmark-circle" size={56} color="#f43f5e" />
            </Animated.View>
          </View>

          <Animated.View style={titleStyle}>
            <ChromaText
              text="注册成功！"
              style={{ fontSize: 30, fontWeight: '700', color: '#111827', textAlign: 'center' }}
            />
          </Animated.View>

          <Animated.Text
            className="text-base text-gray-400 text-center leading-6"
            style={subtitleStyle}
          >
            欢迎加入缘分，你的缘分之旅{'\n'}从这里开始
          </Animated.Text>
        </View>

        <Animated.View style={ctaStyle}>
          <Button
            title="开始探索"
            variant="primary"
            size="lg"
            fullWidth
            onPress={() => router.replace('/(tabs)')}
          />
          <View className="h-4" />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
