import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Image, Platform, Pressable, ScrollView, Text, View } from 'react-native';

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
import { HeartBurst } from '../../components/HeartBurst';
import { SwipeCard } from '../../components/SwipeCard';
import { CardStack } from '../../components/CardStack';
import { MatchAnimation } from '../../components/MatchAnimation';
import { SkeletonCard } from '../../components/SkeletonLoader';
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

// ── Filter option constants ──
const EDUCATION_OPTIONS = [
  { label: '高中', value: 'HIGH_SCHOOL' },
  { label: '大专', value: 'ASSOCIATE' },
  { label: '本科', value: 'BACHELOR' },
  { label: '硕士', value: 'MASTER' },
  { label: '博士', value: 'PHD' },
] as const;

const INCOME_OPTIONS = [
  { label: '5千以下', value: 'BELOW_5K' },
  { label: '5千-1万', value: 'K5_10' },
  { label: '1万-2万', value: 'K10_20' },
  { label: '2万-5万', value: 'K20_50' },
  { label: '5万以上', value: 'ABOVE_50K' },
] as const;

const ZODIAC_OPTIONS = [
  '白羊座', '金牛座', '双子座', '巨蟹座', '狮子座', '处女座',
  '天秤座', '天蝎座', '射手座', '摩羯座', '水瓶座', '双鱼座',
] as const;

const MBTI_OPTIONS = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP',
] as const;

const VERIFICATION_OPTIONS = [
  { label: 'L1 基础', value: 'L1' },
  { label: 'L2 实名', value: 'L2' },
  { label: 'L3 学历', value: 'L3' },
  { label: 'L4 全认证', value: 'L4' },
] as const;

type EducationLevel = 'HIGH_SCHOOL' | 'ASSOCIATE' | 'BACHELOR' | 'MASTER' | 'PHD';
type IncomeRange = 'BELOW_5K' | 'K5_10' | 'K10_20' | 'K20_50' | 'ABOVE_50K';
type VerificationLevel = 'L1' | 'L2' | 'L3' | 'L4';

type Filters = {
  heightMin?: number;
  heightMax?: number;
  educationMin?: EducationLevel;
  incomeRange?: IncomeRange[];
  zodiac?: string[];
  mbti?: string[];
  occupation?: string;
  verificationLevel?: VerificationLevel[];
  ageMin?: number;
  ageMax?: number;
  cities?: string[];
};

function isFiltersEmpty(f: Filters): boolean {
  return (
    !f.heightMin &&
    !f.heightMax &&
    !f.educationMin &&
    !f.incomeRange?.length &&
    !f.zodiac?.length &&
    !f.mbti?.length &&
    !f.occupation &&
    !f.verificationLevel?.length &&
    !f.ageMin &&
    !f.ageMax &&
    !f.cities?.length
  );
}

/** Chip selector for multi-select options */
function ChipGroup({
  options,
  selected,
  onToggle,
}: {
  options: readonly (string | { label: string; value: string })[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((opt) => {
        const value = typeof opt === 'string' ? opt : opt.value;
        const label = typeof opt === 'string' ? opt : opt.label;
        const isSelected = selected.includes(value);
        return (
          <Pressable
            key={value}
            onPress={() => onToggle(value)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 16,
              backgroundColor: isSelected ? '#f43f5e' : '#f3f4f6',
              borderWidth: 1,
              borderColor: isSelected ? '#f43f5e' : '#e5e7eb',
            }}
          >
            <Text
              style={{
                fontSize: 13,
                color: isSelected ? '#ffffff' : '#374151',
              }}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Discover / Recommend page */
export default function DiscoverTab() {
  const router = useRouter();
  const { showMatchAnimation, matchedUser, setMatchAnimation } = useMatchStore();
  const { track } = useAnalytics();

  const [localIndex, setLocalIndex] = useState(0);
  const [matchInfo, setMatchInfo] = useState<{ name: string; photo: string } | null>(null);
  const cardShownAtRef = useRef<number>(Date.now());

  // ── Membership ──
  const { data: membershipData } = api.payment.membershipStatus.useQuery();
  const membershipPlan = (membershipData as any)?.plan ?? 'FREE';

  // ── Filter state ──
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({});
  const [draftFilters, setDraftFilters] = useState<Filters>({});
  const filterHeight = useRef(new Animated.Value(0)).current;
  const hasActiveFilters = !isFiltersEmpty(filters);

  const toggleFilters = useCallback(() => {
    if (membershipPlan === 'FREE') {
      Alert.alert(
        '会员专属功能',
        '高级筛选（收入、星座、MBTI等）为会员专属，升级会员即可使用',
        [
          { text: '取消', style: 'cancel' },
          { text: '升级会员', onPress: () => router.push('/profile/membership') },
        ]
      );
      return;
    }
    const toValue = showFilters ? 0 : 1;
    if (!showFilters) {
      setDraftFilters({ ...filters });
    }
    setShowFilters(!showFilters);
    Animated.timing(filterHeight, {
      toValue,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [membershipPlan, showFilters, filters, filterHeight, router]);

  const applyFilters = useCallback(() => {
    setFilters({ ...draftFilters });
    setLocalIndex(0);
    setShowFilters(false);
    Animated.timing(filterHeight, {
      toValue: 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [draftFilters, filterHeight]);

  const resetFilters = useCallback(() => {
    setDraftFilters({});
  }, []);

  const toggleArrayFilter = useCallback(
    (key: 'incomeRange' | 'zodiac' | 'mbti' | 'verificationLevel', value: string) => {
      setDraftFilters((prev) => {
        const arr = (prev[key] as string[] | undefined) ?? [];
        const next = arr.includes(value)
          ? arr.filter((v) => v !== value)
          : [...arr, value];
        return { ...prev, [key]: next } as Filters;
      });
    },
    [],
  );

  // ── Credits ──
  const { data: credits } = api.credits.balance.useQuery();

  const queryInput = hasActiveFilters ? { filters } : undefined;
  const recommendationsQuery = api.match.recommendations.useQuery(queryInput as any);
  const dailyPicksQuery = api.match.dailyPicks.useQuery();
  const remainingSwipesQuery = (api.match as any).remainingSwipes?.useQuery?.() as
    | { data?: { used: number; total: number; remaining: number; quotaExhausted: boolean } }
    | undefined;

  const likeMutation = api.match.like.useMutation();
  const skipMutation = api.match.skip.useMutation();
  const feedbackMutation = api.match.recordFeedback.useMutation();

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
    feedbackMutation.mutate({ targetUserId: user.id, action: 'view', durationMs: Date.now() - cardShownAtRef.current });
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
    const durationMs = Date.now() - cardShownAtRef.current;
    feedbackMutation.mutate({ targetUserId: user.id, action: 'view', durationMs });
    track('card_skip', {
      target_user_id: user.id,
      view_duration_ms: durationMs,
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
            onPress={toggleFilters}
          >
            <Ionicons
              name={showFilters ? 'close-outline' : 'options-outline'}
              size={20}
              color={hasActiveFilters ? '#f43f5e' : '#4b5563'}
            />
            {hasActiveFilters && (
              <View
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#f43f5e',
                }}
              />
            )}
          </Pressable>
        </View>

        {/* Filter drawer */}
        <Animated.View
          style={{
            maxHeight: filterHeight.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 600],
            }),
            opacity: filterHeight,
            overflow: 'hidden',
          }}
        >
          <ScrollView
            style={{
              backgroundColor: '#ffffff',
              borderBottomWidth: 1,
              borderBottomColor: '#e5e7eb',
            }}
            contentContainerStyle={{ padding: 16, gap: 16 }}
          >
            {/* Age range */}
            <View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
                年龄范围
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Pressable
                  onPress={() =>
                    setDraftFilters((p) => ({
                      ...p,
                      ageMin: Math.max(18, (p.ageMin ?? 18) - 1),
                    }))
                  }
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: '#f3f4f6',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 18, color: '#374151' }}>-</Text>
                </Pressable>
                <Text style={{ fontSize: 14, color: '#374151', minWidth: 24, textAlign: 'center' }}>
                  {draftFilters.ageMin ?? 18}
                </Text>
                <Pressable
                  onPress={() =>
                    setDraftFilters((p) => ({
                      ...p,
                      ageMin: Math.min((p.ageMax ?? 60) - 1, (p.ageMin ?? 18) + 1),
                    }))
                  }
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: '#f3f4f6',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 18, color: '#374151' }}>+</Text>
                </Pressable>
                <Text style={{ fontSize: 14, color: '#9ca3af' }}>至</Text>
                <Pressable
                  onPress={() =>
                    setDraftFilters((p) => ({
                      ...p,
                      ageMax: Math.max((p.ageMin ?? 18) + 1, (p.ageMax ?? 60) - 1),
                    }))
                  }
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: '#f3f4f6',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 18, color: '#374151' }}>-</Text>
                </Pressable>
                <Text style={{ fontSize: 14, color: '#374151', minWidth: 24, textAlign: 'center' }}>
                  {draftFilters.ageMax ?? 60}
                </Text>
                <Pressable
                  onPress={() =>
                    setDraftFilters((p) => ({
                      ...p,
                      ageMax: Math.min(99, (p.ageMax ?? 60) + 1),
                    }))
                  }
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: '#f3f4f6',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 18, color: '#374151' }}>+</Text>
                </Pressable>
              </View>
            </View>

            {/* Height range */}
            <View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
                身高范围 (cm)
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Pressable
                  onPress={() =>
                    setDraftFilters((p) => ({
                      ...p,
                      heightMin: Math.max(140, (p.heightMin ?? 150) - 5),
                    }))
                  }
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: '#f3f4f6',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 18, color: '#374151' }}>-</Text>
                </Pressable>
                <Text style={{ fontSize: 14, color: '#374151', minWidth: 30, textAlign: 'center' }}>
                  {draftFilters.heightMin ?? 150}
                </Text>
                <Pressable
                  onPress={() =>
                    setDraftFilters((p) => ({
                      ...p,
                      heightMin: Math.min((p.heightMax ?? 200) - 5, (p.heightMin ?? 150) + 5),
                    }))
                  }
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: '#f3f4f6',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 18, color: '#374151' }}>+</Text>
                </Pressable>
                <Text style={{ fontSize: 14, color: '#9ca3af' }}>至</Text>
                <Pressable
                  onPress={() =>
                    setDraftFilters((p) => ({
                      ...p,
                      heightMax: Math.max((p.heightMin ?? 150) + 5, (p.heightMax ?? 200) - 5),
                    }))
                  }
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: '#f3f4f6',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 18, color: '#374151' }}>-</Text>
                </Pressable>
                <Text style={{ fontSize: 14, color: '#374151', minWidth: 30, textAlign: 'center' }}>
                  {draftFilters.heightMax ?? 200}
                </Text>
                <Pressable
                  onPress={() =>
                    setDraftFilters((p) => ({
                      ...p,
                      heightMax: Math.min(220, (p.heightMax ?? 200) + 5),
                    }))
                  }
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: '#f3f4f6',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 18, color: '#374151' }}>+</Text>
                </Pressable>
              </View>
            </View>

            {/* Education */}
            <View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
                最低学历
              </Text>
              <ChipGroup
                options={EDUCATION_OPTIONS}
                selected={draftFilters.educationMin ? [draftFilters.educationMin] : []}
                onToggle={(v) =>
                  setDraftFilters((p) => ({
                    ...p,
                    educationMin: p.educationMin === v ? undefined : (v as EducationLevel),
                  }))
                }
              />
            </View>

            {/* Verification level */}
            <View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
                认证等级
              </Text>
              <ChipGroup
                options={VERIFICATION_OPTIONS}
                selected={draftFilters.verificationLevel ?? []}
                onToggle={(v) => toggleArrayFilter('verificationLevel', v)}
              />
            </View>

            {/* Advanced filters section */}
            <View style={{ borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>
                  高级筛选
                </Text>
                <View
                  style={{
                    backgroundColor: '#fef3c7',
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 4,
                  }}
                >
                  <Text style={{ fontSize: 10, color: '#d97706', fontWeight: '600' }}>会员</Text>
                </View>
              </View>

              {/* Income */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
                  收入范围
                </Text>
                <ChipGroup
                  options={INCOME_OPTIONS}
                  selected={draftFilters.incomeRange ?? []}
                  onToggle={(v) => toggleArrayFilter('incomeRange', v)}
                />
              </View>

              {/* Zodiac */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
                  星座
                </Text>
                <ChipGroup
                  options={ZODIAC_OPTIONS}
                  selected={draftFilters.zodiac ?? []}
                  onToggle={(v) => toggleArrayFilter('zodiac', v)}
                />
              </View>

              {/* MBTI */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 8 }}>
                  MBTI
                </Text>
                <ChipGroup
                  options={MBTI_OPTIONS}
                  selected={draftFilters.mbti ?? []}
                  onToggle={(v) => toggleArrayFilter('mbti', v)}
                />
              </View>
            </View>

            {/* Action buttons */}
            <View style={{ flexDirection: 'row', gap: 12, paddingTop: 4 }}>
              <Pressable
                onPress={resetFilters}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: '#f3f4f6',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#374151' }}>重置</Text>
              </Pressable>
              <Pressable
                onPress={applyFilters}
                style={{
                  flex: 2,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: '#f43f5e',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#ffffff' }}>应用</Text>
              </Pressable>
            </View>
          </ScrollView>
        </Animated.View>

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
              <SkeletonCard />
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
                {nextUser && (
                  <CardStack key={`stack-next-${nextUser.id}`} index={1} totalCards={2}>
                    <SwipeCard user={nextUser} isNext />
                  </CardStack>
                )}
                {currentUser && (
                  <CardStack key={`stack-${currentUser.id}`} index={0} totalCards={nextUser ? 2 : 1}>
                    <SwipeCard
                      key={currentUser.id}
                      user={currentUser}
                      onSwipeLeft={handleSwipeLeft}
                      onSwipeRight={handleSwipeRight}
                      recommendReason={currentUser.recommendReason}
                    />
                  </CardStack>
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

            <HeartBurst onPress={handleSwipeRight} />

            <View style={{ position: 'relative' }}>
              <Pressable
                onPress={handleSuperLike}
                disabled={credits?.superLikes === 0}
                style={({ pressed }) => ({
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: '#fef3c7',
                  alignItems: 'center',
                  justifyContent: 'center',
                  ...shadowStyle({ color: '#f59e0b', y: 4, blur: 8, opacity: 0.15, elevation: 3 }),
                  opacity: credits?.superLikes === 0 ? 0.4 : pressed ? 0.85 : 1,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                })}
              >
                <Ionicons name="star" size={26} color="#f59e0b" />
              </Pressable>
              {credits?.superLikes !== undefined && (
                <View style={{
                  position: 'absolute', top: -4, right: -4,
                  backgroundColor: '#f43f5e', borderRadius: 8,
                  minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
                    {credits.superLikes}
                  </Text>
                </View>
              )}
            </View>
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
