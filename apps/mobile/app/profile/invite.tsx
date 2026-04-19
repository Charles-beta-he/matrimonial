import { useEffect, useState } from 'react';
import { ScrollView, Share, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing,
} from 'react-native-reanimated';
import { ScalePressable } from '../../components/ScalePressable';
import { colors } from '../../constants/colors';
import { toast } from '@matrimonial/ui';
import { ScreenHeader } from '../../components/ScreenHeader';
import { api } from '@matrimonial/api-client';
import { useAnalytics } from '../../hooks/useAnalytics';

/** Invite / Referral page */
export default function InvitePage() {
  const { track } = useAnalytics();
  const [inputCode, setInputCode] = useState('');

  const codeQuery = api.invite.getMyCode.useQuery();
  const statsQuery = api.invite.stats.useQuery();
  const applyMut = api.invite.applyCode.useMutation({
    onSuccess: (data) => {
      toast.show({ type: 'success', text1: `邀请码已使用，邀请人：${data.inviterNickname}` });
      track('invite_code_applied', {});
      setInputCode('');
      statsQuery.refetch();
    },
    onError: (err) => {
      toast.show({ type: 'error', text1: err.message });
    },
  });

  const heroOpacity = useSharedValue(0);
  const heroY = useSharedValue(24);
  const heroStyle = useAnimatedStyle(() => ({
    opacity: heroOpacity.value,
    transform: [{ translateY: heroY.value }],
  }));

  useEffect(() => {
    track('screen_view', { screen_name: 'invite' });
    const e = Easing.out(Easing.cubic);
    const cfg = { duration: 420, easing: e };
    heroOpacity.value = withDelay(80, withTiming(1, cfg));
    heroY.value = withDelay(80, withTiming(0, cfg));
  }, [track, heroOpacity, heroY]);

  const myCode = codeQuery.data?.code ?? '------';
  const inviteCount = statsQuery.data?.inviteCount ?? 0;
  const invitees = statsQuery.data?.invitees ?? [];

  const handleCopyCode = async () => {
    try {
      await Clipboard.setStringAsync(myCode);
      toast.show({ type: 'success', text1: '邀请码已复制' });
      track('invite_code_copied', {});
    } catch {
      toast.show({ type: 'error', text1: '复制失败' });
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `我在用一款很不错的交友App，用我的邀请码 ${myCode} 注册，我们都能获得 Super Like 奖励！`,
      });
      track('invite_shared', {});
    } catch (_err) {
      void _err; // user cancelled share dialog
    }
  };

  const handleApplyCode = () => {
    const code = inputCode.trim().toUpperCase();
    if (code.length !== 6) {
      toast.show({ type: 'error', text1: '请输入6位邀请码' });
      return;
    }
    applyMut.mutate({ code });
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScreenHeader title="邀请好友" centered />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* My invite code card */}
        <Animated.View style={[heroStyle, {
          backgroundColor: colors.white, marginHorizontal: 16, marginTop: 16,
          borderRadius: 16, padding: 24, alignItems: 'center',
          shadowColor: colors.black, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
        }]}>
          <View className="w-16 h-16 rounded-full bg-pink-50 items-center justify-center mb-3">
            <Ionicons name="gift" size={32} color={colors.pink} />
          </View>
          <Text className="text-sm text-gray-500 mb-2">我的邀请码</Text>
          <Text className="text-3xl font-bold text-gray-900 tracking-widest mb-1">
            {myCode}
          </Text>
          <Text className="text-xs text-gray-400 mb-4">
            分享给好友，双方各获 Super Like 奖励
          </Text>

          <View className="flex-row" style={{ gap: 12 }}>
            <ScalePressable
              className="flex-row items-center bg-gray-100 rounded-full px-5 py-2.5"
              onPress={handleCopyCode}
            >
              <Ionicons name="copy-outline" size={16} color={colors.gray700} />
              <Text className="text-sm font-medium text-gray-700 ml-1.5">复制</Text>
            </ScalePressable>
            <ScalePressable
              className="flex-row items-center bg-rose-500 rounded-full px-5 py-2.5"
              onPress={handleShare}
            >
              <Ionicons name="share-outline" size={16} color={colors.white} />
              <Text className="text-sm font-medium text-white ml-1.5">分享</Text>
            </ScalePressable>
          </View>
        </Animated.View>

        {/* Rewards info */}
        <View className="bg-white mx-4 mt-3 rounded-2xl p-5">
          <Text className="text-base font-bold text-gray-900 mb-3">邀请奖励</Text>
          <View className="flex-row" style={{ gap: 12 }}>
            <View className="flex-1 bg-amber-50 rounded-xl p-3 items-center">
              <Text className="text-2xl mb-1">🎁</Text>
              <Text className="text-xs text-gray-600 font-medium">邀请人获得</Text>
              <Text className="text-sm font-bold text-amber-600 mt-0.5">3 Super Like</Text>
            </View>
            <View className="flex-1 bg-blue-50 rounded-xl p-3 items-center">
              <Text className="text-2xl mb-1">🎉</Text>
              <Text className="text-xs text-gray-600 font-medium">被邀请人获得</Text>
              <Text className="text-sm font-bold text-blue-600 mt-0.5">2 Super Like</Text>
            </View>
          </View>
        </View>

        {/* Enter invite code */}
        <View className="bg-white mx-4 mt-3 rounded-2xl p-5">
          <Text className="text-base font-bold text-gray-900 mb-3">输入邀请码</Text>
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <TextInput
              aria-label="邀请码"
              className="flex-1 bg-gray-50 rounded-xl px-4 py-3 text-base text-gray-900 border border-gray-200"
              placeholder="输入6位邀请码"
              placeholderTextColor={colors.gray400}
              value={inputCode}
              onChangeText={setInputCode}
              maxLength={6}
              autoCapitalize="characters"
            />
            <ScalePressable
              className="bg-rose-500 rounded-xl px-5 py-3"
              onPress={handleApplyCode}
              disabled={applyMut.isPending}
            >
              <Text className="text-white font-medium text-base">
                {applyMut.isPending ? '...' : '确认'}
              </Text>
            </ScalePressable>
          </View>
        </View>

        {/* Stats */}
        <View className="bg-white mx-4 mt-3 rounded-2xl p-5">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-bold text-gray-900">邀请记录</Text>
            <View className="bg-rose-50 rounded-full px-3 py-1">
              <Text className="text-sm font-bold text-rose-500">
                已邀请 {inviteCount} 人
              </Text>
            </View>
          </View>

          {invitees.length === 0 ? (
            <View className="items-center py-6">
              <Ionicons name="people-outline" size={40} color={colors.gray300} />
              <Text className="text-sm text-gray-400 mt-2">还没有邀请记录</Text>
              <Text className="text-xs text-gray-300 mt-1">分享邀请码给好友，一起来吧</Text>
            </View>
          ) : (
            <View>
              {invitees.map((inv, i) => (
                <View
                  key={i}
                  className={`flex-row items-center py-3 ${i < invitees.length - 1 ? 'border-b border-gray-50' : ''}`}
                >
                  <View className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center">
                    <Ionicons name="person" size={18} color={colors.gray400} />
                  </View>
                  <View className="flex-1 ml-3">
                    <Text className="text-sm font-medium text-gray-900">{inv.nickname}</Text>
                    <Text className="text-xs text-gray-400 mt-0.5">
                      {new Date(inv.createdAt).toLocaleDateString('zh-CN')} 加入
                    </Text>
                  </View>
                  <View className="bg-green-50 rounded-full px-2 py-0.5">
                    <Text className="text-xs text-green-600">+3 SL</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
