import { useEffect, useState } from 'react';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
    ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Badge, Button, Card, EmptyState, toast } from '@matrimonial/ui';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@matrimonial/api-client';
import { formatPrice } from '@matrimonial/shared';
import { useAnalytics } from '../../../hooks/useAnalytics';
import { StaggeredListItem } from '../../../components/StaggeredListItem';
import { ScalePressable } from '../../../components/ScalePressable';

const CATEGORY_TABS: { label: string; value: string | undefined }[] = [
  { label: '全部', value: undefined },
  { label: '户外', value: '户外' },
  { label: '文化', value: '文化' },
  { label: '生活', value: '生活' },
  { label: '其他', value: '其他' },
];

function formatStartTime(value: unknown): string {
  if (!value) return '';
  try {
    const d = value instanceof Date ? value : new Date(value as string);
    if (Number.isNaN(d.getTime())) return '';
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${month}月${day}日 ${hh}:${mm}`;
  } catch {
    return '';
  }
}

function feeToYuanText(fee: unknown): string {
  // fee is a Prisma Decimal serialized as string, or could be number
  const n = typeof fee === 'number' ? fee : Number(fee ?? 0);
  if (!Number.isFinite(n) || n <= 0) return '免费';
  // formatPrice expects cents
  return formatPrice(Math.round(n * 100)) + '/人';
}

/** Offline activities screen — wired to api.activity.list */
export default function ActivitiesScreen() {
  const router = useRouter();
  const { track } = useAnalytics();
  const [category, setCategory] = useState<string | undefined>(undefined);

  const headerOpacity = useSharedValue(0);
  const headerY = useSharedValue(-14);
  useEffect(() => {
    const e = Easing.out(Easing.cubic);
    headerOpacity.value = withTiming(1, { duration: 320, easing: e });
    headerY.value = withTiming(0, { duration: 320, easing: e });
    track('screen_view', { screen_name: 'explore_activities' });
  }, [track]);
  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerY.value }],
  }));

  const {
    data: activities,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = api.activity.list.useQuery({ category });

  const { data: activityMatches } = api.activity.activityMatches.useQuery();
  const { data: mySignups, refetch: refetchMySignups } = api.activity.mySignups.useQuery();

  const signupMut = api.activity.signup.useMutation({
    onSuccess: () => {
      toast.success('报名成功');
      refetch();
      refetchMySignups();
    },
    onError: (e) => {
      toast.error(e?.message ?? '报名失败');
    },
  });

  const cancelSignupMut = api.activity.cancelSignup.useMutation({
    onSuccess: () => {
      toast.success('已取消报名');
      refetchMySignups();
      refetch();
    },
    onError: (e) => {
      toast.error(e?.message ?? '取消失败');
    },
  });

  const handleSignup = (activityId: string, _title: string) => {
    track('activity_signup', { activity_id: activityId });
    signupMut.mutate({ activityId });
  };

  const handleCancelSignup = (activityId: string) => {
    Alert.alert('取消报名', '确定要取消报名吗？', [
      { text: '返回', style: 'cancel' },
      { text: '确认取消', style: 'destructive', onPress: () => cancelSignupMut.mutate({ activityId }) },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <Animated.View className="px-4 py-3 bg-white border-b border-gray-100" style={[{ flexDirection: 'row', alignItems: 'center' }, headerStyle]}>
        <ScalePressable onPress={() => router.back()} className="mr-3">
          <Ionicons name="chevron-back" size={24} color="#374151" />
        </ScalePressable>
        <Text className="text-xl font-bold text-gray-900">线下活动</Text>
      </Animated.View>

      {/* Category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, alignItems: 'center' }}
        style={{ marginBottom: 12, maxHeight: 44 }}
      >
        {CATEGORY_TABS.map((cat) => {
          const active = category === cat.value;
          return (
            <ScalePressable
              key={cat.label}
              className={`rounded-full px-4 py-1.5 ${
                active ? 'bg-rose-500' : 'bg-white'
              }`}
              onPress={() => setCategory(cat.value)}
            >
              <Text
                className={`text-sm ${
                  active ? 'text-white font-medium' : 'text-gray-600'
                }`}
              >
                {cat.label}
              </Text>
            </ScalePressable>
          );
        })}
      </ScrollView>

      {/* My signups section */}
      {mySignups && mySignups.filter((s: any) => s.status !== 'CANCELLED').length > 0 ? (
        <View className="mx-4 mb-3">
          <Text className="text-sm font-semibold text-gray-700 mb-2">我的报名</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ height: 72 }} contentContainerStyle={{ gap: 8, alignItems: 'center' }}>
            {mySignups.filter((s: any) => s.status !== 'CANCELLED').map((signup: any) => (
              <View key={signup.id} className="bg-white rounded-xl px-3 py-2.5 border border-gray-100" style={{ minWidth: 160 }}>
                <Text className="text-sm font-medium text-gray-800" numberOfLines={1}>
                  {signup.activity?.title ?? '未命名活动'}
                </Text>
                <View className="flex-row items-center justify-between mt-1">
                  <Text className="text-xs text-gray-400">
                    {signup.status === 'CONFIRMED' ? '已确认' : '待确认'}
                  </Text>
                  {signup.activity?.status === 'UPCOMING' ? (
                    <ScalePressable onPress={() => handleCancelSignup(signup.activityId)}>
                      <Text className="text-xs text-rose-400">取消</Text>
                    </ScalePressable>
                  ) : signup.activity?.status === 'COMPLETED' ? (
                    <ScalePressable onPress={() => router.push(`/explore/activities/${signup.activityId}/vote` as any)}>
                      <Text className="text-xs text-rose-500 font-medium">去互评</Text>
                    </ScalePressable>
                  ) : null}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* Activity matches banner */}
      {activityMatches && activityMatches.length > 0 ? (
        <ScalePressable
          className="mx-4 mb-3 rounded-xl bg-rose-50 px-4 py-3 flex-row items-center justify-between"
          onPress={() => router.push('/explore/activities/matches' as any)}
        >
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <Ionicons name="heart-circle" size={22} color="#f43f5e" />
            <View>
              <Text className="text-sm font-semibold text-rose-700">
                你有 {activityMatches.length} 位活动缘分
              </Text>
              <Text className="text-xs text-rose-400">活动中双方互相欣赏的人</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#f43f5e" />
        </ScalePressable>
      ) : null}

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#f43f5e" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <EmptyState
            title="加载失败"
            description={error.message ?? '无法获取活动列表'}
            action={{ label: '重试', onPress: () => refetch() }}
          />
        </View>
      ) : !activities || activities.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <EmptyState
            icon={<Ionicons name="sparkles-outline" size={56} color="#9ca3af" />}
            title="暂无活动"
            description="换个分类看看吧"
          />
        </View>
      ) : (
        <FlatList
          data={activities as any[]}
          keyExtractor={(item) => item.id}
          refreshing={isRefetching}
          onRefresh={() => refetch()}
          contentContainerStyle={{
            paddingHorizontal: 16,
            gap: 12,
            paddingBottom: 24,
          }}
          renderItem={({ item, index }) => {
            const maxMale = Number(item.maxMale ?? 0);
            const maxFemale = Number(item.maxFemale ?? 0);
            // No gender breakdown in list response — use total signupCount
            const signupCount = Number(item.signupCount ?? 0);
            const totalCap = maxMale + maxFemale;
            const startTimeText = formatStartTime(item.startTime);
            const feeText = feeToYuanText(item.fee);
            const isUpcoming = item.status === 'UPCOMING';

            return (
              <StaggeredListItem index={index}>
              <Card className="overflow-hidden">
                {item.coverUrl ? (
                  <Image
                    source={{ uri: item.coverUrl }}
                    style={{ width: '100%', height: 140 }}
                    resizeMode="cover"
                  />
                ) : (
                  <View className="h-32 bg-gray-200 items-center justify-center">
                    <Ionicons name="sparkles-outline" size={56} color="#9ca3af" />
                  </View>
                )}
                <View className="p-4">
                  <View className="flex-row items-start justify-between mb-2">
                    <Text
                      className="text-lg font-semibold text-gray-900 flex-1 mr-2"
                      numberOfLines={2}
                    >
                      {item.title ?? '未命名活动'}
                    </Text>
                    {item.category ? (
                      <Badge label={item.category} variant="tag" />
                    ) : null}
                  </View>
                  {item.description ? (
                    <Text
                      className="text-sm text-gray-500 mb-2"
                      numberOfLines={2}
                    >
                      {item.description}
                    </Text>
                  ) : null}
                  <View style={{ gap: 4 }}>
                    {startTimeText ? (
                      <View className="flex-row items-center" style={{ gap: 4 }}>
                        <Ionicons name="time-outline" size={14} color="#6b7280" />
                        <Text className="text-sm text-gray-500">{startTimeText}</Text>
                      </View>
                    ) : null}
                    {item.location ? (
                      <View className="flex-row items-center" style={{ gap: 4 }}>
                        <Ionicons name="location-outline" size={14} color="#6b7280" />
                        <Text className="text-sm text-gray-500">{item.location}</Text>
                      </View>
                    ) : null}
                    <Text className="text-sm text-gray-600">
                      已报名 {signupCount}
                      {totalCap > 0 ? `/${totalCap}` : ''} · 男 {maxMale} · 女{' '}
                      {maxFemale}
                    </Text>
                  </View>
                  <View className="flex-row items-center justify-between mt-3">
                    <Text className="text-lg font-bold text-rose-500">
                      {feeText}
                    </Text>
                    <View className="flex-row items-center" style={{ gap: 8 }}>
                      {item.status === 'COMPLETED' && (
                        <Button
                          title="互评"
                          variant="secondary"
                          size="sm"
                          onPress={() =>
                            router.push(
                              `/explore/activities/${item.id}/vote` as any,
                            )
                          }
                        />
                      )}
                      <Button
                        title={isUpcoming ? '报名' : '已结束'}
                        variant="primary"
                        size="sm"
                        disabled={!isUpcoming || signupMut.isPending}
                        onPress={() => handleSignup(item.id, item.title)}
                      />
                    </View>
                  </View>
                </View>
              </Card>
              </StaggeredListItem>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
