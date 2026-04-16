import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Avatar, Badge, Button, EmptyState, Modal, toast } from '@matrimonial/ui';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@matrimonial/api-client';
import { CIRCLE_CATEGORIES } from '@matrimonial/shared';

/** Relative time display in Chinese */
function timeAgo(value: unknown): string {
  if (!value) return '';
  try {
    const d = value instanceof Date ? value : new Date(value as string);
    if (Number.isNaN(d.getTime())) return '';
    const now = Date.now();
    const diff = now - d.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}小时前`;
    const days = Math.floor(hours / 24);
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    if (days < 30) return `${Math.floor(days / 7)}周前`;
    const month = d.getMonth() + 1;
    const day = d.getDate();
    return `${month}月${day}日`;
  } catch {
    return '';
  }
}

const GRADIENT_COLORS: Record<string, string> = {
  reading: '#6366f1',
  fitness: '#ef4444',
  travel: '#0ea5e9',
  photography: '#8b5cf6',
  gaming: '#22c55e',
  food: '#f97316',
  music: '#ec4899',
  movies: '#eab308',
};

export default function CircleDetailScreen() {
  const router = useRouter();
  const { circleId } = useLocalSearchParams<{ circleId: string }>();
  const [showPostModal, setShowPostModal] = useState(false);
  const [postContent, setPostContent] = useState('');

  const utils = api.useUtils();

  const {
    data: circle,
    isLoading,
    error,
    refetch,
  } = api.circle.getById.useQuery(
    { id: circleId! },
    { enabled: !!circleId },
  );

  const {
    data: postsData,
    isLoading: postsLoading,
    refetch: refetchPosts,
    isRefetching: postsRefetching,
  } = api.circle.posts.useQuery(
    { circleId: circleId! },
    { enabled: !!circleId },
  );

  const posts = postsData?.items ?? circle?.posts ?? [];

  const joinMut = api.circle.join.useMutation({
    onSuccess: () => {
      toast.success('已加入圈子');
      utils.circle.getById.invalidate({ id: circleId! });
    },
    onError: (e) => toast.error(e?.message ?? '加入失败'),
  });

  const leaveMut = api.circle.leave.useMutation({
    onSuccess: () => {
      toast.success('已退出圈子');
      utils.circle.getById.invalidate({ id: circleId! });
    },
    onError: (e) => toast.error(e?.message ?? '退出失败'),
  });

  const createPostMut = api.circle.createPost.useMutation({
    onSuccess: () => {
      toast.success('发布成功');
      setPostContent('');
      setShowPostModal(false);
      refetchPosts();
      utils.circle.getById.invalidate({ id: circleId! });
    },
    onError: (e) => toast.error(e?.message ?? '发布失败'),
  });

  const handleToggleMember = () => {
    if (!circleId) return;
    if (circle?.isMember) {
      leaveMut.mutate({ circleId });
    } else {
      joinMut.mutate({ circleId });
    }
  };

  const handleCreatePost = () => {
    if (!circleId || !postContent.trim()) return;
    createPostMut.mutate({ circleId, content: postContent.trim() });
  };

  const categoryLabel =
    CIRCLE_CATEGORIES.find((c) => c.id === circle?.category)?.label ??
    circle?.category;

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-row items-center px-4 py-3">
          <Pressable onPress={() => router.back()} className="mr-3">
            <Ionicons name="chevron-back" size={24} color="#374151" />
          </Pressable>
        </View>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#f43f5e" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !circle) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-row items-center px-4 py-3">
          <Pressable onPress={() => router.back()} className="mr-3">
            <Ionicons name="chevron-back" size={24} color="#374151" />
          </Pressable>
          <Text className="text-xl font-bold text-gray-900">圈子详情</Text>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <EmptyState
            title="加载失败"
            description={error?.message ?? '无法获取圈子信息'}
            action={{ label: '重试', onPress: () => refetch() }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const renderHeader = () => (
    <View>
      {/* Cover */}
      {circle.coverUrl ? (
        <Image
          source={{ uri: circle.coverUrl }}
          style={{ width: '100%', height: 180 }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            width: '100%',
            height: 180,
            backgroundColor: GRADIENT_COLORS[circle.category] ?? '#6b7280',
          }}
          className="items-center justify-center"
        >
          <Ionicons
            name={
              (CIRCLE_CATEGORIES.find((c) => c.id === circle.category)
                ?.icon as any) ?? 'chatbubbles-outline'
            }
            size={64}
            color="rgba(255,255,255,0.6)"
          />
        </View>
      )}

      {/* Circle info */}
      <View className="px-4 pt-4 pb-2">
        <View className="flex-row items-start justify-between mb-2">
          <View className="flex-1 mr-3">
            <Text className="text-xl font-bold text-gray-900 mb-1">
              {circle.name}
            </Text>
            {circle.description ? (
              <Text className="text-sm text-gray-500 leading-5">
                {circle.description}
              </Text>
            ) : null}
          </View>
          <Button
            title={circle.isMember ? '已加入' : '加入'}
            variant={circle.isMember ? 'outline' : 'primary'}
            size="sm"
            disabled={joinMut.isPending || leaveMut.isPending}
            onPress={handleToggleMember}
          />
        </View>

        <View className="flex-row items-center mt-1" style={{ gap: 12 }}>
          {categoryLabel ? (
            <Badge label={categoryLabel} variant="tag" />
          ) : null}
          <View className="flex-row items-center" style={{ gap: 4 }}>
            <Ionicons name="people-outline" size={14} color="#6b7280" />
            <Text className="text-sm text-gray-500">
              {circle.memberCount} 成员
            </Text>
          </View>
        </View>
      </View>

      {/* Divider */}
      <View className="h-2 bg-gray-100 mt-3" />

      {/* Section title */}
      <View className="px-4 py-3">
        <Text className="text-base font-semibold text-gray-900">
          圈子动态
        </Text>
      </View>
    </View>
  );

  const renderPost = ({ item }: { item: (typeof posts)[number] }) => (
    <View className="px-4 py-3 border-b border-gray-100">
      {/* Author row */}
      <View className="flex-row items-center mb-2" style={{ gap: 10 }}>
        <Avatar
          source={
            item.author?.avatar
              ? { uri: item.author.avatar }
              : require('../../../assets/default-avatar.png')
          }
          size={36}
        />
        <View className="flex-1">
          <Text className="text-sm font-medium text-gray-900">
            {item.author?.nickname ?? '匿名用户'}
          </Text>
          <Text className="text-xs text-gray-400">
            {timeAgo(item.createdAt)}
          </Text>
        </View>
      </View>

      {/* Content */}
      <Text className="text-sm text-gray-700 leading-5 mb-2">
        {item.content}
      </Text>

      {/* Image grid */}
      {item.imageUrls && item.imageUrls.length > 0 ? (
        <View className="flex-row flex-wrap" style={{ gap: 4, marginBottom: 8 }}>
          {item.imageUrls.slice(0, 9).map((url: string, idx: number) => (
            <Image
              key={`${item.id}-img-${idx}`}
              source={{ uri: url }}
              style={{
                width: item.imageUrls!.length === 1 ? 200 : 100,
                height: item.imageUrls!.length === 1 ? 200 : 100,
                borderRadius: 8,
              }}
              resizeMode="cover"
            />
          ))}
        </View>
      ) : null}

      {/* Like count */}
      <View className="flex-row items-center" style={{ gap: 4 }}>
        <Ionicons name="heart-outline" size={14} color="#9ca3af" />
        <Text className="text-xs text-gray-400">{item.likeCount ?? 0}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Back button overlay */}
      <View className="absolute top-12 left-4 z-10">
        <Pressable
          onPress={() => router.back()}
          className="w-9 h-9 rounded-full bg-black/30 items-center justify-center"
        >
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>
      </View>

      {postsLoading && posts.length === 0 ? (
        <>
          {renderHeader()}
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#f43f5e" />
          </View>
        </>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          renderItem={renderPost}
          refreshing={postsRefetching}
          onRefresh={() => {
            refetch();
            refetchPosts();
          }}
          ListEmptyComponent={
            <View className="items-center justify-center py-16">
              <EmptyState
                icon={
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={48}
                    color="#9ca3af"
                  />
                }
                title="暂无动态"
                description={
                  circle.isMember
                    ? '成为第一个发帖的人吧'
                    : '加入圈子查看更多动态'
                }
              />
            </View>
          }
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      {/* FAB - only for members */}
      {circle.isMember ? (
        <Pressable
          className="absolute bottom-8 right-5 w-14 h-14 rounded-full bg-rose-500 items-center justify-center"
          style={{
            shadowColor: '#f43f5e',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
          onPress={() => setShowPostModal(true)}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </Pressable>
      ) : null}

      {/* Post creation modal */}
      <Modal
        visible={showPostModal}
        onClose={() => setShowPostModal(false)}
        title="发帖"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TextInput
            className="border border-gray-200 rounded-xl p-3 text-sm text-gray-900 min-h-[120px]"
            placeholder="分享你的想法..."
            placeholderTextColor="#9ca3af"
            multiline
            textAlignVertical="top"
            maxLength={2000}
            value={postContent}
            onChangeText={setPostContent}
          />
          <Text className="text-xs text-gray-400 text-right mt-1">
            {postContent.length}/2000
          </Text>

          {/* Image placeholder slots */}
          <View className="flex-row flex-wrap mt-3" style={{ gap: 8 }}>
            {Array.from({ length: Math.min(9, 1) }).map((_, idx) => (
              <Pressable
                key={`img-slot-${idx}`}
                className="w-16 h-16 rounded-lg bg-gray-100 items-center justify-center border border-dashed border-gray-300"
              >
                <Ionicons name="image-outline" size={24} color="#9ca3af" />
              </Pressable>
            ))}
            <Pressable className="w-16 h-16 rounded-lg bg-gray-50 items-center justify-center border border-dashed border-gray-300">
              <Ionicons name="add" size={24} color="#9ca3af" />
              <Text className="text-[10px] text-gray-400">图片</Text>
            </Pressable>
          </View>

          <View className="mt-4">
            <Button
              title={createPostMut.isPending ? '发布中...' : '发布'}
              variant="primary"
              disabled={
                !postContent.trim() || createPostMut.isPending
              }
              onPress={handleCreatePost}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
