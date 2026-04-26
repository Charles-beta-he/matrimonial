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

  const cardStyle = {
    marginHorizontal: 24,
    marginTop: 14,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#eef0f3',
  };
  const eyebrowStyle = {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#9ca3af',
    letterSpacing: 1.6,
    marginBottom: 14,
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fdfcfa' }}>
      <ScreenHeader title="邀请好友" centered noBorder />

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* My invite code hero — dark */}
        <Animated.View
          style={[
            heroStyle,
            {
              marginHorizontal: 24,
              marginTop: 8,
              backgroundColor: '#0b0b0f',
              borderRadius: 24,
              padding: 26,
              alignItems: 'center',
              overflow: 'hidden',
            },
          ]}
        >
          <View
            style={{
              position: 'absolute',
              top: -50,
              right: -40,
              width: 160,
              height: 160,
              borderRadius: 80,
              backgroundColor: 'rgba(228, 29, 72, 0.18)',
            }}
          />
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: 'rgba(228, 29, 72, 0.22)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}
          >
            <Ionicons name="gift" size={26} color="#fb7185" />
          </View>
          <Text
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: '#fbbf24',
              letterSpacing: 1.6,
              marginBottom: 12,
            }}
          >
            我的邀请码 · CODE
          </Text>
          <Text
            style={{
              fontSize: 36,
              fontWeight: '700',
              color: '#ffffff',
              letterSpacing: 6,
              marginBottom: 8,
            }}
          >
            {myCode}
          </Text>
          <Text style={{ fontSize: 12, color: '#a1a1aa', marginBottom: 20, textAlign: 'center' }}>
            分享给好友，双方各获 Super Like 奖励
          </Text>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <ScalePressable
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(255,255,255,0.08)',
                borderRadius: 999,
                paddingHorizontal: 18,
                paddingVertical: 10,
                gap: 6,
              }}
              onPress={handleCopyCode}
            >
              <Ionicons name="copy-outline" size={14} color="#ffffff" />
              <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '600' }}>复制</Text>
            </ScalePressable>
            <ScalePressable
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#e11d48',
                borderRadius: 999,
                paddingHorizontal: 18,
                paddingVertical: 10,
                gap: 6,
              }}
              onPress={handleShare}
            >
              <Ionicons name="share-outline" size={14} color="#ffffff" />
              <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '600' }}>分享</Text>
            </ScalePressable>
          </View>
        </Animated.View>

        {/* Rewards info */}
        <View style={cardStyle}>
          <Text style={eyebrowStyle}>邀请奖励</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View
              style={{
                flex: 1,
                backgroundColor: '#fff8e0',
                borderRadius: 14,
                padding: 14,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 24, marginBottom: 6 }}>🎁</Text>
              <Text style={{ fontSize: 11, color: '#92400e', fontWeight: '500' }}>邀请人获得</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#b45309', marginTop: 4 }}>
                3 Super Like
              </Text>
            </View>
            <View
              style={{
                flex: 1,
                backgroundColor: '#e6efff',
                borderRadius: 14,
                padding: 14,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 24, marginBottom: 6 }}>🎉</Text>
              <Text style={{ fontSize: 11, color: '#1e40af', fontWeight: '500' }}>被邀请人获得</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#1d4ed8', marginTop: 4 }}>
                2 Super Like
              </Text>
            </View>
          </View>
        </View>

        {/* Enter invite code */}
        <View style={cardStyle}>
          <Text style={eyebrowStyle}>输入邀请码</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TextInput
              aria-label="邀请码"
              style={{
                flex: 1,
                backgroundColor: '#fdfcfa',
                borderWidth: 1,
                borderColor: '#eef0f3',
                borderRadius: 14,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 15,
                color: '#0b0b0f',
                letterSpacing: 4,
              }}
              placeholder="6 位邀请码"
              placeholderTextColor="#b8bcc4"
              value={inputCode}
              onChangeText={setInputCode}
              maxLength={6}
              autoCapitalize="characters"
            />
            <ScalePressable
              style={{
                backgroundColor: '#e11d48',
                borderRadius: 14,
                paddingHorizontal: 18,
                paddingVertical: 12,
              }}
              onPress={handleApplyCode}
              disabled={applyMut.isPending}
            >
              <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 14 }}>
                {applyMut.isPending ? '...' : '确认'}
              </Text>
            </ScalePressable>
          </View>
        </View>

        {/* Stats */}
        <View style={cardStyle}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 14,
            }}
          >
            <Text style={eyebrowStyle}>邀请记录</Text>
            <View
              style={{
                backgroundColor: '#fff1f2',
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#e11d48' }}>
                已邀请 {inviteCount} 人
              </Text>
            </View>
          </View>

          {invitees.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 18 }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: '#fff1f2',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                }}
              >
                <Ionicons name="people-outline" size={24} color="#fb7185" />
              </View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#0b0b0f', marginBottom: 4 }}>
                还没有邀请记录
              </Text>
              <Text style={{ fontSize: 12, color: '#9ca3af' }}>分享邀请码给好友，一起来吧</Text>
            </View>
          ) : (
            <View>
              {invitees.map((inv, i) => (
                <View
                  key={i}
                  style={[
                    { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
                    i < invitees.length - 1
                      ? { borderBottomWidth: 1, borderBottomColor: '#f4f0ea' }
                      : undefined,
                  ]}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: '#f3f4f6',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="person" size={18} color={colors.gray400} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#0b0b0f' }}>
                      {inv.nickname}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                      {new Date(inv.createdAt).toLocaleDateString('zh-CN')} 加入
                    </Text>
                  </View>
                  <View
                    style={{
                      backgroundColor: '#dcfce7',
                      borderRadius: 999,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#15803d' }}>+3 SL</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
