import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Avatar } from '@matrimonial/ui';
import { api } from '@matrimonial/api-client';
import { useChat } from '../../hooks/useChat';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import { useAppStore } from '../../stores/useAppStore';
import { useSocketStore } from '../../stores/useSocketStore';
import type { ChatMessage } from '../../stores/useChatStore';
import { useAnalytics } from '../../hooks/useAnalytics';

const FALLBACK_AVATAR = 'https://picsum.photos/seed/them/100/100';

/** Chat conversation screen */
export default function ChatConversationScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const router = useRouter();
  const currentUser = useAppStore((s) => s.user);
  const isUserOnline = useSocketStore((s) => s.isUserOnline);
  useSocketStore((s) => s.onlineUsers);
  const { track } = useAnalytics();

  const cid = conversationId ?? '';
  const { messages: liveMessages, typingUsers, emitTyping, markAsRead, otherReadAt } = useChat(cid);

  // Membership gating for read receipts (QUARTERLY+ required)
  const membershipQuery = api.payment.membershipStatus.useQuery();
  const currentPlan = (membershipQuery.data as any)?.plan ?? 'FREE';
  const canSeeReadReceipts = currentPlan === 'QUARTERLY' || currentPlan === 'YEARLY';
  const [inputText, setInputText] = useState('');
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Voice recording
  const {
    isRecording,
    isUploading,
    duration: recordingDuration,
    setRecorderState,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useVoiceRecorder();

  // Upload mutations for voice
  const requestUpload = api.upload.requestUpload.useMutation();
  const confirmUpload = api.upload.confirmUpload.useMutation();

  // History from server
  const historyQuery = api.chat.messages.useQuery(
    { conversationId: cid, limit: 50 },
    { enabled: !!cid },
  );

  // Conversation list (for header info — participant nickname/avatar)
  const conversationsQuery = api.chat.list.useQuery();
  const conversationMeta = useMemo(() => {
    const list = (conversationsQuery.data ?? []) as any[];
    const found = list.find((c) => c.conversationId === cid);
    if (!found) return null;
    const other = found.otherUser ?? {};
    return {
      userId: other?.id ?? '',
      nickname: other?.nickname ?? '聊天',
      avatarUrl: other?.photos?.[0]?.url ?? FALLBACK_AVATAR,
      isOnline: !!other?.isOnline,
    };
  }, [conversationsQuery.data, cid]);

  // Video call
  const startVideoMut = api.video.start1v1.useMutation();
  const handleStartVideoCall = async () => {
    const otherUserId = conversationMeta?.userId;
    if (!otherUserId) return;
    try {
      const room = await startVideoMut.mutateAsync({ targetUserId: otherUserId });
      router.push({ pathname: '/chat/quick-match', params: { roomId: room.roomName, token: room.token } });
    } catch (e: any) {
      Alert.alert('错误', e?.message ?? '无法发起视频通话');
    }
  };

  // Mutations
  const sendMessageMutation = api.chat.sendMessage.useMutation({
    onSuccess: () => {
      historyQuery.refetch();
    },
  });
  const markReadMutation = api.chat.markRead.useMutation();

  // Track chat open + mark read on mount
  useEffect(() => {
    if (!cid) return;
    track('chat_open', { conversation_id: cid });
    markReadMutation.mutate({ conversationId: cid });
  }, [cid]);

  // Merge history + live, dedupe by id
  const allMessages = useMemo<ChatMessage[]>(() => {
    const map = new Map<string, ChatMessage>();
    const historyMessages = (historyQuery.data?.messages ?? []) as any[];
    historyMessages.forEach((m) => {
      map.set(m.id, { ...m, status: 'sent' } as ChatMessage);
    });
    liveMessages.forEach((m) => {
      map.set(m.id, m);
    });
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }, [historyQuery.data, liveMessages]);

  // Emit socket read event when messages change (user is viewing them)
  const prevMessageCountRef = useRef(0);
  useEffect(() => {
    if (!cid || allMessages.length === 0) return;
    const lastMsg = allMessages[allMessages.length - 1];
    if (!lastMsg) return;
    // Emit read receipt for the latest message (covers both initial load and new incoming)
    if (allMessages.length !== prevMessageCountRef.current) {
      prevMessageCountRef.current = allMessages.length;
      markAsRead(lastMsg.id);
      // Also update server-side lastReadAt for incoming messages
      if (lastMsg.senderId !== currentUser?.id) {
        markReadMutation.mutate({ conversationId: cid });
      }
    }
  }, [allMessages.length, cid]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (allMessages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }, [allMessages.length]);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || !cid) return;
    setInputText('');
    try {
      await sendMessageMutation.mutateAsync({
        conversationId: cid,
        type: 'TEXT',
        content: text,
      });
      track('chat_message_send', {
        conversation_id: cid,
        type: 'text',
      });
    } catch (e: any) {
      Alert.alert('发送失败', e?.message ?? '请重试');
      setInputText(text);
    }
  }, [inputText, cid, sendMessageMutation, track]);

  const handleChangeText = useCallback(
    (text: string) => {
      setInputText(text);
      emitTyping();
    },
    [emitTyping],
  );

  // Upload a voice file and return its public URL
  const uploadVoice = useCallback(
    async (uri: string): Promise<string | null> => {
      try {
        const info = await FileSystem.getInfoAsync(uri);
        if (!info.exists) throw new Error('录音文件不存在');
        const filename = uri.split('/').pop() ?? 'voice.m4a';
        const contentType = 'audio/m4a';

        const credential = await requestUpload.mutateAsync({
          category: 'chat' as const,
          filename,
          contentType,
          sizeBytes: (info as any).size ?? 0,
        });

        const uploadResult = await FileSystem.uploadAsync(credential.uploadUrl, uri, {
          httpMethod: 'PUT',
          headers: { 'Content-Type': contentType },
        });

        if (uploadResult.status < 200 || uploadResult.status >= 300) {
          throw new Error(`上传失败 (${uploadResult.status})`);
        }

        await confirmUpload.mutateAsync({
          objectKey: credential.objectKey,
          category: 'chat' as const,
        });

        return credential.publicUrl;
      } catch (err: any) {
        Alert.alert('语音上传失败', err?.message ?? '请重试');
        return null;
      }
    },
    [requestUpload, confirmUpload],
  );

  // Handle voice send: stop recording -> upload -> send message
  const handleVoiceSend = useCallback(async () => {
    setRecorderState('uploading');
    const uri = await stopRecording();
    if (!uri) {
      setRecorderState('idle');
      return;
    }

    const mediaUrl = await uploadVoice(uri);
    setRecorderState('idle');
    if (!mediaUrl || !cid) return;

    try {
      await sendMessageMutation.mutateAsync({
        conversationId: cid,
        type: 'VOICE',
        content: '语音消息',
        mediaUrl,
      });
      track('chat_message_send', { conversation_id: cid, type: 'voice' });
    } catch (e: any) {
      Alert.alert('发送失败', e?.message ?? '请重试');
    }
  }, [cid, stopRecording, uploadVoice, sendMessageMutation, track, setRecorderState]);

  // Play a voice message
  const playAudio = useCallback(async (url?: string) => {
    if (!url) return;
    try {
      // Unload previous sound if any
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });
      const { sound } = await Audio.Sound.createAsync({ uri: url });
      soundRef.current = sound;
      await sound.playAsync();
      // Clean up when done
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
          soundRef.current = null;
        }
      });
    } catch {
      Alert.alert('播放失败', '无法播放语音消息');
    }
  }, []);

  // Clean up sound on unmount
  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isMe = item.senderId === currentUser?.id;
    const timestamp = formatTime(item.createdAt);
    const prev = allMessages[index - 1];
    const showTime = index === 0 || (prev && formatTime(prev.createdAt) !== timestamp);

    return (
      <View className="px-4 mb-2">
        {showTime && (
          <Text className="text-xs text-gray-400 text-center mb-2">{timestamp}</Text>
        )}
        <View className={`flex-row ${isMe ? 'justify-end' : 'justify-start'}`}>
          {!isMe && (
            <Avatar
              source={{ uri: conversationMeta?.avatarUrl ?? FALLBACK_AVATAR }}
              size={36}
              online={
                conversationMeta
                  ? isUserOnline(conversationMeta.userId) || conversationMeta.isOnline
                  : false
              }
            />
          )}
          <View
            className={`max-w-[70%] px-4 py-3 ${
              isMe
                ? 'bg-rose-500 rounded-2xl rounded-tr-sm ml-2'
                : 'bg-gray-100 rounded-2xl rounded-tl-sm ml-2'
            }`}
          >
            {item.type === 'VOICE' ? (
              <Pressable
                className="flex-row items-center"
                onPress={() => playAudio(item.mediaUrl)}
              >
                <Ionicons
                  name="play-circle"
                  size={24}
                  color={isMe ? '#fff' : '#f43f5e'}
                />
                <Text
                  className={`ml-2 text-sm ${isMe ? 'text-white' : 'text-gray-600'}`}
                >
                  语音消息
                </Text>
              </Pressable>
            ) : (
              <Text className={`text-base ${isMe ? 'text-white' : 'text-gray-900'}`}>
                {item.content}
              </Text>
            )}
            {isMe && item.status === 'sending' && (
              <Text className="text-xs text-white/70 mt-1">发送中...</Text>
            )}
            {isMe && item.status === 'failed' && (
              <Text className="text-xs text-yellow-200 mt-1">发送失败</Text>
            )}
          </View>
        </View>
        {isMe && canSeeReadReceipts && otherReadAt && new Date(item.createdAt) <= new Date(otherReadAt) && item.status !== 'sending' && item.status !== 'failed' && (
          <Text className="text-xs text-gray-400 mt-0.5 text-right mr-1">已读</Text>
        )}
      </View>
    );
  };

  const showOnline = conversationMeta
    ? isUserOnline(conversationMeta.userId) || conversationMeta.isOnline
    : false;

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
        <Pressable onPress={() => router.back()} className="mr-3">
          <Ionicons name="chevron-back" size={24} color="#374151" />
        </Pressable>
        <Avatar
          source={{ uri: conversationMeta?.avatarUrl ?? FALLBACK_AVATAR }}
          size={36}
          online={showOnline}
        />
        <View className="ml-3 flex-1">
          <Text className="text-base font-semibold text-gray-900">
            {conversationMeta?.nickname ?? '聊天'}
          </Text>
          <Text className={`text-xs ${showOnline ? 'text-green-500' : 'text-gray-400'}`}>
            {showOnline ? '在线' : '离线'}
          </Text>
        </View>
        <Pressable
          onPress={handleStartVideoCall}
          style={{ marginRight: 4 }}
        >
          <Ionicons name="videocam-outline" size={24} color="#374151" />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Message list */}
        {historyQuery.isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#f43f5e" />
            <Text className="text-sm text-gray-500 mt-2">正在加载消息...</Text>
          </View>
        ) : historyQuery.isError ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-base text-gray-700 mb-2">加载失败</Text>
            <Pressable
              onPress={() => historyQuery.refetch()}
              className="bg-rose-500 rounded-full px-6 py-2 mt-2"
            >
              <Text className="text-white font-medium">重试</Text>
            </Pressable>
          </View>
        ) : allMessages.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <Ionicons name="chatbubbles-outline" size={48} color="#9ca3af" />
            <Text className="text-base text-gray-700 mt-2">还没有消息</Text>
            <Text className="text-sm text-gray-400 mt-1">发送第一条消息打个招呼吧</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={allMessages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={{ paddingVertical: 12 }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {/* Read receipt upsell — shown once at bottom of conversation for FREE users */}
        {!canSeeReadReceipts && allMessages.length > 0 && (
          <Pressable
            onPress={() => router.push('/profile/membership')}
            className="px-4 pb-1 items-end"
          >
            <Text style={{ fontSize: 10, color: '#9CA3AF' }}>升级查看已读</Text>
          </Pressable>
        )}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <View className="px-4 pb-1">
            <Text className="text-xs text-gray-400">对方正在输入...</Text>
          </View>
        )}

        {/* Input bar */}
        {isRecording || isUploading ? (
          /* Recording UI */
          <View className="flex-row items-center px-4 py-3 border-t border-gray-100 bg-red-50" style={{ gap: 8 }}>
            <Pressable
              className="w-10 h-10 items-center justify-center"
              onPress={cancelRecording}
            >
              <Ionicons name="close-circle" size={28} color="#6b7280" />
            </Pressable>
            <View className="flex-1 flex-row items-center justify-center" style={{ gap: 8 }}>
              {isUploading ? (
                <>
                  <ActivityIndicator size="small" color="#f43f5e" />
                  <Text className="text-sm text-gray-600">发送中...</Text>
                </>
              ) : (
                <>
                  <View className="w-3 h-3 rounded-full bg-red-500" />
                  <Text className="text-base font-medium text-red-600">
                    {formatDuration(recordingDuration)}
                  </Text>
                  <Text className="text-sm text-gray-500">录音中</Text>
                </>
              )}
            </View>
            <Pressable
              className="w-10 h-10 bg-rose-500 rounded-full items-center justify-center"
              onPress={handleVoiceSend}
              disabled={isUploading}
            >
              <Ionicons name="arrow-up" size={18} color="#ffffff" />
            </Pressable>
          </View>
        ) : (
          /* Normal input bar */
          <View className="flex-row items-end px-4 py-3 border-t border-gray-100" style={{ gap: 8 }}>
            <Pressable
              className="w-10 h-10 items-center justify-center"
              onPress={startRecording}
            >
              <Ionicons name="mic-outline" size={22} color="#6b7280" />
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
              <Ionicons name="camera-outline" size={22} color="#6b7280" />
            </Pressable>
            {inputText.trim() ? (
              <Pressable
                className="w-10 h-10 bg-rose-500 rounded-full items-center justify-center"
                onPress={handleSend}
                disabled={sendMessageMutation.isPending}
              >
                <Ionicons name="arrow-up" size={18} color="#ffffff" />
              </Pressable>
            ) : null}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
