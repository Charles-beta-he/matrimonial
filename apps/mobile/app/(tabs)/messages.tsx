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
import { TabHeader } from '../../components/TabHeader';

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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fdfcfa' }}>
      <TabHeader
        eyebrow="消息 · INBOX"
        title="对话"
        subtitle={
          conversations.length > 0
            ? `${conversations.length} 段在进行中的关系`
            : '在这里继续每一段刚开始的连接'
        }
      />

      {/* New matches section */}
      {newMatches.length > 0 && (
        <View style={{ marginBottom: 18 }}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: '#9ca3af',
              letterSpacing: 1.6,
              paddingHorizontal: 24,
              marginBottom: 12,
            }}
          >
            新匹配 · {newMatches.length}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, gap: 14, alignItems: 'center' }}
          >
            {newMatches.map((match, i) => (
              <StaggeredListItem key={match.id} index={i}>
                <ScalePressable
                  style={{ alignItems: 'center', width: 64 }}
                  onPress={() => router.push(`/discover/${match.id}`)}
                >
                  <View
                    style={{
                      padding: 2,
                      borderRadius: 36,
                      borderWidth: 1.5,
                      borderColor: '#e11d48',
                    }}
                  >
                    <Avatar
                      source={{ uri: match.avatarUrl }}
                      size={56}
                      online={isUserOnline(match.id) || match.isOnline}
                    />
                  </View>
                  <Text
                    style={{ fontSize: 11, color: '#374151', marginTop: 6, fontWeight: '500' }}
                    numberOfLines={1}
                  >
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
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ fontSize: 13, color: '#9ca3af', marginTop: 12 }}>正在加载...</Text>
        </View>
      ) : isError ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
          <EmptyState
            icon={<Ionicons name="cloud-offline-outline" size={36} color="#fb7185" />}
            title="网络出了点小问题"
            description="检查一下网络，再试一次"
            action={{ label: '重试', onPress: () => conversationsQuery.refetch() }}
          />
        </View>
      ) : conversations.length > 0 ? (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConversation}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshing={conversationsQuery.isFetching}
          onRefresh={() => conversationsQuery.refetch()}
        />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <EmptyState
            icon={<Ionicons name="chatbubbles-outline" size={36} color="#fb7185" />}
            title="还没有对话"
            description="去发现页认识新朋友，第一句话可以从一个 prompt 开始"
            action={{
              label: '去发现',
              onPress: () => router.push('/(tabs)'),
            }}
          />
        </View>
      )}
    </SafeAreaView>
    </ChromaTransition>
  );
}
