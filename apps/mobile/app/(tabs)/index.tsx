import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, Platform, Pressable, ScrollView, Text, View } from 'react-native';

/** Cross-platform shadow style — RN-web 18+ deprecates shadow* in favor of boxShadow */
function shadowStyle(opts: { color?: string; x?: number; y: number; blur: number; opacity: number; elevation?: number }) {
  const color = opts.color ?? '#000';
  if (Platform.OS === 'web') {
    // Convert hex to rgba
    const hex = color.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return { boxShadow: `${opts.x ?? 0}px ${opts.y}px ${opts.blur}px rgba(${r},${g},${b},${opts.opacity})` };
  }
  return {
    shadowColor: color,
    shadowOffset: { width: opts.x ?? 0, height: opts.y },
    shadowOpacity: opts.opacity,
    shadowRadius: opts.blur / 2,
    elevation: opts.elevation ?? 2,
  };
}
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import type { ProfileCardUser } from '@matrimonial/ui';
import { EmptyState } from '@matrimonial/ui';
import { api } from '@matrimonial/api-client';
import { calculateAge, PROMPT_QUESTIONS } from '@matrimonial/shared';
import { SwipeCard } from '../../components/SwipeCard';
import { MatchAnimation } from '../../components/MatchAnimation';
import { useMatchStore } from '../../stores/useMatchStore';
import { useAnalytics } from '../../hooks/useAnalytics';

type ProfileCardUserWithId = ProfileCardUser & { id: string; recommendReason?: string };

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
    recommendReason: u._recommendMeta?.reason,
  };
}

/** Discover / Recommend page */
export default function DiscoverTab() {
  const router = useRouter();
  const { showMatchAnimation, matchedUser, setMatchAnimation } = useMatchStore();
  const { track } = useAnalytics();

  const [localIndex, setLocalIndex] = useState(0);
  const [matchInfo, setMatchInfo] = useState<{ name: string; photo: string } | null>(null);
  const cardShownAtRef = useRef<number>(Date.now());

  const recommendationsQuery = api.match.recommendations.useQuery();
  const dailyPicksQuery = api.match.dailyPicks.useQuery();
  const remainingSwipesQuery = (api.match as any).remainingSwipes?.useQuery?.() as
    | { data?: { used: number; total: number; remaining: number; quotaExhausted: boolean } }
    | undefined;

  const likeMutation = api.match.like.useMutation();
  const skipMutation = api.match.skip.useMutation();

  // Backend returns { users, meta, quotaExhausted } or legacy User[]
  const rawData = recommendationsQuery.data as any;
  const recommendationUsers = Array.isArray(rawData) ? rawData : (rawData?.users ?? []);
  const quotaExhaustedFromApi = Array.isArray(rawData) ? false : (rawData?.quotaExhausted ?? false);

  const recommendations: ProfileCardUserWithId[] = useMemo(
    () => recommendationUsers.map(toProfileCardUser),
    [recommendationUsers],
  );
  const dailyPicks: ProfileCardUserWithId[] = useMemo(
    () => (dailyPicksQuery.data ?? []).map(toProfileCardUser),
    [dailyPicksQuery.data],
  );

  const currentUser = recommendations[localIndex];
  const nextUser = recommendations[localIndex + 1];

  // Screen view tracking
  useEffect(() => {
    track('screen_view', { screen_name: 'discover' });
  }, [track]);

  // Track card_view whenever the current card changes
  useEffect(() => {
    if (!currentUser) return;
    cardShownAtRef.current = Date.now();
    track('card_view', {
      target_user_id: currentUser.id,
      position: localIndex,
    });
  }, [localIndex, currentUser, track]);

  const handleSwipeRight = useCallback(() => {
    const user = recommendations[localIndex];
    if (!user) return;
    track('card_like', { target_user_id: user.id, type: 'normal' });
    likeMutation.mutate(
      { toUserId: user.id, type: 'NORMAL' },
      {
        onSuccess: (res) => {
          if (res?.isMatched) {
            setMatchInfo({ name: user.nickname, photo: user.photos[0] ?? '' });
            setMatchAnimation(true, {
              id: user.id,
              nickname: user.nickname,
              photo: user.photos[0],
            });
            track('match_success', { target_user_id: user.id });
          }
        },
      },
    );
    setLocalIndex((i) => i + 1);
  }, [recommendations, localIndex, likeMutation, setMatchAnimation, track]);

  const handleSuperLike = useCallback(() => {
    const user = recommendations[localIndex];
    if (!user) return;
    track('card_like', { target_user_id: user.id, type: 'super' });
    likeMutation.mutate(
      { toUserId: user.id, type: 'SUPER' },
      {
        onSuccess: (res) => {
          if (res?.isMatched) {
            setMatchInfo({ name: user.nickname, photo: user.photos[0] ?? '' });
            setMatchAnimation(true, {
              id: user.id,
              nickname: user.nickname,
              photo: user.photos[0],
            });
            track('match_success', { target_user_id: user.id });
          }
        },
      },
    );
    setLocalIndex((i) => i + 1);
  }, [recommendations, localIndex, likeMutation, setMatchAnimation, track]);

  const handleSwipeLeft = useCallback(() => {
    const user = recommendations[localIndex];
    if (!user) return;
    track('card_skip', {
      target_user_id: user.id,
      view_duration_ms: Date.now() - cardShownAtRef.current,
    });
    skipMutation.mutate({ toUserId: user.id });
    setLocalIndex((i) => i + 1);
  }, [recommendations, localIndex, skipMutation, track]);

  const handleRefresh = useCallback(() => {
    setLocalIndex(0);
    recommendationsQuery.refetch();
    dailyPicksQuery.refetch();
  }, [recommendationsQuery, dailyPicksQuery]);

  const isLoading = recommendationsQuery.isLoading;
  const hasError = !!recommendationsQuery.error;
  const isEmpty = !isLoading && !hasError && (recommendations.length === 0 || localIndex >= recommendations.length);
  const quotaData = remainingSwipesQuery?.data;
  const quotaExhausted = quotaExhaustedFromApi || (quotaData?.quotaExhausted ?? false);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3">
          <Text className="text-2xl font-bold text-gray-900">发现</Text>
          <Pressable
            className="w-10 h-10 bg-white rounded-full items-center justify-center"
            style={shadowStyle({ y: 1, blur: 3, opacity: 0.06, elevation: 1 })}
            onPress={() => router.push('/profile/settings')}
          >
            <Ionicons name="options-outline" size={20} color="#4b5563" />
          </Pressable>
        </View>

        {/* Swipe quota progress bar */}
        {quotaData && (
          <View className="px-4 mb-2">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-xs text-gray-500">
                今日已看 {quotaData.used}/{quotaData.total} 人
              </Text>
              <Text className="text-xs text-gray-400">
                剩余 {quotaData.remaining} 次
              </Text>
            </View>
            <View className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <View
                className="h-full bg-rose-500 rounded-full"
                style={{
                  width: `${Math.min((quotaData.used / quotaData.total) * 100, 100)}%`,
                }}
              />
            </View>
          </View>
        )}

        {/* Daily picks horizontal scroll */}
        <View className="mb-4">
          <Pressable
            className="flex-row items-center justify-between px-4 mb-2"
            onPress={() => router.push('/discover/daily-picks')}
          >
            <Text className="text-base font-semibold text-gray-900">今日精选</Text>
            <View className="flex-row items-center" style={{ gap: 2 }}>
              <Text className="text-sm text-rose-500">查看全部</Text>
              <Ionicons name="chevron-forward" size={14} color="#f43f5e" />
            </View>
          </Pressable>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
          >
            {dailyPicksQuery.isLoading ? (
              <Text className="text-xs text-gray-400 px-2 py-6">加载中…</Text>
            ) : dailyPicks.length === 0 ? (
              <Text className="text-xs text-gray-400 px-2 py-6">暂无精选</Text>
            ) : (
              dailyPicks.map((user) => (
                <Pressable
                  key={user.id}
                  className="w-20 items-center"
                  onPress={() => router.push(`/discover/${user.id}`)}
                >
                  <View className="w-20 h-24 rounded-2xl overflow-hidden bg-gray-200 relative">
                    {user.photos?.[0] ? (
                      <Image
                        source={{ uri: user.photos[0] }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="w-full h-full items-center justify-center">
                        <Ionicons name="person" size={32} color="#9ca3af" />
                      </View>
                    )}
                    {user.isOnline && (
                      <View className="absolute bottom-1 right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
                    )}
                  </View>
                  <Text className="text-xs text-center text-gray-800 mt-1.5 font-medium" numberOfLines={1}>
                    {user.nickname}
                  </Text>
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>

        {/* Error banner */}
        {hasError && (
          <Pressable
            onPress={() => recommendationsQuery.refetch()}
            className="mx-4 mb-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3"
          >
            <Text className="text-red-600 text-sm text-center">加载失败，点击重试</Text>
          </Pressable>
        )}

        {/* Main card area — hardcoded dimensions because flex-1 + absolute
            inset-0 doesn't cascade reliably through SwipeCard on RN Web */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingBottom: 8,
            alignItems: 'center',
            flex: 1,
          }}
        >
          <View
            style={{
              position: 'relative',
              width: 340,
              height: 480,
            }}
          >
            {isLoading ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color="#f43f5e" />
                <Text className="text-gray-500 mt-3">正在加载推荐...</Text>
              </View>
            ) : quotaExhausted ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
                <Ionicons name="moon-outline" size={48} color="#f43f5e" />
                <Text className="text-xl font-bold text-gray-900 mt-4 text-center">今日推荐已用完</Text>
                <Text className="text-sm text-gray-500 mt-2 text-center">
                  明天将为你推荐更多优质用户
                </Text>
                <Pressable
                  className="mt-6 w-full h-12 bg-rose-500 rounded-full items-center justify-center"
                  onPress={() => router.push('/profile/membership')}
                >
                  <Text className="text-white font-semibold text-base">升级会员解锁无限推荐</Text>
                </Pressable>
                <Pressable
                  className="mt-3 w-full h-12 bg-gray-100 rounded-full items-center justify-center"
                  onPress={() => router.push('/(tabs)/explore' as any)}
                >
                  <Text className="text-gray-700 font-medium text-base">去探索更多</Text>
                </Pressable>
              </View>
            ) : isEmpty ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <EmptyState
                  title="暂无新推荐"
                  description="稍后再来看看"
                  action={{ label: '刷新', onPress: handleRefresh }}
                />
              </View>
            ) : (
              <>
                {nextUser && <SwipeCard user={nextUser} isNext />}
                {currentUser && (
                  <SwipeCard
                    key={currentUser.id}
                    user={currentUser}
                    onSwipeLeft={handleSwipeLeft}
                    onSwipeRight={handleSwipeRight}
                    recommendReason={currentUser.recommendReason}
                  />
                )}
              </>
            )}
          </View>
        </View>

        {/* Bottom action bar */}
        {!isLoading && !isEmpty && (
          <View
            className="flex-row items-center justify-center pb-6 pt-3"
            style={{ gap: 20 }}
          >
            <Pressable
              onPress={handleSwipeLeft}
              style={({ pressed }) => ({
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: '#ffffff',
                alignItems: 'center',
                justifyContent: 'center',
                ...shadowStyle({ y: 4, blur: 8, opacity: 0.1, elevation: 3 }),
                opacity: pressed ? 0.85 : 1,
                transform: [{ scale: pressed ? 0.96 : 1 }],
              })}
            >
              <Ionicons name="close" size={28} color="#ef4444" />
            </Pressable>

            <Pressable
              onPress={handleSwipeRight}
              style={({ pressed }) => ({
                width: 68,
                height: 68,
                borderRadius: 34,
                backgroundColor: '#f43f5e',
                alignItems: 'center',
                justifyContent: 'center',
                ...shadowStyle({ color: '#f43f5e', y: 6, blur: 12, opacity: 0.35, elevation: 6 }),
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.96 : 1 }],
              })}
            >
              <Ionicons name="heart" size={32} color="#ffffff" />
            </Pressable>

            <Pressable
              onPress={handleSuperLike}
              style={({ pressed }) => ({
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: '#fef3c7',
                alignItems: 'center',
                justifyContent: 'center',
                ...shadowStyle({ color: '#f59e0b', y: 4, blur: 8, opacity: 0.15, elevation: 3 }),
                opacity: pressed ? 0.85 : 1,
                transform: [{ scale: pressed ? 0.96 : 1 }],
              })}
            >
              <Ionicons name="star" size={26} color="#f59e0b" />
            </Pressable>
          </View>
        )}

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
