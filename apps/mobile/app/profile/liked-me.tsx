import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, EmptyState } from '@matrimonial/ui';
import { StaggeredListItem } from '@/components/StaggeredListItem';
import { api } from '@matrimonial/api-client';
import { calculateAge } from '@matrimonial/shared';

const FALLBACK_AVATAR = 'https://picsum.photos/seed/liked/100/100';

export default function LikedMeScreen() {
  const router = useRouter();
  const { data, isLoading } = api.match.likedMe.useQuery();

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
        <Pressable onPress={() => router.back()} className="mr-3">
          <Ionicons name="chevron-back" size={24} color="#374151" />
        </Pressable>
        <Text className="text-xl font-bold text-gray-900">获赞</Text>
        {data && data.length > 0 ? (
          <View className="ml-2 bg-rose-100 rounded-full px-2 py-0.5">
            <Text className="text-xs font-medium text-rose-500">{data.length}</Text>
          </View>
        ) : null}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#f43f5e" />
        </View>
      ) : !data || data.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <EmptyState
            icon={<Ionicons name="heart-outline" size={56} color="#9ca3af" />}
            title="还没有人喜欢你"
            description="完善资料，提高匹配率"
            action={{ label: '编辑资料', onPress: () => router.push('/profile/edit' as any) }}
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
          {data.map((like: any, index: number) => {
            const user = like.fromUser;
            if (!user) return null;
            const age = user.birthday ? calculateAge(new Date(user.birthday)) : null;
            const avatarUrl = user.photos?.[0]?.url ?? FALLBACK_AVATAR;

            return (
              <StaggeredListItem key={like.id} index={index}>
              <Card>
                <Pressable
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
                      {user.nickname ?? '用户'}
                    </Text>
                    <View className="flex-row items-center mt-0.5" style={{ gap: 6 }}>
                      {age ? (
                        <Text className="text-sm text-gray-400">{age}岁</Text>
                      ) : null}
                      {user.city ? (
                        <Text className="text-sm text-gray-400">{user.city}</Text>
                      ) : null}
                    </View>
                    {Array.isArray(user.tags) && user.tags.length > 0 ? (
                      <View className="flex-row flex-wrap mt-1" style={{ gap: 4 }}>
                        {user.tags.slice(0, 3).map((t: any) => (
                          <View key={t.tag ?? t} className="bg-rose-50 rounded-full px-2 py-0.5">
                            <Text className="text-xs text-rose-400">{t.tag ?? t}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>
                  <View className="items-center" style={{ gap: 4 }}>
                    <Ionicons name="heart" size={20} color="#f43f5e" />
                    <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
                  </View>
                </Pressable>
              </Card>
              </StaggeredListItem>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
