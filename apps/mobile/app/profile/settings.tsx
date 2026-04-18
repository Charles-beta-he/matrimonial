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
import { api } from '@matrimonial/api-client';
import { useAppStore } from '../../stores/useAppStore';
import { useSocketStore } from '../../stores/useSocketStore';

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

  const headerOpacity = useSharedValue(0);
  const headerY = useSharedValue(-16);
  const contentOpacity = useSharedValue(0);
  const contentY = useSharedValue(20);
  useEffect(() => {
    const e = Easing.out(Easing.cubic);
    headerOpacity.value = withTiming(1, { duration: 320, easing: e });
    headerY.value = withTiming(0, { duration: 320, easing: e });
    contentOpacity.value = withTiming(1, { duration: 380, easing: e });
    contentY.value = withTiming(0, { duration: 360, easing: e });
  }, []);
  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerY.value }],
  }));
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
    try {
      await logoutMut.mutateAsync();
    } catch {
      // ignore network failures on logout
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

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View className="bg-white px-6 py-4" style={[{ flexDirection: 'row', alignItems: 'center' }, headerStyle]}>
          <ScalePressable onPress={() => router.back()} className="mr-4">
            <Ionicons name="chevron-back" size={24} color="#4b5563" />
          </ScalePressable>
          <Text className="text-lg font-bold text-gray-900">设置</Text>
        </Animated.View>

        <Animated.View style={contentStyle}>
        {/* 账号安全 */}
        <View className="mt-3">
          <Text className="px-6 py-2 text-xs text-gray-400 font-medium">账号安全</Text>
          <View className="bg-white">
            <ScalePressable
              className="flex-row items-center justify-between px-6 py-4 border-b border-gray-50"
              onPress={() => Alert.alert('修改手机号', '功能开发中')}
            >
              <Text className="text-base text-gray-900">修改手机号</Text>
              <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
            </ScalePressable>
            <ScalePressable
              className="flex-row items-center justify-between px-6 py-4"
              onPress={() => Alert.alert('修改密码', '功能开发中')}
            >
              <Text className="text-base text-gray-900">修改密码</Text>
              <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
            </ScalePressable>
          </View>
        </View>

        {/* 通知设置 */}
        <View className="mt-3">
          <Text className="px-6 py-2 text-xs text-gray-400 font-medium">通知设置</Text>
          <View className="bg-white">
            {NOTIFICATION_SETTINGS.map((item, index) => (
              <View
                key={item.key}
                className={`flex-row items-center justify-between px-6 py-4 ${
                  index < NOTIFICATION_SETTINGS.length - 1 ? 'border-b border-gray-50' : ''
                }`}
              >
                <Text className="text-base text-gray-900">{item.label}</Text>
                <Switch
                  value={notifications[item.key]}
                  onValueChange={() => toggleNotification(item.key)}
                  trackColor={{ false: '#d1d5db', true: '#fda4af' }}
                  thumbColor={notifications[item.key] ? '#f43f5e' : '#f3f4f6'}
                />
              </View>
            ))}
          </View>
        </View>

        {/* 通用 */}
        <View className="mt-3">
          <Text className="px-6 py-2 text-xs text-gray-400 font-medium">通用</Text>
          <View className="bg-white">
            <ScalePressable
              className="flex-row items-center justify-between px-6 py-4 border-b border-gray-50"
              onPress={handleClearCache}
            >
              <Text className="text-base text-gray-900">清除缓存</Text>
              <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
            </ScalePressable>
            <ScalePressable
              className="flex-row items-center justify-between px-6 py-4"
              onPress={handleCheckUpdate}
            >
              <Text className="text-base text-gray-900">检查更新</Text>
              <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
            </ScalePressable>
          </View>
        </View>

        {/* 关于 */}
        <View className="mt-3">
          <Text className="px-6 py-2 text-xs text-gray-400 font-medium">关于</Text>
          <View className="bg-white">
            <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-50">
              <Text className="text-base text-gray-900">版本号</Text>
              <Text className="text-sm text-gray-400">v1.0.0</Text>
            </View>
            <ScalePressable
              className="flex-row items-center justify-between px-6 py-4 border-b border-gray-50"
              onPress={() => router.push('/legal/terms')}
            >
              <Text className="text-base text-gray-900">用户协议</Text>
              <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
            </ScalePressable>
            <ScalePressable
              className="flex-row items-center justify-between px-6 py-4"
              onPress={() => router.push('/legal/privacy')}
            >
              <Text className="text-base text-gray-900">隐私政策</Text>
              <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
            </ScalePressable>
          </View>
        </View>

        {/* 我的举报 */}
        <View className="mt-3">
          <Text className="px-6 py-2 text-xs text-gray-400 font-medium">举报记录</Text>
          <View className="bg-white">
            <ScalePressable
              className="flex-row items-center justify-between px-6 py-4"
              onPress={() => router.push('/profile/my-reports' as any)}
            >
              <Text className="text-base text-gray-900">我提交的举报</Text>
              <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
            </ScalePressable>
          </View>
        </View>

        {/* 账号 */}
        <View className="mt-3">
          <Text className="px-6 py-2 text-xs text-gray-400 font-medium">账号</Text>
          <View className="bg-white">
            <ScalePressable
              className="flex-row items-center justify-between px-6 py-4 border-b border-gray-50"
              onPress={isPendingDeletion ? () => router.push('/(tabs)/profile' as any) : handleDeleteAccount}
            >
              <Text className="text-base text-red-500">
                {isPendingDeletion ? '账号注销申请中' : '注销账号'}
              </Text>
              <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
            </ScalePressable>
            <ScalePressable
              className="flex-row items-center justify-between px-6 py-4"
              onPress={handleLogout}
            >
              <Text className="text-base text-red-500">退出登录</Text>
              <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
            </ScalePressable>
          </View>
        </View>

        <View className="h-12" />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
