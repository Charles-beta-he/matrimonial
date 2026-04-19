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

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Skip button */}
      <View className="flex-row justify-end px-6 pt-2">
        <ScalePressable onPress={handleSkip}>
          <Text className="text-sm text-gray-600">跳过</Text>
        </ScalePressable>
      </View>

      {/* Swipeable pages — native scroll handles left/right transition */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        onScrollEndDrag={handleScroll}
        scrollEventThrottle={16}
      >
        {PAGES.map((p) => (
          <View
            key={p.title}
            style={{ width: SCREEN_WIDTH }}
            className="flex-1 items-center justify-center px-10"
          >
            {/* Illustration placeholder */}
            <Animated.View
              style={[heroStyle, { backgroundColor: p.iconColor + '15' }]}
              className="w-48 h-48 rounded-full items-center justify-center mb-10"
            >
              <Ionicons name={p.icon} size={88} color={p.iconColor} />
            </Animated.View>

            <Animated.Text
              style={titleStyle}
              className="text-2xl font-bold text-gray-900 mb-4 text-center"
              accessibilityRole="header"
              aria-level={1}
            >
              {p.title}
            </Animated.Text>
            <Animated.Text
              style={descStyle}
              className="text-sm text-gray-500 leading-6 text-center"
            >
              {p.description}
            </Animated.Text>
          </View>
        ))}
      </ScrollView>

      {/* Bottom: dot indicators + button */}
      <View className="px-6 pb-6">
        {/* Dot indicators */}
        <View className="flex-row justify-center mb-8" style={{ gap: 8 }}>
          {PAGES.map((_, index) => (
            <View
              key={index}
              className={`h-2 rounded-full ${
                index === currentPage ? 'w-6 bg-rose-500' : 'w-2 bg-gray-200'
              }`}
            />
          ))}
        </View>

        {/* Action button */}
        <Animated.View style={btnStyle}>
          <ScalePressable
            className="bg-rose-700 rounded-full py-4 items-center"
            onPress={handleNext}
          >
            <Text className="text-white font-bold text-base">
              {currentPage === PAGES.length - 1 ? '开始使用' : '下一步'}
            </Text>
          </ScalePressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
