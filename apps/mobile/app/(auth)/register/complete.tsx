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
import { Button } from '@matrimonial/ui';
import { Ionicons } from '@expo/vector-icons';
import { useAnalytics } from '../../../hooks/useAnalytics';
import { colors } from '../../../constants/colors';

export default function RegisterComplete() {
  const router = useRouter();
  const { track } = useAnalytics();

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

    iconOpacity.value = withTiming(1, { duration: 200 });
    iconScale.value = withSequence(
      withSpring(1.35, { damping: 6, stiffness: 200 }),
      withSpring(1.0, { damping: 12, stiffness: 200 }),
    );

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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fdfcfa' }}>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 8 }}>
        {/* Step segments — all filled */}
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 56, marginBottom: 24 }}>
          {Array.from({ length: 5 }, (_, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                backgroundColor: '#e11d48',
              }}
            />
          ))}
        </View>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
            <Animated.View
              pointerEvents="none"
              style={[{
                position: 'absolute',
                width: 96,
                height: 96,
                borderRadius: 48,
                borderWidth: 2,
                borderColor: colors.primary,
              }, ringStyle]}
            />
            <Animated.View
              pointerEvents="none"
              style={[{
                position: 'absolute',
                width: 96,
                height: 96,
                borderRadius: 48,
                borderWidth: 1.5,
                borderColor: colors.primaryLight,
              }, ring2Style]}
            />
            <Animated.View
              style={[
                {
                  width: 96,
                  height: 96,
                  borderRadius: 48,
                  backgroundColor: '#fff1f2',
                  alignItems: 'center',
                  justifyContent: 'center',
                },
                iconStyle,
              ]}
            >
              <Ionicons name="checkmark" size={52} color={colors.primary} />
            </Animated.View>
          </View>

          <Animated.Text
            style={[
              titleStyle,
              {
                fontSize: 32,
                fontWeight: '700',
                color: '#0b0b0f',
                letterSpacing: -0.5,
                textAlign: 'center',
                marginBottom: 12,
              },
            ]}
          >
            欢迎你，新缘分
          </Animated.Text>
          <Animated.Text
            style={[
              subtitleStyle,
              {
                fontSize: 15,
                color: '#6b7280',
                lineHeight: 24,
                textAlign: 'center',
                paddingHorizontal: 16,
              },
            ]}
          >
            资料已就绪。{'\n'}对的人，可能正在下一次推荐里。
          </Animated.Text>
        </View>

        <Animated.View style={[ctaStyle, { paddingBottom: 16 }]}>
          <Button
            title="开始探索"
            variant="primary"
            size="lg"
            fullWidth
            onPress={() => router.replace('/(tabs)')}
          />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
