import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Badge, EmptyState, PromptCard } from '@matrimonial/ui';
import { api } from '@matrimonial/api-client';
import { calculateAge, PROMPT_QUESTIONS } from '@matrimonial/shared';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function mapUser(u: any) {
  const age = u?.birthday ? calculateAge(new Date(u.birthday)) : 25;
  const photos: string[] =
    Array.isArray(u?.photos) && u.photos.length > 0
      ? u.photos.map((p: any) => p.url)
      : [`https://picsum.photos/seed/${u?.id ?? 'x'}/400/600`];
  const tags: string[] = Array.isArray(u?.tags) ? u.tags.map((t: any) => t.tag) : [];
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
    bio: u.bio ?? '',
    height: u.height,
    education: u.education,
    occupation: u.occupation,
    incomeRange: u.incomeRange,
    hometown: u.hometown,
    zodiac: u.zodiac,
    mbti: u.mbti,
    verificationLevel: (u.verificationLevel ?? 'L1') as 'L1' | 'L2' | 'L3' | 'L4',
    photos,
    tags,
    prompts,
    isOnline: u.isOnline ?? false,
  };
}

/** User profile detail screen */
export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const [photoIndex, setPhotoIndex] = useState(0);

  const { data, isLoading, error, refetch } = api.user.getById.useQuery(userId!, {
    enabled: !!userId,
  });
  const likeMutation = api.match.like.useMutation();
  const skipMutation = api.match.skip.useMutation();

  const handlePhotoScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setPhotoIndex(idx);
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#f43f5e" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <EmptyState
          title="加载失败"
          description="无法获取用户信息"
          action={{ label: '重试', onPress: () => refetch() }}
        />
      </View>
    );
  }

  if (!data) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <EmptyState title="用户不存在" description="该用户可能已注销" />
      </View>
    );
  }

  const user = mapUser(data);

  const infoGrid = [
    user.height && { label: '身高', value: `${user.height}cm` },
    user.education && { label: '学历', value: user.education },
    user.occupation && { label: '职业', value: user.occupation },
    user.incomeRange && { label: '收入', value: user.incomeRange },
    user.hometown && { label: '家乡', value: user.hometown },
    user.zodiac && { label: '星座', value: user.zodiac },
    user.mbti && { label: 'MBTI', value: user.mbti },
  ].filter(Boolean) as { label: string; value: string }[];

  const handleLike = () => {
    likeMutation.mutate(
      { toUserId: user.id, type: 'NORMAL' },
      {
        onSuccess: (res) => {
          if (res?.isMatched) {
            Alert.alert('匹配成功', `你和 ${user.nickname} 互相喜欢了！`);
          }
          router.back();
        },
      },
    );
  };

  const handleSuperLike = () => {
    likeMutation.mutate(
      { toUserId: user.id, type: 'SUPER' },
      {
        onSuccess: (res) => {
          if (res?.isMatched) {
            Alert.alert('匹配成功', `你和 ${user.nickname} 互相喜欢了！`);
          }
          router.back();
        },
      },
    );
  };

  const handleSkip = () => {
    skipMutation.mutate({ toUserId: user.id });
    router.back();
  };

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Photo carousel */}
        <View style={{ height: SCREEN_WIDTH * 1.2 }}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handlePhotoScroll}
          >
            {user.photos.map((photo, i) => (
              <View
                key={i}
                style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH * 1.2 }}
                className="bg-gray-200 items-center justify-center"
              >
                <Ionicons name="person" size={72} color="#9ca3af" />
                <Text className="text-gray-400 text-sm mt-2">照片 {i + 1}</Text>
              </View>
            ))}
          </ScrollView>

          {/* Dot indicators */}
          <View className="absolute bottom-4 flex-row self-center" style={{ gap: 6 }}>
            {user.photos.map((_, i) => (
              <View
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i === photoIndex ? 'bg-white' : 'bg-white/50'
                }`}
              />
            ))}
          </View>

          {/* Back button */}
          <SafeAreaView className="absolute top-0 left-0 right-0">
            <View className="flex-row justify-between px-4 pt-2">
              <Pressable
                className="w-10 h-10 bg-black/30 rounded-full items-center justify-center"
                onPress={() => router.back()}
              >
                <Ionicons name="chevron-back" size={22} color="#ffffff" />
              </Pressable>
              <Pressable
                className="w-10 h-10 bg-black/30 rounded-full items-center justify-center"
                onPress={() => Alert.alert('举报', '确定要举报该用户吗？')}
              >
                <Ionicons name="ellipsis-horizontal" size={20} color="#ffffff" />
              </Pressable>
            </View>
          </SafeAreaView>
        </View>

        {/* User info */}
        <View className="px-4 pt-4">
          <View className="flex-row items-center mb-1">
            <Text className="text-2xl font-bold text-gray-900 mr-2">
              {user.nickname}, {user.age}
            </Text>
            {user.isOnline && (
              <View className="flex-row items-center">
                <View className="w-2 h-2 bg-green-500 rounded-full mr-1" />
                <Text className="text-xs text-green-600">在线</Text>
              </View>
            )}
          </View>
          <View className="flex-row items-center mb-3" style={{ gap: 8 }}>
            <Text className="text-sm text-gray-500">{user.city}</Text>
            <Badge
              label={user.verificationLevel}
              variant="verification"
              level={user.verificationLevel}
            />
          </View>

          {user.bio ? <Text className="text-sm text-gray-700 mb-4">{user.bio}</Text> : null}

          {/* Tags */}
          {user.tags.length > 0 && (
            <View className="flex-row flex-wrap mb-4" style={{ gap: 8 }}>
              {user.tags.map((tag) => (
                <Badge key={tag} label={tag} variant="tag" />
              ))}
            </View>
          )}

          {/* About */}
          {user.prompts.length > 0 && (
            <>
              <Text className="text-base font-semibold text-gray-900 mb-2">关于TA</Text>
              {user.prompts.map((prompt: { question: string; answer: string }, i: number) => (
                <View key={i} className="mb-3">
                  <PromptCard question={prompt.question} answer={prompt.answer} />
                </View>
              ))}
            </>
          )}

          {/* Info grid */}
          {infoGrid.length > 0 && (
            <>
              <Text className="text-base font-semibold text-gray-900 mb-3 mt-2">基本信息</Text>
              <View className="flex-row flex-wrap mb-6" style={{ gap: 8 }}>
                {infoGrid.map((item) => (
                  <View
                    key={item.label}
                    className="bg-gray-50 rounded-xl px-4 py-3"
                    style={{ width: '47%' }}
                  >
                    <Text className="text-xs text-gray-400 mb-0.5">{item.label}</Text>
                    <Text className="text-sm text-gray-900 font-medium">{item.value}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        <View className="h-24" />
      </ScrollView>

      {/* Bottom fixed action bar */}
      <SafeAreaView
        edges={['bottom']}
        className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100"
      >
        <View className="flex-row items-center justify-center py-3 px-6" style={{ gap: 16 }}>
          <Pressable
            onPress={handleSkip}
            className="w-12 h-12 rounded-full bg-gray-100 items-center justify-center"
          >
            <Ionicons name="close" size={24} color="#6b7280" />
          </Pressable>
          <Pressable
            onPress={handleLike}
            className="flex-1 h-12 rounded-full bg-rose-500 flex-row items-center justify-center"
            style={{ gap: 6 }}
          >
            <Ionicons name="heart" size={20} color="#ffffff" />
            <Text className="text-white font-semibold text-base">喜欢</Text>
          </Pressable>
          <Pressable
            onPress={handleSuperLike}
            className="w-12 h-12 rounded-full bg-amber-100 items-center justify-center"
          >
            <Ionicons name="star" size={22} color="#f59e0b" />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
