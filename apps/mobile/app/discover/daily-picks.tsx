import { useEffect } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { ProfileCardUser } from '@matrimonial/ui';
import { EmptyState, ProfileCard } from '@matrimonial/ui';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@matrimonial/api-client';
import { calculateAge, PROMPT_QUESTIONS } from '@matrimonial/shared';

type ProfileCardUserWithId = ProfileCardUser & { id: string };

function StaggeredCard({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(28);
  useEffect(() => {
    const delay = index * 80;
    const e = Easing.out(Easing.cubic);
    opacity.value = withDelay(delay, withTiming(1, { duration: 320, easing: e }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 320, easing: e }));
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

function toProfileCardUser(u: any): ProfileCardUserWithId {
  const age = u?.birthday ? calculateAge(new Date(u.birthday)) : 25;
  const photos =
    Array.isArray(u?.photos) && u.photos.length > 0
      ? u.photos.map((p: any) => p.url)
      : [`https://picsum.photos/seed/${u?.id ?? 'x'}/400/600`];
  const tags = Array.isArray(u?.tags) ? u.tags.map((t: any) => t.tag) : [];
  const prompts = Array.isArray(u?.prompts)
    ? u.prompts
        .map((p: any) => ({
          question:
            PROMPT_QUESTIONS.find((q) => q.id === p.questionId)?.text ??
            p.questionId ??
            '关于我',
          answer: p.answerText ?? '',
        }))
        .filter((p: any) => p.answer)
    : [];
  return {
    id: u.id,
    nickname: u.nickname,
    age,
    city: u.city ?? '',
    photos,
    verificationLevel: u.verificationLevel ?? 'L1',
    tags,
    prompts,
    isOnline: u.isOnline ?? false,
  };
}

/** Daily picks screen */
export default function DailyPicksScreen() {
  const router = useRouter();
  const { data, isLoading, error, refetch } = api.match.dailyPicks.useQuery();

  const picks: ProfileCardUserWithId[] = (data ?? []).map(toProfileCardUser);

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={() => router.back()} className="mr-3">
          <Ionicons name="chevron-back" size={24} color="#374151" />
        </Pressable>
        <Text className="text-xl font-bold text-gray-900">今日精选</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#f43f5e" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center">
          <EmptyState
            title="加载失败"
            description="无法获取今日精选"
            action={{ label: '重试', onPress: () => refetch() }}
          />
        </View>
      ) : picks.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <EmptyState title="暂无精选" description="稍后再来看看" />
        </View>
      ) : (
        <FlatList
          data={picks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 16, paddingBottom: 24 }}
          renderItem={({ item, index }) => (
            <StaggeredCard index={index}>
              <Pressable onPress={() => router.push(`/discover/${item.id}`)}>
                <View style={{ height: 480 }}>
                  <ProfileCard user={item} />
                </View>
              </Pressable>
            </StaggeredCard>
          )}
        />
      )}
    </SafeAreaView>
  );
}
