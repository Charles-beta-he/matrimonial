import { useEffect } from 'react';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Avatar, Badge, EmptyState, ListItem } from '@matrimonial/ui';
import { useSocketStore } from '../../stores/useSocketStore';
import { useAnalytics } from '../../hooks/useAnalytics';

// Mock data
const MOCK_MATCHES = [
  { id: 'm1', nickname: '小雪', photo: 'https://picsum.photos/seed/m1/100/100', isOnline: true },
  { id: 'm2', nickname: '子墨', photo: 'https://picsum.photos/seed/m2/100/100', isOnline: false },
  { id: 'm3', nickname: '安安', photo: 'https://picsum.photos/seed/m3/100/100', isOnline: true },
];

interface ConversationItem {
  id: string;
  nickname: string;
  photo: string;
  lastMessage: string;
  time: string;
  unread: number;
  isOnline: boolean;
}

const MOCK_CONVERSATIONS: ConversationItem[] = [
  {
    id: 'c1',
    nickname: '思远',
    photo: 'https://picsum.photos/seed/c1/100/100',
    lastMessage: '周末有空一起去看电影吗？',
    time: '10:32',
    unread: 2,
    isOnline: true,
  },
  {
    id: 'c2',
    nickname: '悦然',
    photo: 'https://picsum.photos/seed/c2/100/100',
    lastMessage: '好的，那我们周六见~',
    time: '昨天',
    unread: 0,
    isOnline: false,
  },
  {
    id: 'c3',
    nickname: '晓晨',
    photo: 'https://picsum.photos/seed/c3/100/100',
    lastMessage: '你也喜欢看书吗？最近在看什么？',
    time: '昨天',
    unread: 1,
    isOnline: false,
  },
  {
    id: 'c4',
    nickname: '佳琪',
    photo: 'https://picsum.photos/seed/c4/100/100',
    lastMessage: '哈哈哈 太有意思了',
    time: '周三',
    unread: 0,
    isOnline: true,
  },
];

/** Messages list */
export default function MessagesTab() {
  const router = useRouter();
  const isUserOnline = useSocketStore((s) => s.isUserOnline);
  // Subscribe to onlineUsers to trigger re-render when presence updates
  useSocketStore((s) => s.onlineUsers);
  const { track } = useAnalytics();

  useEffect(() => {
    track('screen_view', { screen_name: 'messages' });
  }, [track]);

  const renderConversation = ({ item }: { item: ConversationItem }) => (
    <ListItem
      left={
        <Avatar
          source={{ uri: item.photo }}
          size={50}
          online={isUserOnline(item.id) || item.isOnline}
        />
      }
      title={item.nickname}
      subtitle={item.lastMessage}
      right={
        <View className="items-end">
          <Text className="text-xs text-gray-400 mb-1">{item.time}</Text>
          {item.unread > 0 && (
            <View className="bg-rose-500 rounded-full min-w-[20px] h-5 px-1.5 items-center justify-center">
              <Text className="text-white text-xs font-medium">{item.unread}</Text>
            </View>
          )}
        </View>
      }
      onPress={() => router.push(`/chat/${item.id}`)}
    />
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-4 py-3">
        <Text className="text-2xl font-bold text-gray-900">消息</Text>
      </View>

      {/* New matches section */}
      {MOCK_MATCHES.length > 0 && (
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-500 px-4 mb-2">新匹配</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }}
          >
            {MOCK_MATCHES.map((match) => (
              <Pressable
                key={match.id}
                className="items-center"
                onPress={() => router.push(`/discover/${match.id}`)}
              >
                <Avatar
                  source={{ uri: match.photo }}
                  size={64}
                  online={isUserOnline(match.id) || match.isOnline}
                />
                <Text className="text-xs text-gray-700 mt-1">{match.nickname}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Conversation list */}
      {MOCK_CONVERSATIONS.length > 0 ? (
        <FlatList
          data={MOCK_CONVERSATIONS}
          keyExtractor={(item) => item.id}
          renderItem={renderConversation}
          className="flex-1"
        />
      ) : (
        <View className="flex-1 items-center justify-center">
          <EmptyState
            title="暂无消息"
            description="快去发现页面找到心仪的人开始聊天吧"
          />
        </View>
      )}
    </SafeAreaView>
  );
}
