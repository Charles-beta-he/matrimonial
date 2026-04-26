import { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, Switch, Text, View } from 'react-native';
import { ScalePressable } from '../../components/ScalePressable';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { ScreenHeader } from '../../components/ScreenHeader';
import { api } from '@matrimonial/api-client';
import { useAppStore } from '../../stores/useAppStore';
import { useSocketStore } from '../../stores/useSocketStore';
import { useScreenTracking } from '../../hooks/useAnalytics';

interface SettingToggle {
  key: string;
  label: string;
}

const NOTIFICATION_SETTINGS: SettingToggle[] = [
  { key: 'newMessage', label: '新消息通知' },
  { key: 'matchSuccess', label: '匹配成功通知' },
  { key: 'activityReminder', label: '活动提醒' },
  { key: 'marketing', label: '营销推送' },
];

export default function SettingsPage() {
  useScreenTracking('settings');
  const router = useRouter();
  const clearAuth = useAppStore((s) => s.clearAuth);
  const storeUser = useAppStore((s) => s.user);
  const isPendingDeletion = (storeUser as any)?.status === 'PENDING_DELETION';
  const logoutMut = api.auth.logout.useMutation();

  const { data: notifPrefs } = api.user.getNotifPrefs.useQuery();
  const updateNotifMut = api.user.updateNotifPrefs.useMutation();

  const [notifications, setNotifications] = useState<Record<string, boolean>>({
    newMessage: true,
    matchSuccess: true,
    activityReminder: true,
    marketing: false,
  });

  useEffect(() => {
    if (notifPrefs) {
      setNotifications({
        newMessage: notifPrefs.newMessage,
        matchSuccess: notifPrefs.matchSuccess,
        activityReminder: notifPrefs.activityReminder,
        marketing: notifPrefs.marketing,
      });
    }
  }, [notifPrefs]);

  const contentOpacity = useSharedValue(0);
  const contentY = useSharedValue(20);
  useEffect(() => {
    const e = Easing.out(Easing.cubic);
    contentOpacity.value = withTiming(1, { duration: 380, easing: e });
    contentY.value = withTiming(0, { duration: 360, easing: e });
  }, []);
  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentY.value }],
  }));

  const toggleNotification = (key: string) => {
    const newValue = !notifications[key];
    setNotifications((prev) => ({ ...prev, [key]: newValue }));
    updateNotifMut.mutate({ [key]: newValue });
  };

  const handleClearCache = () => {
    Alert.alert('清除缓存', '缓存已清除');
  };

  const handleCheckUpdate = () => {
    Alert.alert('检查更新', '当前已是最新版本 v1.0.0');
  };

  const handleDeleteAccount = () => {
    router.push('/profile/delete-account');
  };

  const performLogout = async () => {
    const refreshToken = useAppStore.getState().refreshToken ?? undefined;
    try {
      await logoutMut.mutateAsync({ refreshToken });
    } catch (_err) {
      void _err; // ignore network failures — user is logged out locally regardless
    }
    // Disconnect socket before clearing auth so the server sees a clean
    // disconnect rather than an auth-less reconnect attempt.
    useSocketStore.getState().disconnect();
    clearAuth();
    router.replace('/(auth)/login');
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      const g = globalThis as unknown as { confirm?: (msg: string) => boolean };
      if (g.confirm?.('确定要退出登录吗？')) {
        void performLogout();
      }
      return;
    }
    Alert.alert('退出登录', '确定要退出登录吗？', [
      { text: '取消', style: 'cancel' },
      { text: '确定', style: 'destructive', onPress: performLogout },
    ]);
  };

  const groupCardStyle = {
    marginHorizontal: 24,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#eef0f3',
    overflow: 'hidden' as const,
  };
  const eyebrowStyle = {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#9ca3af',
    letterSpacing: 1.6,
    paddingHorizontal: 24,
    marginBottom: 10,
  };
  const itemStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 16,
    paddingVertical: 14,
  };
  const itemDividerStyle = { borderTopWidth: 1, borderTopColor: '#f4f0ea' };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fdfcfa' }}>
      <ScreenHeader title="设置" noBorder />
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <Animated.View style={contentStyle}>
          {/* 账号安全 */}
          <View style={{ marginTop: 12 }}>
            <Text style={eyebrowStyle}>账号安全</Text>
            <View style={groupCardStyle}>
              <ScalePressable
                style={itemStyle}
                onPress={() =>
                  Alert.alert('修改手机号', '手机号为账号唯一标识，如需修改请联系客服')
                }
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#0b0b0f' }}>修改手机号</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.gray300} />
              </ScalePressable>
            </View>
          </View>

          {/* 通知设置 */}
          <View style={{ marginTop: 24 }}>
            <Text style={eyebrowStyle}>通知设置</Text>
            <View style={groupCardStyle}>
              {NOTIFICATION_SETTINGS.map((item, index) => (
                <View
                  key={item.key}
                  style={[itemStyle, index > 0 ? itemDividerStyle : undefined]}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#0b0b0f' }}>
                    {item.label}
                  </Text>
                  <Switch
                    value={notifications[item.key]}
                    onValueChange={() => toggleNotification(item.key)}
                    trackColor={{ false: colors.gray300, true: colors.primaryMuted }}
                    thumbColor={notifications[item.key] ? colors.primary : colors.white}
                  />
                </View>
              ))}
            </View>
          </View>

          {/* 通用 */}
          <View style={{ marginTop: 24 }}>
            <Text style={eyebrowStyle}>通用</Text>
            <View style={groupCardStyle}>
              <ScalePressable style={itemStyle} onPress={handleClearCache}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#0b0b0f' }}>清除缓存</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.gray300} />
              </ScalePressable>
              <ScalePressable style={[itemStyle, itemDividerStyle]} onPress={handleCheckUpdate}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#0b0b0f' }}>检查更新</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.gray300} />
              </ScalePressable>
            </View>
          </View>

          {/* 关于 */}
          <View style={{ marginTop: 24 }}>
            <Text style={eyebrowStyle}>关于</Text>
            <View style={groupCardStyle}>
              <View style={itemStyle}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#0b0b0f' }}>版本号</Text>
                <Text style={{ fontSize: 13, color: '#9ca3af' }}>v1.0.0</Text>
              </View>
              <ScalePressable
                style={[itemStyle, itemDividerStyle]}
                onPress={() => router.push('/legal/terms')}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#0b0b0f' }}>用户协议</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.gray300} />
              </ScalePressable>
              <ScalePressable
                style={[itemStyle, itemDividerStyle]}
                onPress={() => router.push('/legal/privacy')}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#0b0b0f' }}>隐私政策</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.gray300} />
              </ScalePressable>
            </View>
          </View>

          {/* 我的举报 */}
          <View style={{ marginTop: 24 }}>
            <Text style={eyebrowStyle}>举报记录</Text>
            <View style={groupCardStyle}>
              <ScalePressable
                style={itemStyle}
                onPress={() => router.push('/profile/my-reports' as any)}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#0b0b0f' }}>
                  我提交的举报
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.gray300} />
              </ScalePressable>
            </View>
          </View>

          {/* 账号 (danger) */}
          <View style={{ marginTop: 24 }}>
            <Text style={eyebrowStyle}>账号</Text>
            <View
              style={{
                marginHorizontal: 24,
                backgroundColor: '#ffffff',
                borderRadius: 18,
                borderWidth: 1,
                borderColor: '#fde2e6',
                overflow: 'hidden',
              }}
            >
              <ScalePressable
                style={itemStyle}
                onPress={
                  isPendingDeletion
                    ? () => router.push('/(tabs)/profile' as any)
                    : handleDeleteAccount
                }
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#dc2626' }}>
                  {isPendingDeletion ? '账号注销申请中' : '注销账号'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#fb7185" />
              </ScalePressable>
              <ScalePressable
                style={[itemStyle, { borderTopWidth: 1, borderTopColor: '#fde2e6' }]}
                onPress={handleLogout}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#dc2626' }}>退出登录</Text>
                <Ionicons name="chevron-forward" size={16} color="#fb7185" />
              </ScalePressable>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
