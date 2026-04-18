import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
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
import { AnimatedMessageBubble } from '../../components/AnimatedMessageBubble';
import { AnimatedTypingIndicator } from '../../components/AnimatedTypingIndicator';
import { SkeletonMessage } from '../../components/SkeletonLoader';
import { PressScale } from '../../components/PressScale';
import { ScalePressable } from '../../components/ScalePressable';

const FALLBACK_AVATAR = 'https://picsum.photos/seed/them/100/100';

function AnimatedSendButton({ children }: { children: React.ReactNode }) {
  const scale = useSharedValue(0);
  useEffect(() => {
    scale.value = withSpring(1, { damping: 8, stiffness: 300 });
  }, []);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}

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
  const [isFocused, setIsFocused] = useState(false);
  const focusProgress = useSharedValue(0);
  const inputAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(focusProgress.value, [0, 1], ['#f3f4f6', '#fff5f5']),
    borderColor: interpolateColor(focusProgress.value, [0, 1], ['transparent', '#f43f5e']),
  }));

  const chatHeaderOpacity = useSharedValue(0);
  const chatHeaderY = useSharedValue(-12);
  const chatHeaderStyle = useAnimatedStyle(() => ({
    opacity: chatHeaderOpacity.value,
    transform: [{ translateY: chatHeaderY.value }],
  }));
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

  // Icebreakers for new conversations (shown when < 5 messages exist)
  const otherUserId = conversationMeta?.userId ?? '';
  const { data: icebreakersData } = api.ai.icebreakers.useQuery(
    { targetUserId: otherUserId },
    { enabled: !!otherUserId, staleTime: Infinity },
  );
  const icebreakers = icebreakersData?.suggestions ?? [];

  // Mutations
  const sendMessageMutation = api.chat.sendMessage.useMutation({
    onSuccess: () => {
      historyQuery.refetch();
    },
  });
  const markReadMutation = api.chat.markRead.useMutation();

  // Track chat open + mark read on mount + header entrance
  useEffect(() => {
    if (!cid) return;
    track('chat_open', { conversation_id: cid });
    markReadMutation.mutate({ conversationId: cid });
    const e = Easing.out(Easing.cubic);
    chatHeaderOpacity.value = withTiming(1, { duration: 300, easing: e });
    chatHeaderY.value = withTiming(0, { duration: 300, easing: e });
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

  // Track the count of messages present on initial load to drive entrance animations
  const initialMessageCountRef = useRef<number | null>(null);

  // Set the initial count once history finishes loading so we know which messages are "new"
  useEffect(() => {
    if (!historyQuery.isLoading && initialMessageCountRef.current === null && allMessages.length > 0) {
      // Animate the last 8 messages on first render (staggered entrance)
      initialMessageCountRef.current = Math.max(0, allMessages.length - 8);
    }
  }, [historyQuery.isLoading, allMessages.length]);

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
    const isNew = initialMessageCountRef.current !== null && index >= initialMessageCountRef.current;

    return (
      <View className="px-4 mb-2">
        {showTime && (
          <Text className="text-xs text-gray-400 text-center mb-2">{timestamp}</Text>
        )}
        <AnimatedMessageBubble isOwn={isMe} index={index} isNew={isNew}>
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
              <ScalePressable
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
              </ScalePressable>
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
        </AnimatedMessageBubble>
      </View>
    );
  };

  const showOnline = conversationMeta
    ? isUserOnline(conversationMeta.userId) || conversationMeta.isOnline
    : false;

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <Animated.View className="px-4 py-3 border-b border-gray-100" style={[{ flexDirection: 'row', alignItems: 'center' }, chatHeaderStyle]}>
        <ScalePressable onPress={() => router.back()} className="mr-3">
          <Ionicons name="chevron-back" size={24} color="#374151" />
        </ScalePressable>
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
        <ScalePressable
          onPress={handleStartVideoCall}
          style={{ marginRight: 4 }}
        >
          <Ionicons name="videocam-outline" size={24} color="#374151" />
        </ScalePressable>
      </Animated.View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Message list */}
        {historyQuery.isLoading ? (
          <View className="flex-1 pt-4">
            <SkeletonMessage />
            <SkeletonMessage />
          </View>
        ) : historyQuery.isError ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-base text-gray-700 mb-2">加载失败</Text>
            <ScalePressable
              onPress={() => historyQuery.refetch()}
              className="bg-rose-500 rounded-full px-6 py-2 mt-2"
            >
              <Text className="text-white font-medium">重试</Text>
            </ScalePressable>
          </View>
        ) : allMessages.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <Ionicons name="chatbubbles-outline" size={48} color="#9ca3af" />
            <Text className="text-base text-gray-700 mt-2">还没有消息</Text>
            <Text className="text-sm text-gray-400 mt-1">发送第一条消息打个招呼吧</Text>
            {icebreakers.length > 0 ? (
              <View className="mt-6 w-full" style={{ gap: 8 }}>
                <Text className="text-xs text-gray-400 text-center">✨ AI 破冰建议</Text>
                {icebreakers.slice(0, 3).map((s: string, i: number) => (
                  <ScalePressable
                    key={i}
                    className="bg-rose-50 rounded-xl px-4 py-3"
                    onPress={() => setInputText(s)}
                  >
                    <Text className="text-sm text-rose-700 text-center">{s}</Text>
                  </ScalePressable>
                ))}
              </View>
            ) : null}
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
          <ScalePressable
            onPress={() => router.push('/profile/membership')}
            className="px-4 pb-1 items-end"
          >
            <Text style={{ fontSize: 10, color: '#9CA3AF' }}>升级查看已读</Text>
          </ScalePressable>
        )}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <View className="px-4 pb-2 flex-row items-center" style={{ gap: 8 }}>
            <AnimatedTypingIndicator />
            <Text className="text-xs text-gray-400">对方正在输入...</Text>
          </View>
        )}

        {/* Input bar */}
        {isRecording || isUploading ? (
          /* Recording UI */
          <View className="flex-row items-center px-4 py-3 border-t border-gray-100 bg-red-50" style={{ gap: 8 }}>
            <ScalePressable
              className="w-10 h-10 items-center justify-center"
              onPress={cancelRecording}
            >
              <Ionicons name="close-circle" size={28} color="#6b7280" />
            </ScalePressable>
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
            <ScalePressable
              className="w-10 h-10 bg-rose-500 rounded-full items-center justify-center"
              onPress={handleVoiceSend}
              disabled={isUploading}
            >
              <Ionicons name="arrow-up" size={18} color="#ffffff" />
            </ScalePressable>
          </View>
        ) : (
          /* Normal input bar */
          <>
          {icebreakers.length > 0 && allMessages.length < 5 && !inputText ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ height: 48, borderTopWidth: 1, borderTopColor: '#f9fafb' }}
              contentContainerStyle={{ paddingHorizontal: 12, alignItems: 'center', gap: 8 }}
            >
              {icebreakers.slice(0, 3).map((s: string, i: number) => (
                <ScalePressable
                  key={i}
                  style={{ alignSelf: 'center' }}
                  className="bg-rose-50 rounded-full px-3 py-1.5"
                  onPress={() => setInputText(s)}
                >
                  <Text className="text-xs text-rose-600">{s}</Text>
                </ScalePressable>
              ))}
            </ScrollView>
          ) : null}
          <View className="flex-row items-end px-4 py-3 border-t border-gray-100" style={{ gap: 8 }}>
            <ScalePressable
              className="w-10 h-10 items-center justify-center"
              onPress={startRecording}
            >
              <Ionicons name="mic-outline" size={22} color="#6b7280" />
            </ScalePressable>
            <Animated.View
              style={[inputAnimatedStyle, { borderWidth: 1.5, flex: 1, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, minHeight: 40, justifyContent: 'center' }]}
            >
              <TextInput
                aria-label="消息输入"
                className="text-base text-gray-900"
                placeholder="输入消息..."
                placeholderTextColor="#9ca3af"
                value={inputText}
                onChangeText={handleChangeText}
                multiline
                maxLength={500}
                onFocus={() => { setIsFocused(true); focusProgress.value = withTiming(1, { duration: 200 }); }}
                onBlur={() => { setIsFocused(false); focusProgress.value = withTiming(0, { duration: 200 }); }}
              />
            </Animated.View>
            <ScalePressable className="w-10 h-10 items-center justify-center">
              <Ionicons name="camera-outline" size={22} color="#6b7280" />
            </ScalePressable>
            {inputText.trim() ? (
              <AnimatedSendButton key="send-btn">
                <PressScale onPress={handleSend}>
                  <View
                    className="w-10 h-10 bg-rose-500 rounded-full items-center justify-center"
                    style={sendMessageMutation.isPending ? { opacity: 0.5 } : undefined}
                  >
                    <Ionicons name="arrow-up" size={18} color="#ffffff" />
                  </View>
                </PressScale>
              </AnimatedSendButton>
            ) : null}
          </View>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
