import { useEffect } from 'react';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { ScalePressable } from '../../../components/ScalePressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, EmptyState } from '@matrimonial/ui';
import { api } from '@matrimonial/api-client';

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
  const router = useRouter();
  const { data: matches, isLoading } = api.activity.activityMatches.useQuery();

  const headerOpacity = useSharedValue(0);
  const headerY = useSharedValue(-14);
  useEffect(() => {
    const e = Easing.out(Easing.cubic);
    headerOpacity.value = withTiming(1, { duration: 320, easing: e });
    headerY.value = withTiming(0, { duration: 320, easing: e });
  }, []);
  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerY.value }],
  }));

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <Animated.View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100" style={headerStyle}>
        <Pressable onPress={() => router.back()} className="mr-3">
          <Ionicons name="chevron-back" size={24} color="#374151" />
        </Pressable>
        <Text className="text-xl font-bold text-gray-900">活动缘分</Text>
      </Animated.View>

      <View className="mx-4 mt-3 mb-2 rounded-lg bg-rose-50 px-4 py-3">
        <Text className="text-sm text-rose-700">
          这些是你在活动中互相欣赏（各自评了 3 分以上）的人，点击头像可以查看 TA 的主页。
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#f43f5e" />
        </View>
      ) : !matches || matches.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <EmptyState
            icon={<Ionicons name="heart-dislike-outline" size={56} color="#9ca3af" />}
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
              <Card key={`${match.activityId}-${user.id}-${idx}`}>
                <ScalePressable
                  className="p-4 flex-row items-center"
                  style={{ gap: 14 }}
                  onPress={() => router.push(`/profile/${user.id}` as any)}
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
                        <Ionicons name="sparkles-outline" size={12} color="#f43f5e" />
                        <Text className="text-xs text-rose-400" numberOfLines={1}>
                          {match.activityTitle}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
                </ScalePressable>
              </Card>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
