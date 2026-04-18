import { useEffect, useRef, useState, useCallback } from 'react';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { Alert, Text, View } from 'react-native';
import { ScalePressable } from '../../components/ScalePressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuickMatch, useLeaveQuickMatch, useQuickMatchStatus } from '@matrimonial/api-client';

type CallState = 'idle' | 'matching' | 'matched' | 'in_call' | 'ended';

function PulsingRing({ baseSize, color, delay }: { baseSize: number; color: string; delay: number }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.55);
  useEffect(() => {
    const cfg = { duration: 1600, easing: Easing.out(Easing.cubic) };
    scale.value = withDelay(delay, withRepeat(withTiming(1.55, cfg), -1, false));
    opacity.value = withDelay(delay, withRepeat(withTiming(0, cfg), -1, false));
  }, []);
  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    width: baseSize,
    height: baseSize,
    borderRadius: baseSize / 2,
    borderWidth: 2,
    borderColor: color,
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
  return <Animated.View pointerEvents="none" style={style} />;
}

function AnimatedMatchingDots() {
  const PERIOD = 560;
  const d1 = useSharedValue(0.35);
  const d2 = useSharedValue(0.35);
  const d3 = useSharedValue(0.35);
  useEffect(() => {
    const pulse = (sv: typeof d1, delay: number) => {
      sv.value = withDelay(delay, withRepeat(
        withSequence(
          withTiming(1, { duration: PERIOD * 0.45 }),
          withTiming(0.35, { duration: PERIOD * 0.55 }),
        ),
        -1, false,
      ));
    };
    pulse(d1, 0);
    pulse(d2, PERIOD / 3);
    pulse(d3, (PERIOD * 2) / 3);
  }, []);
  const s1 = useAnimatedStyle(() => ({ opacity: d1.value }));
  const s2 = useAnimatedStyle(() => ({ opacity: d2.value }));
  const s3 = useAnimatedStyle(() => ({ opacity: d3.value }));
  const dotBase = { width: 12, height: 12, borderRadius: 6, backgroundColor: '#f43f5e' } as const;
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 32 }}>
      <Animated.View style={[dotBase, s1]} />
      <Animated.View style={[dotBase, s2]} />
      <Animated.View style={[dotBase, s3]} />
    </View>
  );
}

function MatchedEntrance({ children }: { children: React.ReactNode }) {
  const scale = useSharedValue(0.6);
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 260 });
    scale.value = withSpring(1, { damping: 9, stiffness: 220 });
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
    alignItems: 'center',
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

export default function QuickMatchScreen() {
  const router = useRouter();
  const [callState, setCallState] = useState<CallState>('idle');
  const [timeLeft, setTimeLeft] = useState(180);
  const [partnerName, setPartnerName] = useState('');
  const [roomInfo, setRoomInfo] = useState<{
    roomName: string;
    token: string;
    wsUrl: string;
  } | null>(null);

  const quickMatch = useQuickMatch();
  const leaveQuickMatch = useLeaveQuickMatch();
  const statusQuery = useQuickMatchStatus(callState === 'matching');

  const headerOpacity = useSharedValue(0);
  const headerY = useSharedValue(-14);
  useEffect(() => {
    const e = Easing.out(Easing.cubic);
    headerOpacity.value = withTiming(1, { duration: 320, easing: e });
    headerY.value = withTiming(0, { duration: 320, easing: e });
  }, []);
  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerY.value }],
  }));

  const timerScale = useSharedValue(1);
  useEffect(() => {
    if (timeLeft === 180) return;
    const urgent = timeLeft <= 30;
    timerScale.value = withSequence(
      withTiming(urgent ? 1.14 : 1.05, { duration: 65 }),
      withSpring(1, { damping: urgent ? 7 : 10, stiffness: 220 }),
    );
  }, [timeLeft]);
  const timerAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: timerScale.value }],
  }));

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll for match while queued
  useEffect(() => {
    if (callState !== 'matching') return;

    pollRef.current = setInterval(async () => {
      try {
        const result = await quickMatch.mutateAsync();
        if (result.status === 'matched') {
          setPartnerName(result.partner.nickname);
          setRoomInfo({
            roomName: result.room.roomName,
            token: result.myToken,
            wsUrl: result.wsUrl,
          });
          setCallState('matched');
          // Auto-transition to in_call after brief display
          setTimeout(() => setCallState('in_call'), 2000);
        }
      } catch {
        // Ignore poll errors
      }
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [callState]);

  // 3-minute countdown timer
  useEffect(() => {
    if (callState !== 'in_call') return;
    setTimeLeft(180);
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          setCallState('ended');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [callState]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStartMatch = useCallback(async () => {
    try {
      const result = await quickMatch.mutateAsync();
      if (result.status === 'matched') {
        setPartnerName(result.partner.nickname);
        setRoomInfo({
          roomName: result.room.roomName,
          token: result.myToken,
          wsUrl: result.wsUrl,
        });
        setCallState('matched');
        setTimeout(() => setCallState('in_call'), 2000);
      } else {
        setCallState('matching');
      }
    } catch (e: any) {
      Alert.alert('匹配失败', e?.message ?? '未知错误');
    }
  }, []);

  const handleCancel = useCallback(async () => {
    if (pollRef.current) clearInterval(pollRef.current);
    await leaveQuickMatch.mutateAsync().catch(() => {});
    setCallState('idle');
  }, []);

  const handleEnd = useCallback(() => {
    setCallState('idle');
    setTimeLeft(180);
    setRoomInfo(null);
    setPartnerName('');
  }, []);

  const handleNavigateToCall = useCallback(() => {
    if (!roomInfo) return;
    router.push({
      pathname: '/chat/video-call',
      params: {
        roomName: roomInfo.roomName,
        token: roomInfo.token,
        wsUrl: roomInfo.wsUrl,
        userName: partnerName,
      },
    });
  }, [roomInfo, partnerName]);

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <Animated.View className="px-4 py-3 bg-white border-b border-gray-100" style={[{ flexDirection: 'row', alignItems: 'center' }, headerStyle]}>
        <ScalePressable onPress={() => router.back()} className="mr-3">
          <Ionicons name="chevron-back" size={24} color="#374151" />
        </ScalePressable>
        <Text className="text-xl font-bold text-gray-900">视频速配</Text>
      </Animated.View>

      <View className="flex-1 items-center justify-center px-8">
        {/* Idle state — start button */}
        {callState === 'idle' && (
          <>
            <View style={{ width: 176, height: 176, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
              <PulsingRing baseSize={176} color="#f43f5e" delay={0} />
              <PulsingRing baseSize={176} color="#f43f5e" delay={700} />
              <View className="w-44 h-44 rounded-full bg-rose-100 items-center justify-center">
                <Ionicons name="flash-outline" size={80} color="#f43f5e" />
              </View>
            </View>
            <Text className="text-xl font-bold text-gray-900 mb-2">3分钟视频速配</Text>
            <Text className="text-sm text-gray-500 text-center mb-2">
              随机匹配异性，3分钟快速了解
            </Text>
            <Text className="text-xs text-gray-400 text-center mb-8">
              需要完成L2+身份认证
            </Text>
            <ScalePressable
              onPress={handleStartMatch}
              disabled={quickMatch.isPending}
              className="bg-rose-500 rounded-full px-16 py-4 shadow-lg"
            >
              <Text className="text-white text-lg font-bold">
                {quickMatch.isPending ? '匹配中...' : '开始匹配'}
              </Text>
            </ScalePressable>
          </>
        )}

        {/* Matching state — waiting in queue */}
        {callState === 'matching' && (
          <>
            <View className="w-44 h-44 rounded-full bg-rose-50 items-center justify-center mb-6 border-4 border-rose-300">
              <Ionicons name="search-outline" size={72} color="#f43f5e" />
            </View>
            <Text className="text-xl font-bold text-gray-900 mb-2">正在匹配中...</Text>
            <Text className="text-sm text-gray-500 text-center mb-2">
              正在寻找合适的对象
            </Text>
            {statusQuery.data?.inQueue && (
              <Text className="text-xs text-rose-500 mb-6">
                排队位置: 第 {statusQuery.data.position} 位
              </Text>
            )}
            <AnimatedMatchingDots />
            <ScalePressable
              onPress={handleCancel}
              className="border-2 border-gray-300 rounded-full px-12 py-3"
            >
              <Text className="text-gray-600 text-base font-medium">取消匹配</Text>
            </ScalePressable>
          </>
        )}

        {/* Matched state — brief display before call */}
        {callState === 'matched' && (
          <MatchedEntrance>
            <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
              <PulsingRing baseSize={176} color="#22c55e" delay={0} />
              <View className="w-44 h-44 rounded-full bg-green-100 items-center justify-center">
                <Ionicons name="checkmark-circle-outline" size={80} color="#22c55e" />
              </View>
            </View>
            <Text className="text-xl font-bold text-gray-900 mb-2">匹配成功!</Text>
            <Text className="text-base text-rose-500 font-semibold mb-4">
              {partnerName}
            </Text>
            <Text className="text-sm text-gray-500">正在连接视频通话...</Text>
          </MatchedEntrance>
        )}

        {/* In-call state — timer + video placeholder */}
        {callState === 'in_call' && (
          <>
            {/* Timer */}
            <View className="mb-8">
              <Animated.Text
                style={timerAnimStyle}
                className={`text-6xl font-bold text-center ${
                  timeLeft <= 30 ? 'text-red-500' : 'text-gray-900'
                }`}
              >
                {formatTime(timeLeft)}
              </Animated.Text>
              <Text className="text-sm text-gray-500 text-center mt-2">
                与 {partnerName} 通话中
              </Text>
            </View>

            {/* Video placeholder */}
            <View className="w-full aspect-[3/4] max-h-80 bg-gray-200 rounded-2xl items-center justify-center mb-6">
              <Ionicons name="videocam" size={64} color="#9ca3af" />
              <Text className="text-sm text-gray-400 mt-2">视频通话区域</Text>
            </View>

            {/* Call controls */}
            <View className="flex-row gap-6">
              <ScalePressable
                onPress={handleNavigateToCall}
                className="w-14 h-14 rounded-full bg-rose-100 items-center justify-center"
              >
                <Ionicons name="expand-outline" size={24} color="#f43f5e" />
              </ScalePressable>
              <ScalePressable
                onPress={() => setCallState('ended')}
                className="w-14 h-14 rounded-full bg-red-500 items-center justify-center"
              >
                <Ionicons name="call" size={24} color="#ffffff" style={{ transform: [{ rotate: '135deg' }] }} />
              </ScalePressable>
            </View>
          </>
        )}

        {/* Ended state — time's up / post-call */}
        {callState === 'ended' && (
          <>
            <View className="w-44 h-44 rounded-full bg-gray-100 items-center justify-center mb-6">
              <Ionicons name="time-outline" size={80} color="#6b7280" />
            </View>
            <Text className="text-xl font-bold text-gray-900 mb-2">
              {timeLeft <= 0 ? '时间到' : '通话结束'}
            </Text>
            <Text className="text-sm text-gray-500 text-center mb-8">
              与 {partnerName} 的速配已结束
            </Text>
            <View className="flex-row gap-4">
              <ScalePressable
                onPress={handleEnd}
                className="border-2 border-gray-300 rounded-full px-8 py-3"
              >
                <Text className="text-gray-600 text-base font-medium">结束</Text>
              </ScalePressable>
              <ScalePressable
                onPress={handleStartMatch}
                className="bg-rose-500 rounded-full px-8 py-3"
              >
                <Text className="text-white text-base font-bold">再来一局</Text>
              </ScalePressable>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
