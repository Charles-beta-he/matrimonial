import { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import type { ProfileCardUser } from '@matrimonial/ui';
import { Card } from '@matrimonial/ui';
import { SwipeCard } from '../../components/SwipeCard';
import { MatchAnimation } from '../../components/MatchAnimation';
import { useMatchStore } from '../../stores/useMatchStore';
import { useAnalytics } from '../../hooks/useAnalytics';

const SCREEN_WIDTH = Dimensions.get('window').width;

// Mock users for demo
const MOCK_USERS: ProfileCardUser[] = [
  {
    nickname: '小雪',
    age: 26,
    city: '北京',
    photos: ['https://picsum.photos/seed/u1/400/600'],
    verificationLevel: 'L3',
    tags: ['读书', '旅行', '咖啡控'],
    prompts: [{ question: '周末最常做的事？', answer: '逛书店然后找家咖啡店坐一下午' }],
    distance: '3.2km',
    isOnline: true,
  },
  {
    nickname: '子墨',
    age: 28,
    city: '北京',
    photos: ['https://picsum.photos/seed/u2/400/600'],
    verificationLevel: 'L2',
    tags: ['运动', '摄影', '健身达人'],
    prompts: [{ question: '如果有一个超能力？', answer: '瞬间移动，可以随时去世界各地' }],
    distance: '5.1km',
    isOnline: false,
  },
  {
    nickname: '安安',
    age: 25,
    city: '北京',
    photos: ['https://picsum.photos/seed/u3/400/600'],
    verificationLevel: 'L3',
    tags: ['美食', '音乐', '浪漫主义'],
    prompts: [{ question: '最想去的地方？', answer: '冰岛，想看极光' }],
    distance: '1.8km',
    isOnline: true,
  },
  {
    nickname: '思远',
    age: 30,
    city: '北京',
    photos: ['https://picsum.photos/seed/u4/400/600'],
    verificationLevel: 'L4',
    tags: ['电影', '游戏', '幽默搞笑'],
    prompts: [{ question: '可以反复看的一部电影？', answer: '《怦然心动》' }],
    distance: '8km',
    isOnline: true,
  },
  {
    nickname: '悦然',
    age: 27,
    city: '北京',
    photos: ['https://picsum.photos/seed/u5/400/600'],
    verificationLevel: 'L2',
    tags: ['旅行', '手工', '独立自主'],
    prompts: [{ question: '你的爱情语言是？', answer: '精心时刻和肯定的言语' }],
    distance: '4.5km',
    isOnline: false,
  },
];

const DAILY_PICKS = MOCK_USERS.slice(0, 5);

const mockUserId = (u: ProfileCardUser) => `mock_${u.nickname}`;

/** Discover / Recommend page */
export default function DiscoverTab() {
  const router = useRouter();
  const { currentIndex, nextCard, showMatchAnimation, matchedUser, setMatchAnimation } =
    useMatchStore();
  const { track } = useAnalytics();

  const [matchInfo, setMatchInfo] = useState<{ name: string; photo: string } | null>(null);
  const cardShownAtRef = useRef<number>(Date.now());

  const currentUser = MOCK_USERS[currentIndex % MOCK_USERS.length];
  const nextUser = MOCK_USERS[(currentIndex + 1) % MOCK_USERS.length];

  // Screen view tracking
  useEffect(() => {
    track('screen_view', { screen_name: 'discover' });
  }, [track]);

  // Track card_view whenever the current card changes
  useEffect(() => {
    cardShownAtRef.current = Date.now();
    track('card_view', {
      target_user_id: mockUserId(currentUser),
      position: currentIndex,
    });
  }, [currentIndex, currentUser, track]);

  const handleSwipeRight = useCallback(() => {
    const user = MOCK_USERS[currentIndex % MOCK_USERS.length];
    const targetId = mockUserId(user);
    track('card_like', { target_user_id: targetId, type: 'normal' });
    // Simulate a ~30% match rate for demo
    if (Math.random() < 0.3) {
      setMatchInfo({ name: user.nickname, photo: user.photos[0] ?? '' });
      setMatchAnimation(true, { id: targetId, nickname: user.nickname, photo: user.photos[0] });
      track('match_success', { target_user_id: targetId });
    }
    nextCard();
  }, [currentIndex, nextCard, setMatchAnimation, track]);

  const handleSwipeLeft = useCallback(() => {
    const user = MOCK_USERS[currentIndex % MOCK_USERS.length];
    track('card_skip', {
      target_user_id: mockUserId(user),
      view_duration_ms: Date.now() - cardShownAtRef.current,
    });
    nextCard();
  }, [currentIndex, nextCard, track]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3">
          <Text className="text-2xl font-bold text-gray-900">发现</Text>
          <Pressable className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm">
            <Text className="text-lg">⚙️</Text>
          </Pressable>
        </View>

        {/* Daily picks horizontal scroll */}
        <View className="mb-4">
          <Pressable
            className="flex-row items-center justify-between px-4 mb-2"
            onPress={() => router.push('/discover/daily-picks')}
          >
            <Text className="text-base font-semibold text-gray-900">今日精选</Text>
            <Text className="text-sm text-rose-500">查看全部 &gt;</Text>
          </Pressable>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
          >
            {DAILY_PICKS.map((user, i) => (
              <Card
                key={i}
                className="w-20"
                onPress={() => router.push(`/discover/${user.nickname}`)}
              >
                <View className="w-20 h-24 bg-gray-200 rounded-xl items-center justify-center">
                  <Text className="text-2xl">👤</Text>
                </View>
                <Text className="text-xs text-center text-gray-700 mt-1 pb-1">
                  {user.nickname}
                </Text>
              </Card>
            ))}
          </ScrollView>
        </View>

        {/* Main card area */}
        <View className="flex-1 px-4 pb-2">
          <View className="flex-1 relative">
            {/* Next card (behind) */}
            <SwipeCard user={nextUser} isNext />
            {/* Current card */}
            <SwipeCard
              user={currentUser}
              onSwipeLeft={handleSwipeLeft}
              onSwipeRight={handleSwipeRight}
            />
          </View>
        </View>

        {/* Bottom action bar */}
        <View className="flex-row items-center justify-center pb-4 pt-2" style={{ gap: 24 }}>
          <Pressable
            className="w-14 h-14 rounded-full bg-white shadow-md items-center justify-center border border-gray-200"
            onPress={handleSwipeLeft}
          >
            <Text className="text-2xl">👈</Text>
          </Pressable>
          <Pressable
            className="w-16 h-16 rounded-full bg-rose-500 shadow-lg items-center justify-center"
            onPress={handleSwipeRight}
          >
            <Text className="text-3xl">❤️</Text>
          </Pressable>
          <Pressable
            className="w-14 h-14 rounded-full bg-white shadow-md items-center justify-center border border-gray-200"
            onPress={() => {
              // Super like
              handleSwipeRight();
            }}
          >
            <Text className="text-2xl">⭐</Text>
          </Pressable>
        </View>

        {/* Match animation overlay */}
        {showMatchAnimation && matchInfo && (
          <MatchAnimation
            myPhoto="https://picsum.photos/seed/me/200/200"
            theirPhoto={matchInfo.photo}
            theirName={matchInfo.name}
            matchedUserId={matchedUser?.id}
            onSendMessage={() => {
              setMatchAnimation(false);
              setMatchInfo(null);
            }}
            onContinue={() => {
              setMatchAnimation(false);
              setMatchInfo(null);
            }}
          />
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
