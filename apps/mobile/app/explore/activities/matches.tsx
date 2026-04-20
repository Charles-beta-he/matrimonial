import { ActivityIndicator, Image, ScrollView, Text, View } from 'react-native';
import { StaggeredListItem } from '../../../components/StaggeredListItem';
import { ScalePressable } from '../../../components/ScalePressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, EmptyState } from '@matrimonial/ui';
import { api } from '@matrimonial/api-client';
import { colors } from '../../../constants/colors';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { useScreenTracking } from '../../../hooks/useAnalytics';

function calculateAge(birthday: string | Date | null): number | null {
  if (!birthday) return null;
  const d = birthday instanceof Date ? birthday : new Date(birthday as string);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

const FALLBACK_AVATAR = 'https://picsum.photos/seed/activity-match/100/100';

export default function ActivityMatchesScreen() {
  useScreenTracking('activity_matches');
  const router = useRouter();
  const { data: matches, isLoading } = api.activity.activityMatches.useQuery();

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScreenHeader title="活动缘分" />

      <View className="mx-4 mt-3 mb-2 rounded-lg bg-rose-50 px-4 py-3">
        <Text className="text-sm text-rose-700">
          这些是你在活动中互相欣赏（各自评了 3 分以上）的人，点击头像可以查看 TA 的主页。
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !matches || matches.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <EmptyState
            icon={<Ionicons name="heart-dislike-outline" size={56} color={colors.gray400} />}
            title="还没有活动缘分"
            description="参加活动后为参与者打分，互相欣赏就能成为缘分"
            action={{ label: '浏览活动', onPress: () => router.back() }}
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          {matches.map((match, idx) => {
            const user = match.user;
            if (!user) return null;
            const age = calculateAge(user.birthday ?? null);
            const avatarUrl = (user.photos as any[])?.[0]?.url ?? FALLBACK_AVATAR;

            return (
              <StaggeredListItem key={`${match.activityId}-${user.id}-${idx}`} index={idx}>
              <Card>
                <ScalePressable
                  className="p-4 flex-row items-center"
                  style={{ gap: 14 }}
                  onPress={() => router.push(`/discover/${user.id}` as any)}
                >
                  <Image
                    source={{ uri: avatarUrl }}
                    style={{ width: 60, height: 60, borderRadius: 30 }}
                  />
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-gray-900">
                      {user.nickname ?? '神秘用户'}
                    </Text>
                    <View className="flex-row items-center mt-0.5" style={{ gap: 6 }}>
                      {age ? (
                        <Text className="text-sm text-gray-400">{age}岁</Text>
                      ) : null}
                      {user.city ? (
                        <Text className="text-sm text-gray-400">{user.city}</Text>
                      ) : null}
                    </View>
                    {match.activityTitle ? (
                      <View className="flex-row items-center mt-1" style={{ gap: 4 }}>
                        <Ionicons name="sparkles-outline" size={12} color={colors.primary} />
                        <Text className="text-xs text-rose-400" numberOfLines={1}>
                          {match.activityTitle}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.gray300} />
                </ScalePressable>
              </Card>
              </StaggeredListItem>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
