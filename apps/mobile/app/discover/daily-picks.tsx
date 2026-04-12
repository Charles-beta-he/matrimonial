import { FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import type { ProfileCardUser } from '@matrimonial/ui';
import { ProfileCard } from '@matrimonial/ui';

const MOCK_PICKS: (ProfileCardUser & { id: string })[] = [
  {
    id: 'dp1',
    nickname: '小雪',
    age: 26,
    city: '北京',
    photos: ['https://picsum.photos/seed/dp1/400/600'],
    verificationLevel: 'L3',
    tags: ['读书', '旅行', '咖啡控'],
    prompts: [{ question: '周末最常做的事？', answer: '逛书店然后找家咖啡店坐一下午' }],
    distance: '3.2km',
    isOnline: true,
  },
  {
    id: 'dp2',
    nickname: '子墨',
    age: 28,
    city: '北京',
    photos: ['https://picsum.photos/seed/dp2/400/600'],
    verificationLevel: 'L2',
    tags: ['运动', '摄影', '健身达人'],
    prompts: [{ question: '如果有一个超能力？', answer: '瞬间移动' }],
    distance: '5.1km',
    isOnline: false,
  },
  {
    id: 'dp3',
    nickname: '安安',
    age: 25,
    city: '上海',
    photos: ['https://picsum.photos/seed/dp3/400/600'],
    verificationLevel: 'L3',
    tags: ['美食', '音乐', '浪漫主义'],
    prompts: [{ question: '最想去的地方？', answer: '冰岛，想看极光' }],
    distance: '1.8km',
    isOnline: true,
  },
  {
    id: 'dp4',
    nickname: '思远',
    age: 30,
    city: '深圳',
    photos: ['https://picsum.photos/seed/dp4/400/600'],
    verificationLevel: 'L4',
    tags: ['电影', '游戏', '幽默搞笑'],
    prompts: [{ question: '可以反复看的一部电影？', answer: '《怦然心动》' }],
    distance: '8km',
    isOnline: true,
  },
  {
    id: 'dp5',
    nickname: '悦然',
    age: 27,
    city: '杭州',
    photos: ['https://picsum.photos/seed/dp5/400/600'],
    verificationLevel: 'L2',
    tags: ['旅行', '手工', '独立自主'],
    prompts: [{ question: '你的爱情语言是？', answer: '精心时刻和肯定的言语' }],
    distance: '4.5km',
    isOnline: false,
  },
];

/** Daily picks screen */
export default function DailyPicksScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={() => router.back()} className="mr-3">
          <Text className="text-lg">&lt;</Text>
        </Pressable>
        <Text className="text-xl font-bold text-gray-900">今日精选</Text>
      </View>

      <FlatList
        data={MOCK_PICKS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 16, paddingBottom: 24 }}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/discover/${item.id}`)}>
            <View style={{ height: 480 }}>
              <ProfileCard user={item} />
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
