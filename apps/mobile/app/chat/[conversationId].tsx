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
import { Avatar, EmptyState } from '@matrimonial/ui';
import { api } from '@matrimonial/api-client';
import { useChat } from '../../hooks/useChat';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import { useAppStore } from '../../stores/useAppStore';
import { useSocketStore } from '../../stores/useSocketStore';
import type { ChatMessage } from '../../stores/useChatStore';
import { colors } from '../../constants/colors';
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
                  color={isMe ? colors.white : colors.primary}
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fdfcfa' }}>
      {/* Header */}
      <Animated.View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: '#f1ece3',
            backgroundColor: '#fdfcfa',
          },
          chatHeaderStyle,
        ]}
      >
        <ScalePressable
          onPress={() => router.back()}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: '#ffffff',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: '#eef0f3',
            marginRight: 12,
          }}
        >
          <Ionicons name="chevron-back" size={20} color={colors.gray700} />
        </ScalePressable>
        <Avatar
          source={{ uri: conversationMeta?.avatarUrl ?? FALLBACK_AVATAR }}
          size={40}
          online={showOnline}
        />
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#0b0b0f', letterSpacing: -0.2 }}>
            {conversationMeta?.nickname ?? '聊天'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: showOnline ? '#22c55e' : '#cbd5e1',
              }}
            />
            <Text style={{ fontSize: 11, color: showOnline ? '#16a34a' : '#9ca3af', fontWeight: '500' }}>
              {showOnline ? '在线' : '离线'}
            </Text>
          </View>
        </View>
        <ScalePressable
          onPress={handleStartVideoCall}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: '#ffffff',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: '#eef0f3',
          }}
        >
          <Ionicons name="videocam" size={18} color="#e11d48" />
        </ScalePressable>
      </Animated.View>

      <KeyboardAvoidingView
        style={{ flex: 1, minHeight: 0 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Message list */}
        {historyQuery.isLoading ? (
          <View className="flex-1 pt-4">
            <SkeletonMessage />
            <SkeletonMessage />
          </View>
        ) : historyQuery.isError ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <EmptyState
              icon={<Ionicons name="cloud-offline-outline" size={36} color="#fb7185" />}
              title="对话加载失败"
              description="网络出了点问题，再试一次"
              action={{ label: '重试', onPress: () => historyQuery.refetch() }}
            />
          </View>
        ) : allMessages.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
            <View
              style={{
                width: 84,
                height: 84,
                borderRadius: 42,
                backgroundColor: '#fff1f2',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
              }}
            >
              <Ionicons name="chatbubbles" size={32} color="#e11d48" />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#0b0b0f', marginBottom: 6 }}>
              开启你们的第一句话
            </Text>
            <Text style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', marginBottom: 20, maxWidth: 260 }}>
              不知道说什么？试试下面 AI 帮你想的破冰话题
            </Text>
            {icebreakers.length > 0 ? (
              <View style={{ width: '100%', gap: 8, maxWidth: 320 }}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: '#9ca3af',
                    letterSpacing: 1.4,
                    textAlign: 'center',
                    marginBottom: 4,
                  }}
                >
                  AI 破冰建议
                </Text>
                {icebreakers.slice(0, 3).map((s: string, i: number) => (
                  <ScalePressable
                    key={i}
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: 14,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderWidth: 1,
                      borderColor: '#fde2e6',
                    }}
                    onPress={() => setInputText(s)}
                  >
                    <Text style={{ fontSize: 13, color: '#9f1239', textAlign: 'center', lineHeight: 18 }}>
                      {s}
                    </Text>
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
            style={{ flex: 1, minHeight: 0 }}
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end', paddingVertical: 12 }}
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
            <Text style={{ fontSize: 10, color: colors.gray400 }}>升级查看已读</Text>
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
              <Ionicons name="close-circle" size={28} color={colors.gray500} />
            </ScalePressable>
            <View className="flex-1 flex-row items-center justify-center" style={{ gap: 8 }}>
              {isUploading ? (
                <>
                  <ActivityIndicator size="small" color={colors.primary} />
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
              <Ionicons name="arrow-up" size={18} color={colors.white} />
            </ScalePressable>
          </View>
        ) : (
          /* Normal input bar */
          <>
          {icebreakers.length > 0 && allMessages.length < 5 && !inputText ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ maxHeight: 48, borderTopWidth: 1, borderTopColor: colors.gray50 }}
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
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderTopWidth: 1,
              borderTopColor: '#f1ece3',
              gap: 8,
              backgroundColor: '#fdfcfa',
            }}
          >
            <ScalePressable
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#ffffff',
                borderWidth: 1,
                borderColor: '#eef0f3',
              }}
              onPress={startRecording}
            >
              <Ionicons name="mic-outline" size={20} color="#6b7280" />
            </ScalePressable>
            <View
              style={{
                flex: 1,
                borderRadius: 20,
                maxHeight: 120,
                backgroundColor: '#ffffff',
                borderWidth: 1,
                borderColor: '#eef0f3',
              }}
            >
              <TextInput
                aria-label="消息输入"
                placeholder="说点什么..."
                placeholderTextColor="#b8bcc4"
                value={inputText}
                onChangeText={handleChangeText}
                multiline
                maxLength={500}
                style={{
                  fontSize: 15,
                  color: '#0b0b0f',
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  minHeight: 40,
                  textAlignVertical: 'top',
                  outlineStyle: 'none',
                } as any}
              />
            </View>
            {inputText.trim() ? (
              <AnimatedSendButton key="send-btn">
                <PressScale onPress={handleSend}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: '#e11d48',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: sendMessageMutation.isPending ? 0.5 : 1,
                    }}
                  >
                    <Ionicons name="arrow-up" size={18} color={colors.white} />
                  </View>
                </PressScale>
              </AnimatedSendButton>
            ) : (
              <ScalePressable
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#ffffff',
                  borderWidth: 1,
                  borderColor: '#eef0f3',
                }}
              >
                <Ionicons name="camera-outline" size={20} color="#6b7280" />
              </ScalePressable>
            )}
          </View>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
