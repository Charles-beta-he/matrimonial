import { useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

async function setOnboardingFlag(value: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem('hasSeenOnboarding', value);
    return;
  }
  await SecureStore.setItemAsync('hasSeenOnboarding', value);
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ONBOARDING_KEY = 'hasSeenOnboarding';

interface OnboardingPage {
  icon: IoniconName;
  iconColor: string;
  title: string;
  description: string;
}

const PAGES: OnboardingPage[] = [
  {
    icon: 'heart',
    iconColor: '#f43f5e',
    title: '遇见对的人',
    description:
      '基于AI智能匹配算法，从性格、兴趣、价值观等多维度分析，为您精准推荐最合适的另一半。不再盲目寻找，让缘分有迹可循。',
  },
  {
    icon: 'shield-checkmark',
    iconColor: '#3b82f6',
    title: '真实可信',
    description:
      '四级认证体系层层把关——手机验证、实名认证、学历认证、人脸识别，确保每位用户身份真实可靠。告别虚假信息，安心交友。',
  },
  {
    icon: 'lock-closed',
    iconColor: '#10b981',
    title: '安全放心',
    description:
      '约会报备功能让亲友随时掌握您的动态，一键SOS紧急求助保障人身安全。平台24小时风控监测，为每一次相遇保驾护航。',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentPage(page);
  };

  const handleNext = () => {
    if (currentPage < PAGES.length - 1) {
      scrollRef.current?.scrollTo({ x: SCREEN_WIDTH * (currentPage + 1), animated: true });
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

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Skip button */}
      <View className="flex-row justify-end px-6 pt-2">
        <Pressable onPress={handleSkip}>
          <Text className="text-sm text-gray-400">跳过</Text>
        </Pressable>
      </View>

      {/* Swipeable pages */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
      >
        {PAGES.map((page) => (
          <View
            key={page.title}
            style={{ width: SCREEN_WIDTH }}
            className="flex-1 items-center justify-center px-10"
          >
            {/* Illustration placeholder */}
            <View
              className="w-48 h-48 rounded-full items-center justify-center mb-10"
              style={{ backgroundColor: page.iconColor + '15' }}
            >
              <Ionicons name={page.icon} size={88} color={page.iconColor} />
            </View>

            <Text className="text-2xl font-bold text-gray-900 mb-4 text-center">
              {page.title}
            </Text>
            <Text className="text-sm text-gray-500 leading-6 text-center">
              {page.description}
            </Text>
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
        <Pressable
          className="bg-rose-500 rounded-full py-4 items-center"
          onPress={handleNext}
        >
          <Text className="text-white font-bold text-base">
            {currentPage === PAGES.length - 1 ? '开始使用' : '下一步'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
