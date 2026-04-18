import {
  ActivityIndicator,
  FlatList,
    ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Card, EmptyState } from '@matrimonial/ui';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { api } from '@matrimonial/api-client';
import { BUDDY_TYPES, BUDDY_TYPE_COLORS, type BuddyType } from '@matrimonial/shared';
import { StaggeredListItem } from '../../../components/StaggeredListItem';
import { ScalePressable } from '../../../components/ScalePressable';

const TYPE_TABS: { label: string; value: string | undefined }[] = [
  { label: '全部', value: undefined },
  ...BUDDY_TYPES.map((t) => ({ label: t.label, value: t.id })),
];

function getBuddyTypeInfo(type: string) {
  const found = BUDDY_TYPES.find((t) => t.id === type);
  return {
    label: found?.label ?? type,
    icon: (found?.icon ?? 'ellipsis-horizontal-outline') as keyof typeof Ionicons.glyphMap,
    color: BUDDY_TYPE_COLORS[type as BuddyType] ?? '#6b7280',
  };
}

function formatScheduledTime(value: unknown): string {
  if (!value) return '';
  try {
    const d = value instanceof Date ? value : new Date(value as string);
    if (Number.isNaN(d.getTime())) return '';
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    if (diffDays === 0) return `今天 ${hh}:${mm}`;
    if (diffDays === 1) return `明天 ${hh}:${mm}`;
    return `${d.getMonth() + 1}月${d.getDate()}日 ${hh}:${mm}`;
  } catch {
    return '';
  }
}

export default function BuddyScreen() {
  const router = useRouter();
  const [type, setType] = useState<string | undefined>(undefined);
  const headerOpacity = useSharedValue(0);
  const headerY = useSharedValue(-14);
  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerY.value }],
  }));
  const fabScale = useSharedValue(0);

  useEffect(() => {
    const e = Easing.out(Easing.cubic);
    headerOpacity.value = withTiming(1, { duration: 320, easing: e });
    headerY.value = withTiming(0, { duration: 320, easing: e });
    fabScale.value = withSpring(1, { damping: 10, stiffness: 180 });
  }, []);

  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  const { data, isLoading, error, refetch, isRefetching } =
    api.buddy.list.useQuery({ type, limit: 20 });

  const posts = data?.items ?? [];

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <Animated.View className="px-4 py-3 bg-white border-b border-gray-100" style={[{ flexDirection: 'row', alignItems: 'center' }, headerStyle]}>
        <ScalePressable onPress={() => router.back()} className="mr-3">
          <Ionicons name="chevron-back" size={24} color="#374151" />
        </ScalePressable>
        <Text className="text-xl font-bold text-gray-900">搭子广场</Text>
      </Animated.View>

      {/* Type filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 10 }}
        className="max-h-12 bg-white border-b border-gray-100"
      >
        {TYPE_TABS.map((tab) => {
          const active = type === tab.value;
          return (
            <ScalePressable
              key={tab.label}
              className={`rounded-full px-4 py-1.5 ${
                active ? 'bg-rose-500' : 'bg-gray-100'
              }`}
              onPress={() => setType(tab.value)}
            >
              <Text
                className={`text-sm ${
                  active ? 'text-white font-medium' : 'text-gray-600'
                }`}
              >
                {tab.label}
              </Text>
            </ScalePressable>
          );
        })}
      </ScrollView>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#f43f5e" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <EmptyState
            title="加载失败"
            description={error.message ?? '无法获取搭子列表'}
            action={{ label: '重试', onPress: () => refetch() }}
          />
        </View>
      ) : posts.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <EmptyState
            icon={<Ionicons name="people-outline" size={56} color="#9ca3af" />}
            title="暂无搭子帖"
            description="换个类型看看，或者发起第一个帖子"
          />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          refreshing={isRefetching}
          onRefresh={() => refetch()}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            gap: 12,
            paddingBottom: 100,
          }}
          renderItem={({ item, index }) => {
            const typeInfo = getBuddyTypeInfo(item.type);
            const timeText = formatScheduledTime(item.scheduledAt);
            const applyCount = item.applyCount ?? 0;

            return (
              <StaggeredListItem index={index}>
              <ScalePressable onPress={() => router.push(`/explore/buddy/${item.id}` as any)}>
                <Card>
                  <View className="p-4">
                    {/* Type badge */}
                    <View className="flex-row items-center mb-2" style={{ gap: 8 }}>
                      <View
                        className="flex-row items-center rounded-full px-2.5 py-1"
                        style={{ backgroundColor: typeInfo.color + '18' }}
                      >
                        <Ionicons
                          name={typeInfo.icon}
                          size={13}
                          color={typeInfo.color}
                        />
                        <Text
                          className="text-xs font-medium ml-1"
                          style={{ color: typeInfo.color }}
                        >
                          {typeInfo.label}
                        </Text>
                      </View>
                    </View>

                    {/* Title */}
                    <Text
                      className="text-base font-semibold text-gray-900 mb-1"
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>

                    {/* Description */}
                    {item.description ? (
                      <Text
                        className="text-sm text-gray-500 leading-5 mb-3"
                        numberOfLines={2}
                      >
                        {item.description}
                      </Text>
                    ) : null}

                    {/* Meta row */}
                    <View style={{ gap: 4 }}>
                      {item.location ? (
                        <View className="flex-row items-center" style={{ gap: 4 }}>
                          <Ionicons name="location-outline" size={13} color="#6b7280" />
                          <Text className="text-sm text-gray-500" numberOfLines={1}>
                            {item.location}
                          </Text>
                        </View>
                      ) : null}
                      {timeText ? (
                        <View className="flex-row items-center" style={{ gap: 4 }}>
                          <Ionicons name="time-outline" size={13} color="#6b7280" />
                          <Text className="text-sm text-gray-500">{timeText}</Text>
                        </View>
                      ) : null}
                      <View className="flex-row items-center" style={{ gap: 4 }}>
                        <Ionicons name="people-outline" size={13} color="#6b7280" />
                        <Text className="text-sm text-gray-500">
                          {applyCount} 人报名
                          {item.maxPeople ? ` / 共 ${item.maxPeople} 人` : ''}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Card>
              </ScalePressable>
              </StaggeredListItem>
            );
          }}
        />
      )}

      {/* FAB — create new buddy post */}
      <Animated.View
        style={[{
          position: 'absolute',
          bottom: 32,
          right: 20,
        }, fabStyle]}
      >
        <Pressable
          className="w-14 h-14 rounded-full bg-rose-500 items-center justify-center"
          style={{
            shadowColor: '#f43f5e',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
          onPress={() => router.push('/explore/buddy/create' as any)}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </ScalePressable>
      </Animated.View>
    </SafeAreaView>
  );
}
