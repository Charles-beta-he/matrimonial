import { useEffect, useMemo } from 'react';
import { ActivityIndicator, FlatList, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { StaggeredListItem } from '../../components/StaggeredListItem';
import { ScalePressable } from '../../components/ScalePressable';
import { Avatar, EmptyState, ListItem } from '@matrimonial/ui';
import { api } from '@matrimonial/api-client';
import { formatLastActive } from '@matrimonial/shared';
import { useSocketStore } from '../../stores/useSocketStore';
import { useAppStore } from '../../stores/useAppStore';
import { useAnalytics } from '../../hooks/useAnalytics';
import { colors } from '../../constants/colors';
import { ChromaTransition } from '../../components/ChromaTransition';

const FALLBACK_AVATAR = 'https://picsum.photos/seed/avatar/100/100';

function UnreadDot() {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withSpring(1.5, { damping: 6, stiffness: 300 }),
        withSpring(1.0, { damping: 10, stiffness: 200 }),
        withTiming(1.0, { duration: 900 }),
      ),
      -1,
      false,
    );
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View
      style={[{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }, style]}
    />
  );
}

/** Messages list */
export default function MessagesTab() {
  const router = useRouter();
  const isUserOnline = useSocketStore((s) => s.isUserOnline);
  // Subscribe to onlineUsers to trigger re-render when presence updates
  useSocketStore((s) => s.onlineUsers);
  const socket = useSocketStore((s) => s.socket);
  const currentUser = useAppStore((s) => s.user);
  const { track } = useAnalytics();

  const headerOpacity = useSharedValue(0);
  const headerTranslateY = useSharedValue(-20);
  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }));

  const conversationsQuery = api.chat.list.useQuery(undefined, {
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const matchesQuery = api.match.matches.useQuery(undefined, {
    refetchOnWindowFocus: true,
  });

  // Push-driven refetch: socket new_message event replaces tight polling
  useEffect(() => {
    if (!socket) return;
    const refetch = () => { void conversationsQuery.refetch(); };
    socket.on('new_message', refetch);
    socket.on('chat:message', refetch);
    return () => {
      socket.off('new_message', refetch);
      socket.off('chat:message', refetch);
    };
  }, [socket, conversationsQuery]);

  useEffect(() => {
    track('screen_view', { screen_name: 'messages' });
    const cfg = { duration: 400, easing: Easing.out(Easing.cubic) };
    headerOpacity.value = withTiming(1, cfg);
    headerTranslateY.value = withTiming(0, cfg);
  }, [track, headerOpacity, headerTranslateY]);

  // Normalize conversations from server shape
  const conversations = useMemo(() => {
    const list = conversationsQuery.data ?? [];
    return list.map((c: any) => {
      const other = c.otherUser ?? {};
      const avatarUrl: string =
        other?.photos?.[0]?.url ?? other?.avatarUrl ?? FALLBACK_AVATAR;
      const lastMsg = c.lastMessage;
      const lastContent: string = lastMsg
        ? lastMsg.type === 'TEXT'
          ? (lastMsg.content ?? '')
          : lastMsg.type === 'IMAGE'
          ? '[图片]'
          : lastMsg.type === 'VOICE'
          ? '[语音]'
          : lastMsg.type === 'VIDEO'
          ? '[视频]'
          : '[消息]'
        : '打个招呼吧';
      const lastAt: string = lastMsg?.createdAt ?? c.lastMessageAt ?? '';
      const isUnread = !!(
        lastMsg &&
        lastMsg.senderId !== currentUser?.id &&
        (!c.lastReadAt || new Date(lastMsg.createdAt) > new Date(c.lastReadAt))
      );
      return {
        id: c.conversationId,
        userId: other?.id ?? '',
        nickname: other?.nickname ?? '未知用户',
        avatarUrl,
        isOnline: !!other?.isOnline,
        lastContent,
        lastAt,
        isUnread,
      };
    });
  }, [conversationsQuery.data]);

  // Build "new matches" strip — matched users without a conversation yet
  const newMatches = useMemo(() => {
    const matches = matchesQuery.data ?? [];
    const conversationUserIds = new Set(
      conversations.map((c) => c.userId).filter(Boolean),
    );
    const seen = new Set<string>();
    const result: Array<{
      id: string;
      nickname: string;
      avatarUrl: string;
      isOnline: boolean;
    }> = [];
    for (const like of matches as any[]) {
      const other =
        like.fromUserId === currentUser?.id ? like.toUser : like.fromUser;
      if (!other || seen.has(other.id)) continue;
      if (conversationUserIds.has(other.id)) continue;
      seen.add(other.id);
      result.push({
        id: other.id,
        nickname: other.nickname ?? '匿名',
        avatarUrl: other.photos?.[0]?.url ?? FALLBACK_AVATAR,
        isOnline: !!other.isOnline,
      });
    }
    return result;
  }, [matchesQuery.data, conversations, currentUser?.id]);

  const renderConversation = ({ item, index }: { item: (typeof conversations)[number]; index: number }) => (
    <StaggeredListItem index={index}>
      <ListItem
        left={
          <Avatar
            source={{ uri: item.avatarUrl }}
            size={50}
            online={isUserOnline(item.userId) || item.isOnline}
          />
        }
        title={item.nickname}
        subtitle={item.lastContent}
        right={
          <View className="items-end">
            <Text className="text-xs text-gray-400 mb-1">
              {item.lastAt ? formatLastActive(item.lastAt) : ''}
            </Text>
            {item.isUnread && <UnreadDot />}
          </View>
        }
        onPress={() => router.push(`/chat/${item.id}`)}
      />
    </StaggeredListItem>
  );

  const isLoading = conversationsQuery.isLoading;
  const isError = conversationsQuery.isError;

  return (
    <ChromaTransition>
    <SafeAreaView className="flex-1 bg-white">
      <Animated.View style={[{ paddingHorizontal: 16, paddingVertical: 12 }, headerStyle]}>
        <Text className="text-2xl font-bold text-gray-900">消息</Text>
      </Animated.View>

      {/* New matches section */}
      {newMatches.length > 0 && (
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-500 px-4 mb-2">新匹配</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ height: 90 }}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 16, alignItems: 'center' }}
          >
            {newMatches.map((match, i) => (
              <StaggeredListItem key={match.id} index={i} style={{ alignItems: 'center' }}>
                <ScalePressable
                  className="items-center"
                  onPress={() => router.push(`/discover/${match.id}`)}
                >
                  <Avatar
                    source={{ uri: match.avatarUrl }}
                    size={64}
                    online={isUserOnline(match.id) || match.isOnline}
                  />
                  <Text className="text-xs text-gray-700 mt-1" numberOfLines={1}>
                    {match.nickname}
                  </Text>
                </ScalePressable>
              </StaggeredListItem>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Conversation list */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="text-sm text-gray-500 mt-2">正在加载...</Text>
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-base text-gray-700 mb-2">加载失败</Text>
          <Text className="text-sm text-gray-400 mb-4 text-center">
            网络出了点小问题，请稍后重试
          </Text>
          <ScalePressable
            onPress={() => conversationsQuery.refetch()}
            className="bg-rose-500 rounded-full px-6 py-2"
          >
            <Text className="text-white font-medium">重试</Text>
          </ScalePressable>
        </View>
      ) : conversations.length > 0 ? (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConversation}
          className="flex-1"
          refreshing={conversationsQuery.isFetching}
          onRefresh={() => conversationsQuery.refetch()}
        />
      ) : (
        <View className="flex-1 items-center justify-center">
          <EmptyState
            icon={<Ionicons name="chatbubbles-outline" size={56} color={colors.gray400} />}
            title="还没有消息"
            description="去发现页匹配新朋友吧"
            action={{
              label: '去匹配',
              onPress: () => router.push('/(tabs)'),
            }}
          />
        </View>
      )}
    </SafeAreaView>
    </ChromaTransition>
  );
}
