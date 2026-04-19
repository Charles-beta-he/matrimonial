import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
    ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Avatar, Badge, Button, Card, EmptyState, toast } from '@matrimonial/ui';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@matrimonial/api-client';
import { BUDDY_TYPES, BUDDY_TYPE_COLORS, type BuddyType } from '@matrimonial/shared';
import { ScalePressable } from '../../../components/ScalePressable';
import { StaggeredListItem } from '../../../components/StaggeredListItem';
import { colors } from '../../../constants/colors';
import { ScreenHeader } from '../../../components/ScreenHeader';

const FALLBACK_AVATAR = 'https://picsum.photos/seed/buddy/100/100';

function getBuddyTypeInfo(type: string) {
  const found = BUDDY_TYPES.find((t) => t.id === type);
  return {
    label: found?.label ?? type,
    icon: (found?.icon ?? 'ellipsis-horizontal-outline') as keyof typeof Ionicons.glyphMap,
    color: BUDDY_TYPE_COLORS[type as BuddyType] ?? colors.gray500,
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

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  OPEN: { label: '招募中', color: colors.success, bg: colors.successBg },
  FULL: { label: '已满员', color: colors.orange, bg: colors.orangeBg },
  CLOSED: { label: '已关闭', color: colors.gray500, bg: colors.gray100 },
};

export default function BuddyPostDetailScreen() {
  const router = useRouter();
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const [applyMessage, setApplyMessage] = useState('');
  const [showApplyInput, setShowApplyInput] = useState(false);

  const { data: myPostsData } = api.buddy.myPosts.useQuery(undefined, { enabled: !!postId });

  // Check ownership via myPosts (client-side, no extra RTT)
  const isOwner = !!(myPostsData?.find((p: any) => p.id === postId));

  const { data: post, isLoading, refetch } = api.buddy.detail.useQuery(postId!, {
    enabled: !!postId,
  });

  const applyMut = api.buddy.applyPost.useMutation({
    onSuccess: () => {
      toast.success('报名成功！等待发布者确认');
      setShowApplyInput(false);
      setApplyMessage('');
      refetch();
    },
    onError: (e: any) => {
      toast.error(e?.message ?? '报名失败');
    },
  });

  const handleApplyMut = api.buddy.handleApply.useMutation({
    onSuccess: (_data: any, variables: any) => {
      toast.success(variables.action === 'ACCEPTED' ? '已接受' : '已拒绝');
      refetch();
    },
    onError: (e: any) => {
      toast.error(e?.message ?? '操作失败');
    },
  });

  const handleApply = () => {
    if (!postId) return;
    applyMut.mutate({
      postId,
      message: applyMessage.trim() || undefined,
    });
  };

  const handleAcceptReject = (applyId: string, action: 'ACCEPTED' | 'REJECTED') => {
    Alert.alert(
      action === 'ACCEPTED' ? '接受报名' : '拒绝报名',
      action === 'ACCEPTED' ? '确认接受该用户的报名？' : '确认拒绝该用户的报名？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认',
          onPress: () => handleApplyMut.mutate({ applyId, action }),
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <ScreenHeader title="帖子详情" />
        <View className="flex-1 items-center justify-center">
          <EmptyState
            icon={<Ionicons name="document-outline" size={56} color={colors.gray400} />}
            title="帖子不存在"
            description="该帖子可能已被删除"
            action={{ label: '返回', onPress: () => router.back() }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const typeInfo = getBuddyTypeInfo(post.type);
  const timeText = formatScheduledTime(post.scheduledAt);
  const applyCount = isOwner
    ? (post.applies?.length ?? 0)
    : (post._count?.applies ?? 0);
  const statusConf = STATUS_CONFIG[post.status] ?? STATUS_CONFIG.OPEN;
  const applicants = isOwner ? (post.applies ?? []) : [];

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScreenHeader
        title="帖子详情"
        right={
          <View className="rounded-full px-3 py-1" style={{ backgroundColor: statusConf.bg }}>
            <Text className="text-xs font-medium" style={{ color: statusConf.color }}>
              {statusConf.label}
            </Text>
          </View>
        }
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: showApplyInput ? 200 : 100 }}
      >
        {/* Main content card */}
        <StaggeredListItem index={0}>
        <Card className="mx-4 mt-4">
          <View className="p-4">
            {/* Type badge */}
            <View className="flex-row items-center mb-3" style={{ gap: 8 }}>
              <View
                className="flex-row items-center rounded-full px-2.5 py-1"
                style={{ backgroundColor: typeInfo.color + '18' }}
              >
                <Ionicons name={typeInfo.icon} size={14} color={typeInfo.color} />
                <Text
                  className="text-xs font-medium ml-1"
                  style={{ color: typeInfo.color }}
                >
                  {typeInfo.label}
                </Text>
              </View>
            </View>

            {/* Title */}
            <Text className="text-lg font-bold text-gray-900 mb-3">{post.title}</Text>

            {/* Description */}
            <Text className="text-base text-gray-600 leading-6 mb-4">
              {post.description}
            </Text>

            {/* Meta info */}
            <View style={{ gap: 8 }}>
              {post.location ? (
                <View className="flex-row items-center" style={{ gap: 6 }}>
                  <Ionicons name="location-outline" size={16} color={colors.gray500} />
                  <Text className="text-sm text-gray-500">{post.location}</Text>
                </View>
              ) : null}
              {timeText ? (
                <View className="flex-row items-center" style={{ gap: 6 }}>
                  <Ionicons name="time-outline" size={16} color={colors.gray500} />
                  <Text className="text-sm text-gray-500">{timeText}</Text>
                </View>
              ) : null}
              <View className="flex-row items-center" style={{ gap: 6 }}>
                <Ionicons name="people-outline" size={16} color={colors.gray500} />
                <Text className="text-sm text-gray-500">
                  已有{applyCount}人报名
                  {post.maxPeople ? ` / 共${post.maxPeople}人` : ''}
                </Text>
              </View>
            </View>
          </View>
        </Card>
        </StaggeredListItem>

        {/* Author card */}
        {post.author ? (
          <StaggeredListItem index={1}>
          <Card className="mx-4 mt-3">
            <ScalePressable
              className="p-4 flex-row items-center"
              style={{ gap: 12 }}
              onPress={() => router.push(`/profile/${post.author.id}` as any)}
            >
              <Avatar
                source={
                  (post.author as any).photos?.[0]?.url
                    ? { uri: (post.author as any).photos[0].url }
                    : { uri: FALLBACK_AVATAR }
                }
                size={48}
              />
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900">
                  {post.author.nickname}
                </Text>
                <View className="flex-row items-center mt-1" style={{ gap: 8 }}>
                  {(post.author as any).city ? (
                    <Text className="text-sm text-gray-400">{(post.author as any).city}</Text>
                  ) : null}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.gray300} />
            </ScalePressable>
          </Card>
          </StaggeredListItem>
        ) : null}

        {/* Applicant list (owner only) */}
        {isOwner && applicants.length > 0 ? (
          <StaggeredListItem index={2}>
          <View className="mx-4 mt-4">
            <Text className="text-base font-semibold text-gray-900 mb-3">
              报名列表 ({applicants.length})
            </Text>
            {applicants.map((apply: any, idx: number) => (
              <StaggeredListItem key={apply.id} index={idx + 3}>
              <Card className="mb-2">
                <View className="p-3 flex-row items-center" style={{ gap: 10 }}>
                  <Avatar
                    source={
                      apply.user?.avatar
                        ? { uri: apply.user.avatar }
                        : { uri: FALLBACK_AVATAR }
                    }
                    size={40}
                  />
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-gray-900">
                      {apply.user?.nickname ?? '匿名用户'}
                    </Text>
                    {apply.message ? (
                      <Text className="text-xs text-gray-400 mt-0.5" numberOfLines={1}>
                        {apply.message}
                      </Text>
                    ) : null}
                  </View>
                  {apply.status === 'PENDING' ? (
                    <View className="flex-row" style={{ gap: 6 }}>
                      <ScalePressable
                        className="bg-green-50 rounded-full px-3 py-1.5"
                        onPress={() => handleAcceptReject(apply.id, 'ACCEPTED')}
                      >
                        <Text className="text-xs font-medium text-green-600">接受</Text>
                      </ScalePressable>
                      <ScalePressable
                        className="bg-gray-100 rounded-full px-3 py-1.5"
                        onPress={() => handleAcceptReject(apply.id, 'REJECTED')}
                      >
                        <Text className="text-xs font-medium text-gray-500">拒绝</Text>
                      </ScalePressable>
                    </View>
                  ) : (
                    <Badge
                      label={apply.status === 'ACCEPTED' ? '已接受' : '已拒绝'}
                      variant="tag"
                      color={apply.status === 'ACCEPTED' ? colors.successLight : colors.errorLight}
                    />
                  )}
                </View>
              </Card>
              </StaggeredListItem>
            ))}
          </View>
          </StaggeredListItem>
        ) : null}

        {isOwner && applicants.length === 0 ? (
          <View className="mx-4 mt-4 items-center py-6">
            <Ionicons name="hourglass-outline" size={32} color={colors.gray300} />
            <Text className="text-sm text-gray-400 mt-2">暂无报名，耐心等待吧</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Bottom action bar (non-owner) */}
      {!isOwner ? (
        <View className="bg-white border-t border-gray-100 px-4 py-3">
          {showApplyInput ? (
            <View style={{ gap: 8 }}>
              <TextInput
                aria-label="申请留言"
                className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900"
                placeholder="写一句打招呼的话（选填）"
                placeholderTextColor={colors.gray400}
                value={applyMessage}
                onChangeText={setApplyMessage}
                maxLength={100}
              />
              <View className="flex-row" style={{ gap: 8 }}>
                <View className="flex-1">
                  <Button
                    title="取消"
                    variant="secondary"
                    size="md"
                    fullWidth
                    onPress={() => {
                      setShowApplyInput(false);
                      setApplyMessage('');
                    }}
                  />
                </View>
                <View className="flex-1">
                  <Button
                    title="确认报名"
                    variant="primary"
                    size="md"
                    fullWidth
                    loading={applyMut.isPending}
                    onPress={handleApply}
                  />
                </View>
              </View>
            </View>
          ) : (
            <Button
              title={post.status === 'OPEN' ? '我要参加' : '报名已关闭'}
              variant="primary"
              size="lg"
              fullWidth
              disabled={post.status !== 'OPEN'}
              onPress={() => setShowApplyInput(true)}
            />
          )}
        </View>
      ) : null}
    </SafeAreaView>
  );
}
