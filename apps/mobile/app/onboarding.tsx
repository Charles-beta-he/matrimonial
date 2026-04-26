import { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { ScalePressable } from '../components/ScalePressable';
import { colors } from '../constants/colors';
import { useScreenTracking } from '../hooks/useAnalytics';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

async function setOnboardingFlag(value: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem('hasSeenOnboarding', value);
    return;
  }
  await SecureStore.setItemAsync('hasSeenOnboarding', value);
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OnboardingPage {
  icon: IoniconName;
  iconColor: string;
  title: string;
  description: string;
}

const PAGES: OnboardingPage[] = [
  {
    icon: 'heart',
    iconColor: colors.primary,
    title: '遇见对的人',
    description:
      '基于AI智能匹配算法，从性格、兴趣、价值观等多维度分析，为您精准推荐最合适的另一半。不再盲目寻找，让缘分有迹可循。',
  },
  {
    icon: 'shield-checkmark',
    iconColor: colors.blue,
    title: '真实可信',
    description:
      '四级认证体系层层把关——手机验证、实名认证、学历认证、人脸识别，确保每位用户身份真实可靠。告别虚假信息，安心交友。',
  },
  {
    icon: 'lock-closed',
    iconColor: colors.green,
    title: '安全放心',
    description:
      '约会报备功能让亲友随时掌握您的动态，一键SOS紧急求助保障人身安全。平台24小时风控监测，为每一次相遇保驾护航。',
  },
];

const EASING = Easing.out(Easing.cubic);
const DURATION = 500;

function useEntranceAnimations() {
  const heroOpacity = useSharedValue(0);
  const heroTranslateY = useSharedValue(40);
  const pageOffset = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(40);
  const descOpacity = useSharedValue(0);
  const descTranslateY = useSharedValue(40);
  const btnOpacity = useSharedValue(0);
  const btnTranslateY = useSharedValue(40);

  function runEntrance() {
    // Reset
    heroOpacity.value = 0;
    heroTranslateY.value = 40;
    titleOpacity.value = 0;
    titleTranslateY.value = 40;
    descOpacity.value = 0;
    descTranslateY.value = 40;
    btnOpacity.value = 0;
    btnTranslateY.value = 40;

    const timingConfig = { duration: DURATION, easing: EASING };

    heroOpacity.value = withTiming(1, timingConfig);
    heroTranslateY.value = withTiming(0, timingConfig);

    titleOpacity.value = withDelay(100, withTiming(1, timingConfig));
    titleTranslateY.value = withDelay(100, withTiming(0, timingConfig));

    descOpacity.value = withDelay(200, withTiming(1, timingConfig));
    descTranslateY.value = withDelay(200, withTiming(0, timingConfig));

    btnOpacity.value = withDelay(300, withTiming(1, timingConfig));
    btnTranslateY.value = withDelay(300, withTiming(0, timingConfig));
  }

  const heroStyle = useAnimatedStyle(() => ({
    opacity: heroOpacity.value,
    transform: [{ translateY: heroTranslateY.value + pageOffset.value * 0.5 }],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const descStyle = useAnimatedStyle(() => ({
    opacity: descOpacity.value,
    transform: [{ translateY: descTranslateY.value }],
  }));

  const btnStyle = useAnimatedStyle(() => ({
    opacity: btnOpacity.value,
    transform: [{ translateY: btnTranslateY.value }],
  }));

  return { runEntrance, pageOffset, heroStyle, titleStyle, descStyle, btnStyle };
}

export default function OnboardingScreen() {
  useScreenTracking('onboarding');
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const { runEntrance, pageOffset, heroStyle, titleStyle, descStyle, btnStyle } = useEntranceAnimations();

  // Run entrance on mount and on each page change
  useEffect(() => {
    runEntrance();
    pageOffset.value = withSequence(withTiming(30, { duration: 0 }), withSpring(0, { damping: 14, stiffness: 120 }));
  }, [currentPage]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentPage(page);
  };

  const handleNext = () => {
    if (currentPage < PAGES.length - 1) {
      const next = currentPage + 1;
      scrollRef.current?.scrollTo({ x: SCREEN_WIDTH * next, animated: true });
      setCurrentPage(next);
    } else {
      completeOnboarding();
    }
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  const completeOnboarding = async () => {
    await setOnboardingFlag('true');
    router.replace('/(auth)/login');
  };

  const page = PAGES[currentPage];

  const eyebrows = ['初识 · 01', '认证 · 02', '同行 · 03'];
  const currentEyebrow = eyebrows[currentPage] ?? '';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fdfcfa' }}>
      {/* Top bar: brand mark + skip */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 24,
          paddingTop: 8,
          paddingBottom: 4,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: '#fff1f2',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="heart" size={14} color={colors.primary} />
          </View>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#0b0b0f', letterSpacing: -0.2 }}>
            缘分
          </Text>
        </View>
        <ScalePressable
          onPress={handleSkip}
          containerStyle={{
            paddingHorizontal: 14,
            paddingVertical: 7,
            borderRadius: 999,
            backgroundColor: '#ffffff',
            borderWidth: 1,
            borderColor: '#eef0f3',
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#6b7280' }}>跳过</Text>
        </ScalePressable>
      </View>

      {/* Swipeable pages */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        onScrollEndDrag={handleScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
        contentContainerStyle={{ alignItems: 'stretch' }}
      >
        {PAGES.map((p, idx) => (
          <View
            key={p.title}
            style={{
              width: SCREEN_WIDTH,
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 40,
            }}
          >
            <Animated.View
              style={[
                heroStyle,
                {
                  width: 200,
                  height: 200,
                  borderRadius: 100,
                  backgroundColor: p.iconColor + '14',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 44,
                  borderWidth: 1,
                  borderColor: p.iconColor + '22',
                },
              ]}
            >
              <View
                style={{
                  width: 132,
                  height: 132,
                  borderRadius: 66,
                  backgroundColor: '#ffffff',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: p.iconColor,
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.18,
                  shadowRadius: 20,
                }}
              >
                <Ionicons name={p.icon} size={64} color={p.iconColor} />
              </View>
            </Animated.View>

            <Animated.Text
              style={[
                titleStyle,
                {
                  fontSize: 12,
                  fontWeight: '600',
                  color: p.iconColor,
                  letterSpacing: 1.6,
                  marginBottom: 14,
                  textAlign: 'center',
                },
              ]}
            >
              {eyebrows[idx]}
            </Animated.Text>
            <Animated.Text
              style={[
                titleStyle,
                {
                  fontSize: 28,
                  fontWeight: '700',
                  color: '#0b0b0f',
                  letterSpacing: -0.4,
                  lineHeight: 34,
                  marginBottom: 14,
                  textAlign: 'center',
                },
              ]}
              accessibilityRole="header"
              aria-level={1}
            >
              {p.title}
            </Animated.Text>
            <Animated.Text
              style={[
                descStyle,
                { fontSize: 15, color: '#6b7280', lineHeight: 24, textAlign: 'center' },
              ]}
            >
              {p.description}
            </Animated.Text>
          </View>
        ))}
      </ScrollView>

      {/* Footer */}
      <View style={{ paddingHorizontal: 24, paddingBottom: 24 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
          {PAGES.map((_, index) => (
            <View
              key={index}
              style={{
                height: 6,
                width: index === currentPage ? 28 : 6,
                borderRadius: 3,
                backgroundColor: index === currentPage ? '#e11d48' : '#e5e2da',
              }}
            />
          ))}
        </View>

        <Animated.View style={btnStyle}>
          <ScalePressable
            containerStyle={{
              backgroundColor: '#e11d48',
              borderRadius: 999,
              height: 56,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={handleNext}
          >
            <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 15, letterSpacing: 0.4 }}>
              {currentPage === PAGES.length - 1 ? '开始使用' : '继续'}
            </Text>
          </ScalePressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
