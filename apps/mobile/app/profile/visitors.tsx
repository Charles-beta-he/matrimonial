import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, EmptyState } from '@matrimonial/ui';
import { api } from '@matrimonial/api-client';
import { calculateAge } from '@matrimonial/shared';

const FALLBACK_AVATAR = 'https://picsum.photos/seed/visitor/100/100';

function formatRelativeTime(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date as string);
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}小时前`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}天前`;
  return d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
}

export default function VisitorsScreen() {
  const router = useRouter();
  const { data, isLoading } = api.user.visitors.useQuery({ limit: 100 });

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
        <Pressable onPress={() => router.back()} className="mr-3">
          <Ionicons name="chevron-back" size={24} color="#374151" />
        </Pressable>
        <Text className="text-xl font-bold text-gray-900">来访</Text>
        {data && data.length > 0 ? (
          <View className="ml-2 bg-gray-100 rounded-full px-2 py-0.5">
            <Text className="text-xs font-medium text-gray-500">{data.length}</Text>
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
            icon={<Ionicons name="eye-outline" size={56} color="#9ca3af" />}
            title="还没有访客"
            description="提升资料完整度，吸引更多人查看你"
            action={{ label: '编辑资料', onPress: () => router.push('/profile/edit' as any) }}
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
          {data.map((visitor: any, idx: number) => {
            if (!visitor?.id) return null;
            const age = visitor.birthday ? calculateAge(new Date(visitor.birthday)) : null;
            const avatarUrl = visitor.photos?.[0]?.url ?? FALLBACK_AVATAR;

            return (
              <Card key={`${visitor.id}-${idx}`}>
                <Pressable
                  className="p-4 flex-row items-center"
                  style={{ gap: 14 }}
                  onPress={() => router.push(`/discover/${visitor.id}` as any)}
                >
                  <Image
                    source={{ uri: avatarUrl }}
                    style={{ width: 56, height: 56, borderRadius: 28 }}
                  />
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-gray-900">
                      {visitor.nickname ?? '用户'}
                    </Text>
                    <View className="flex-row items-center mt-0.5" style={{ gap: 6 }}>
                      {age ? (
                        <Text className="text-sm text-gray-400">{age}岁</Text>
                      ) : null}
                      {visitor.city ? (
                        <Text className="text-sm text-gray-400">{visitor.city}</Text>
                      ) : null}
                    </View>
                  </View>
                  <View className="items-end" style={{ gap: 4 }}>
                    {visitor.viewedAt ? (
                      <Text className="text-xs text-gray-400">
                        {formatRelativeTime(visitor.viewedAt)}
                      </Text>
                    ) : null}
                    <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
                  </View>
                </Pressable>
              </Card>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
