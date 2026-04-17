import { useEffect, useState } from 'react';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { StaggeredListItem } from '../../../../components/StaggeredListItem';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@matrimonial/api-client';
import { Card, EmptyState, toast } from '@matrimonial/ui';

function calculateAge(birthday: string | Date | null): number | null {
  if (!birthday) return null;
  const d = birthday instanceof Date ? birthday : new Date(birthday);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

function StarRating({
  rating,
  onRate,
  disabled,
}: {
  rating: number;
  onRate: (r: number) => void;
  disabled?: boolean;
}) {
  return (
    <View className="flex-row items-center" style={{ gap: 4 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable
          key={star}
          onPress={() => !disabled && onRate(star)}
          hitSlop={6}
          disabled={disabled}
        >
          <Ionicons
            name={star <= rating ? 'heart' : 'heart-outline'}
            size={24}
            color={star <= rating ? '#f43f5e' : '#d1d5db'}
          />
        </Pressable>
      ))}
    </View>
  );
}

type Participant = {
  id: string;
  nickname: string;
  gender: string;
  birthday: string | Date | null;
  city: string;
  avatarUrl: string | null;
  myRating: number | null;
};

export default function ActivityVoteScreen() {
  const router = useRouter();
  const { activityId } = useLocalSearchParams<{ activityId: string }>();

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

  const activityQuery = api.activity.getById.useQuery(activityId ?? '');
  const participantsQuery = api.activity.votableParticipants.useQuery(
    { activityId: activityId ?? '' },
    { enabled: !!activityId },
  );

  const voteMutation = api.activity.vote.useMutation({
    onSuccess: (result) => {
      if (result.isMutual && result.conversationId) {
        Alert.alert(
          '互相欣赏!',
          '你们互相投了好感票，可以开始聊天啦！',
          [
            { text: '稍后再说', style: 'cancel' },
            {
              text: '开始聊天',
              onPress: () =>
                router.push(`/chat/${result.conversationId}` as any),
            },
          ],
        );
      } else {
        toast.success('投票成功');
      }
      participantsQuery.refetch();
    },
    onError: (e) => {
      toast.error(e?.message ?? '投票失败');
    },
  });

  // Track local ratings for optimistic UI
  const [localRatings, setLocalRatings] = useState<Record<string, number>>({});

  const handleRate = (votedId: string, rating: number) => {
    if (!activityId) return;
    setLocalRatings((prev) => ({ ...prev, [votedId]: rating }));
    voteMutation.mutate({ activityId, votedId, rating });
  };

  const activity = activityQuery.data;
  const participants = participantsQuery.data as Participant[] | undefined;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <Animated.View className="flex-row items-center px-4 py-3 border-b border-gray-100" style={headerStyle}>
        <Pressable onPress={() => router.back()} className="mr-3">
          <Ionicons name="chevron-back" size={24} color="#374151" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-lg font-bold text-gray-900">活动互评</Text>
          {activity?.title ? (
            <Text className="text-sm text-gray-500" numberOfLines={1}>
              {activity.title}
            </Text>
          ) : null}
        </View>
      </Animated.View>

      {/* Info banner */}
      <View className="mx-4 mt-3 mb-2 rounded-lg bg-rose-50 px-4 py-3">
        <Text className="text-sm text-rose-700">
          为活动中遇到的小伙伴打分吧！双方都给了 3 分以上会自动开启聊天。投票完全匿名，对方不会看到你的评分。
        </Text>
      </View>

      {participantsQuery.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#f43f5e" />
        </View>
      ) : !participants || participants.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <EmptyState
            icon={<Ionicons name="people-outline" size={56} color="#9ca3af" />}
            title="暂无参与者"
            description="该活动暂无其他参与者可评价"
          />
        </View>
      ) : (
        <FlatList
          data={participants}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{ padding: 12, gap: 12 }}
          columnWrapperStyle={{ gap: 12 }}
          renderItem={({ item, index }) => {
            const age = calculateAge(item.birthday);
            const currentRating =
              localRatings[item.id] ?? item.myRating ?? 0;
            const hasVoted = item.myRating !== null || !!localRatings[item.id];

            return (
              <StaggeredListItem index={index} style={{ flex: 1 }}>
              <Card className="flex-1 overflow-hidden">
                {/* Avatar */}
                <View className="items-center pt-4 pb-2">
                  {item.avatarUrl ? (
                    <Image
                      source={{ uri: item.avatarUrl }}
                      style={{ width: 72, height: 72, borderRadius: 36 }}
                    />
                  ) : (
                    <View
                      className="bg-gray-200 items-center justify-center"
                      style={{ width: 72, height: 72, borderRadius: 36 }}
                    >
                      <Ionicons
                        name="person"
                        size={36}
                        color="#9ca3af"
                      />
                    </View>
                  )}
                </View>

                {/* Info */}
                <View className="items-center px-3 pb-2">
                  <Text
                    className="text-base font-semibold text-gray-900"
                    numberOfLines={1}
                  >
                    {item.nickname}
                  </Text>
                  <Text className="text-xs text-gray-500 mt-0.5">
                    {age ? `${age}岁` : ''}
                    {age && item.city ? ' · ' : ''}
                    {item.city ?? ''}
                  </Text>
                </View>

                {/* Rating */}
                <View className="items-center pb-4">
                  <StarRating
                    rating={currentRating}
                    onRate={(r) => handleRate(item.id, r)}
                    disabled={voteMutation.isPending}
                  />
                  {hasVoted ? (
                    <View className="flex-row items-center mt-1" style={{ gap: 2 }}>
                      <Ionicons
                        name="checkmark-circle"
                        size={14}
                        color="#22c55e"
                      />
                      <Text className="text-xs text-green-600">已评价</Text>
                    </View>
                  ) : null}
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
