import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Avatar } from '@matrimonial/ui';
import { useChat } from '../../hooks/useChat';
import { useAppStore } from '../../stores/useAppStore';
import type { ChatMessage } from '../../stores/useChatStore';
import { useAnalytics } from '../../hooks/useAnalytics';

/** Chat conversation screen */
export default function ChatConversationScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const router = useRouter();
  const currentUser = useAppStore((s) => s.user);
  const { messages, typingUsers, sendMessage, emitTyping } = useChat(conversationId ?? '');
  const [inputText, setInputText] = useState('');
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const { track } = useAnalytics();

  // Track chat open once per conversation
  useEffect(() => {
    if (conversationId) {
      track('chat_open', { conversation_id: conversationId });
    }
  }, [conversationId, track]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }, [messages.length]);

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;
    sendMessage(text);
    track('chat_message_send', {
      conversation_id: conversationId ?? '',
      type: 'text',
    });
    setInputText('');
  }, [inputText, sendMessage, track, conversationId]);

  const handleChangeText = useCallback(
    (text: string) => {
      setInputText(text);
      emitTyping();
    },
    [emitTyping],
  );

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isMe = item.senderId === currentUser?.id;
    const timestamp = formatTime(item.createdAt);
    const prev = messages[index - 1];
    const showTime = index === 0 || (prev && formatTime(prev.createdAt) !== timestamp);

    return (
      <View className="px-4 mb-2">
        {showTime && (
          <Text className="text-xs text-gray-400 text-center mb-2">{timestamp}</Text>
        )}
        <View className={`flex-row ${isMe ? 'justify-end' : 'justify-start'}`}>
          {!isMe && (
            <Avatar
              source={{ uri: 'https://picsum.photos/seed/them/100/100' }}
              size={36}
              online
            />
          )}
          <View
            className={`max-w-[70%] px-4 py-3 ${
              isMe
                ? 'bg-rose-500 rounded-2xl rounded-tr-sm ml-2'
                : 'bg-gray-100 rounded-2xl rounded-tl-sm ml-2'
            }`}
          >
            <Text className={`text-base ${isMe ? 'text-white' : 'text-gray-900'}`}>
              {item.content}
            </Text>
            {isMe && item.status === 'sending' && (
              <Text className="text-xs text-white/70 mt-1">发送中...</Text>
            )}
            {isMe && item.status === 'failed' && (
              <Text className="text-xs text-yellow-200 mt-1">发送失败</Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
        <Pressable onPress={() => router.back()} className="mr-3">
          <Text className="text-lg">&lt;</Text>
        </Pressable>
        <Avatar
          source={{ uri: 'https://picsum.photos/seed/them/100/100' }}
          size={36}
          online
        />
        <View className="ml-3">
          <Text className="text-base font-semibold text-gray-900">思远</Text>
          <Text className="text-xs text-green-500">在线</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Message list */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={{ paddingVertical: 12 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        />

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <View className="px-4 pb-1">
            <Text className="text-xs text-gray-400">对方正在输入...</Text>
          </View>
        )}

        {/* Input bar */}
        <View className="flex-row items-end px-4 py-3 border-t border-gray-100" style={{ gap: 8 }}>
          <Pressable className="w-10 h-10 items-center justify-center">
            <Text className="text-lg">🎤</Text>
          </Pressable>
          <View className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 min-h-[40px] justify-center">
            <TextInput
              className="text-base text-gray-900"
              placeholder="输入消息..."
              placeholderTextColor="#9ca3af"
              value={inputText}
              onChangeText={handleChangeText}
              multiline
              maxLength={500}
            />
          </View>
          <Pressable className="w-10 h-10 items-center justify-center">
            <Text className="text-lg">📷</Text>
          </Pressable>
          {inputText.trim() ? (
            <Pressable
              className="w-10 h-10 bg-rose-500 rounded-full items-center justify-center"
              onPress={handleSend}
            >
              <Text className="text-white font-bold text-sm">↑</Text>
            </Pressable>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
