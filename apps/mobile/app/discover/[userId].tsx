import { useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Badge, Button, PromptCard } from '@matrimonial/ui';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Mock user detail
const MOCK_USER = {
  id: 'u1',
  nickname: '小雪',
  age: 26,
  city: '北京',
  gender: 'FEMALE' as const,
  birthday: '1998-03-15',
  bio: '喜欢读书和旅行的文艺女青年，希望遇到一个有趣的灵魂。',
  height: 165,
  education: '本科',
  occupation: '产品经理',
  incomeRange: '20-50K',
  hometown: '杭州',
  zodiac: '双鱼座',
  mbti: 'INFJ',
  verificationLevel: 'L3' as const,
  photos: [
    'https://picsum.photos/seed/detail1/400/600',
    'https://picsum.photos/seed/detail2/400/600',
    'https://picsum.photos/seed/detail3/400/600',
  ],
  tags: ['读书', '旅行', '咖啡控', '浪漫主义', '独立自主'],
  prompts: [
    { question: '周末最常做的事？', answer: '逛书店然后找家咖啡店坐一下午' },
    { question: '最想去的地方？', answer: '冰岛，想看极光和泡温泉' },
    { question: '你的爱情语言是？', answer: '精心时刻 — 一起做喜欢的事最幸福' },
  ],
  isOnline: true,
  distance: '3.2km',
};

const INFO_GRID = [
  { label: '身高', value: `${MOCK_USER.height}cm` },
  { label: '学历', value: MOCK_USER.education },
  { label: '职业', value: MOCK_USER.occupation },
  { label: '收入', value: MOCK_USER.incomeRange },
  { label: '家乡', value: MOCK_USER.hometown },
  { label: '星座', value: MOCK_USER.zodiac },
  { label: 'MBTI', value: MOCK_USER.mbti },
];

/** User profile detail screen */
export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const [photoIndex, setPhotoIndex] = useState(0);

  const handlePhotoScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setPhotoIndex(idx);
  };

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Photo carousel */}
        <View style={{ height: SCREEN_WIDTH * 1.2 }}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handlePhotoScroll}
          >
            {MOCK_USER.photos.map((photo, i) => (
              <View
                key={i}
                style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH * 1.2 }}
                className="bg-gray-200 items-center justify-center"
              >
                <Text className="text-6xl">👤</Text>
                <Text className="text-gray-400 text-sm mt-2">照片 {i + 1}</Text>
              </View>
            ))}
          </ScrollView>

          {/* Dot indicators */}
          <View className="absolute bottom-4 flex-row self-center" style={{ gap: 6 }}>
            {MOCK_USER.photos.map((_, i) => (
              <View
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i === photoIndex ? 'bg-white' : 'bg-white/50'
                }`}
              />
            ))}
          </View>

          {/* Back button */}
          <SafeAreaView className="absolute top-0 left-0 right-0">
            <View className="flex-row justify-between px-4 pt-2">
              <Pressable
                className="w-10 h-10 bg-black/30 rounded-full items-center justify-center"
                onPress={() => router.back()}
              >
                <Text className="text-white text-lg">&lt;</Text>
              </Pressable>
              <Pressable
                className="w-10 h-10 bg-black/30 rounded-full items-center justify-center"
                onPress={() => Alert.alert('举报', '确定要举报该用户吗？')}
              >
                <Text className="text-white text-sm">...</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </View>

        {/* User info */}
        <View className="px-4 pt-4">
          {/* Name & basic */}
          <View className="flex-row items-center mb-1">
            <Text className="text-2xl font-bold text-gray-900 mr-2">
              {MOCK_USER.nickname}, {MOCK_USER.age}
            </Text>
            {MOCK_USER.isOnline && (
              <View className="flex-row items-center">
                <View className="w-2 h-2 bg-green-500 rounded-full mr-1" />
                <Text className="text-xs text-green-600">在线</Text>
              </View>
            )}
          </View>
          <View className="flex-row items-center mb-3" style={{ gap: 8 }}>
            <Text className="text-sm text-gray-500">
              {MOCK_USER.city} · {MOCK_USER.distance}
            </Text>
            <Badge
              label={MOCK_USER.verificationLevel}
              variant="verification"
              level={MOCK_USER.verificationLevel}
            />
          </View>

          {/* Tags */}
          <View className="flex-row flex-wrap mb-4" style={{ gap: 8 }}>
            {MOCK_USER.tags.map((tag) => (
              <Badge key={tag} label={tag} variant="tag" />
            ))}
          </View>

          {/* About */}
          <Text className="text-base font-semibold text-gray-900 mb-2">关于TA</Text>
          {MOCK_USER.prompts.map((prompt, i) => (
            <View key={i} className="mb-3">
              <PromptCard question={prompt.question} answer={prompt.answer} />
            </View>
          ))}

          {/* Info grid */}
          <Text className="text-base font-semibold text-gray-900 mb-3 mt-2">基本信息</Text>
          <View className="flex-row flex-wrap mb-6" style={{ gap: 8 }}>
            {INFO_GRID.map((item) => (
              <View
                key={item.label}
                className="bg-gray-50 rounded-xl px-4 py-3"
                style={{ width: '47%' }}
              >
                <Text className="text-xs text-gray-400 mb-0.5">{item.label}</Text>
                <Text className="text-sm text-gray-900 font-medium">{item.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Spacer for bottom bar */}
        <View className="h-24" />
      </ScrollView>

      {/* Bottom fixed action bar */}
      <SafeAreaView edges={['bottom']} className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100">
        <View className="flex-row items-center justify-center py-3 px-6" style={{ gap: 16 }}>
          <Pressable className="w-12 h-12 rounded-full bg-gray-100 items-center justify-center">
            <Text className="text-xl">👈</Text>
          </Pressable>
          <Pressable className="flex-1 h-12 rounded-full bg-rose-500 items-center justify-center">
            <Text className="text-white font-semibold text-base">❤️ 喜欢</Text>
          </Pressable>
          <Pressable className="w-12 h-12 rounded-full bg-amber-50 items-center justify-center">
            <Text className="text-xl">⭐</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
