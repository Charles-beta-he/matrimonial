import { ActivityIndicator, Image, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Card, EmptyState } from '@matrimonial/ui';
import { StaggeredListItem } from '@/components/StaggeredListItem';
import { ScalePressable } from '@/components/ScalePressable';
import { api } from '@matrimonial/api-client';
import { calculateAge } from '@matrimonial/shared';
import { colors } from '../../constants/colors';

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

interface VisitorCardProps {
  visitor: any;
  index: number;
  onPress: () => void;
}

function VisitorCard({ visitor, index, onPress }: VisitorCardProps) {
  const age = visitor.birthday ? calculateAge(new Date(visitor.birthday)) : null;
  const avatarUrl = visitor.photos?.[0]?.url ?? FALLBACK_AVATAR;
  return (
    <StaggeredListItem key={`${visitor.id}-${index}`} index={index}>
      <Card>
        <ScalePressable className="p-4 flex-row items-center" style={{ gap: 14 }} onPress={onPress}>
          <Image source={{ uri: avatarUrl }} style={{ width: 56, height: 56, borderRadius: 28 }} />
          <View className="flex-1">
            <Text className="text-base font-semibold text-gray-900">{visitor.nickname ?? '用户'}</Text>
            <View className="flex-row items-center mt-0.5" style={{ gap: 6 }}>
              {age ? <Text className="text-sm text-gray-400">{age}岁</Text> : null}
              {visitor.city ? <Text className="text-sm text-gray-400">{visitor.city}</Text> : null}
            </View>
          </View>
          <View className="items-end" style={{ gap: 4 }}>
            {visitor.viewedAt ? (
              <Text className="text-xs text-gray-400">{formatRelativeTime(visitor.viewedAt)}</Text>
            ) : null}
            <Ionicons name="chevron-forward" size={16} color={colors.gray300} />
          </View>
        </ScalePressable>
      </Card>
    </StaggeredListItem>
  );
}

export default function VisitorsScreen() {
  const router = useRouter();
  const { data, isLoading } = api.user.visitors.useQuery({ limit: 100 });

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScreenHeader title="谁看过我" />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !data || data.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <EmptyState
            icon={<Ionicons name="eye-outline" size={56} color={colors.gray400} />}
            title="还没有访客"
            description="提升资料完整度，吸引更多人查看你"
            action={{ label: '编辑资料', onPress: () => router.push('/profile/edit' as any) }}
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
          {data.map((visitor: any, idx: number) => {
            if (!visitor?.id) return null;
            return (
              <VisitorCard
                key={`${visitor.id}-${idx}`}
                visitor={visitor}
                index={idx}
                onPress={() => router.push(`/discover/${visitor.id}` as any)}
              />
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
