import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Badge, Card, EmptyState } from '@matrimonial/ui';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@matrimonial/api-client';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { CIRCLE_CATEGORIES } from '@matrimonial/shared';
import { StaggeredListItem } from '../../../components/StaggeredListItem';
import { ScalePressable } from '../../../components/ScalePressable';

function AnimatedBanner({ color, index }: { color: string; index: number }) {
  const width = useSharedValue(0);
  const widthStyle = useAnimatedStyle(() => ({ width: `${width.value}%` as any }));

  useEffect(() => {
    width.value = withDelay(
      Math.min(index * 60, 400) + 80,
      withTiming(100, { duration: 400, easing: Easing.out(Easing.cubic) }),
    );
  }, [index, width]);

  return (
    <Animated.View style={[{ height: 6, backgroundColor: color }, widthStyle]} />
  );
}

const CATEGORY_TABS: { label: string; value: string | undefined }[] = [
  { label: '全部', value: undefined },
  ...CIRCLE_CATEGORIES.map((c) => ({ label: c.label, value: c.id })),
];

const CATEGORY_COLORS: Record<string, string> = {
  reading: '#6366f1',
  fitness: '#ef4444',
  travel: '#0ea5e9',
  photography: '#8b5cf6',
  gaming: '#22c55e',
  food: '#f97316',
  music: '#ec4899',
  movies: '#eab308',
};

export default function CirclesScreen() {
  const router = useRouter();
  const [category, setCategory] = useState<string | undefined>(undefined);

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

  const { data, isLoading, error, refetch, isRefetching } =
    api.circle.list.useQuery({ category, limit: 20 });

  const circles = data?.items ?? [];

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <Animated.View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100" style={headerStyle}>
        <Pressable onPress={() => router.back()} className="mr-3">
          <Ionicons name="chevron-back" size={24} color="#374151" />
        </Pressable>
        <Text className="text-xl font-bold text-gray-900">兴趣圈子</Text>
      </Animated.View>

      {/* Category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 10 }}
        className="max-h-12 bg-white border-b border-gray-100"
      >
        {CATEGORY_TABS.map((tab) => {
          const active = category === tab.value;
          return (
            <ScalePressable
              key={tab.label}
              className={`rounded-full px-4 py-1.5 ${
                active ? 'bg-rose-500' : 'bg-gray-100'
              }`}
              onPress={() => setCategory(tab.value)}
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
            description={error.message ?? '无法获取圈子列表'}
            action={{ label: '重试', onPress: () => refetch() }}
          />
        </View>
      ) : circles.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <EmptyState
            icon={<Ionicons name="chatbubbles-outline" size={56} color="#9ca3af" />}
            title="暂无圈子"
            description="换个分类看看吧"
          />
        </View>
      ) : (
        <FlatList
          data={circles}
          keyExtractor={(item) => item.id}
          refreshing={isRefetching}
          onRefresh={() => refetch()}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            gap: 12,
            paddingBottom: 24,
          }}
          renderItem={({ item, index }) => {
            const catInfo = CIRCLE_CATEGORIES.find((c) => c.id === item.category);
            const accentColor = CATEGORY_COLORS[item.category] ?? '#6b7280';

            return (
              <StaggeredListItem index={index}>
              <ScalePressable onPress={() => router.push(`/explore/circles/${item.id}` as any)}>
                <Card className="overflow-hidden">
                  {/* Color banner */}
                  <View style={{ height: 6, backgroundColor: accentColor + '30', overflow: 'hidden' }}>
                    <AnimatedBanner color={accentColor} index={index} />
                  </View>
                  <View className="p-4">
                    <View className="flex-row items-start justify-between mb-2">
                      <View className="flex-1 mr-3">
                        <Text
                          className="text-base font-bold text-gray-900 mb-1"
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        {item.description ? (
                          <Text
                            className="text-sm text-gray-500 leading-5"
                            numberOfLines={2}
                          >
                            {item.description}
                          </Text>
                        ) : null}
                      </View>
                      {/* Category icon circle */}
                      <View
                        className="w-10 h-10 rounded-full items-center justify-center"
                        style={{ backgroundColor: accentColor + '18' }}
                      >
                        <Ionicons
                          name={(catInfo?.icon ?? 'chatbubbles-outline') as any}
                          size={20}
                          color={accentColor}
                        />
                      </View>
                    </View>

                    <View className="flex-row items-center mt-2" style={{ gap: 10 }}>
                      {catInfo ? (
                        <Badge label={catInfo.label} variant="tag" />
                      ) : null}
                      <View className="flex-row items-center" style={{ gap: 4 }}>
                        <Ionicons name="people-outline" size={14} color="#6b7280" />
                        <Text className="text-sm text-gray-500">
                          {item.memberCount} 成员
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
    </SafeAreaView>
  );
}
