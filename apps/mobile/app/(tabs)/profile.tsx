import { useEffect } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { AnimatedCounter } from '../../components/AnimatedCounter';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, Badge, ListItem, toast } from '@matrimonial/ui';
import { api } from '@matrimonial/api-client';
import { calculateAge } from '@matrimonial/shared';
import { useAppStore } from '../../stores/useAppStore';
import { useAnalytics } from '../../hooks/useAnalytics';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface MenuItem {
  title: string;
  icon: IoniconName;
  iconColor: string;
  route: '/profile/verification' | '/profile/membership' | '/profile/privacy' | '/profile/safety' | '/profile/settings' | '/profile/checkin' | '/profile/invite' | '/profile/preferences';
}

const MENU_ITEMS: MenuItem[] = [
  { title: '认证中心', icon: 'shield-checkmark-outline', iconColor: '#3b82f6', route: '/profile/verification' },
  { title: '会员中心', icon: 'diamond-outline',          iconColor: '#f59e0b', route: '/profile/membership' },
  { title: '择偶偏好', icon: 'options-outline',          iconColor: '#8b5cf6', route: '/profile/preferences' },
  { title: '隐私设置', icon: 'lock-closed-outline',      iconColor: '#6b7280', route: '/profile/privacy' },
  { title: '邀请好友', icon: 'gift-outline',              iconColor: '#ec4899', route: '/profile/invite' },
  { title: '安全工具', icon: 'shield-outline',           iconColor: '#ef4444', route: '/profile/safety' },
  { title: '设置',     icon: 'settings-outline',         iconColor: '#64748b', route: '/profile/settings' },
];

/** My profile tab */
export default function ProfileTab() {
  const router = useRouter();
  const storeUser = useAppStore((s) => s.user);
  const clearAuth = useAppStore((s) => s.clearAuth);
  const { track, clearUser } = useAnalytics();

  const breathe = useSharedValue(1);
  const breatheStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathe.value }],
  }));

  const headerOpacity = useSharedValue(0);
  const headerTranslateY = useSharedValue(-20);
  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }));

  useEffect(() => {
    breathe.value = withRepeat(
      withSequence(
        withTiming(1.025, { duration: 2800 }),
        withTiming(1.0, { duration: 2800 }),
      ),
      -1,
      true,
    );
    const cfg = { duration: 400, easing: Easing.out(Easing.cubic) };
    headerOpacity.value = withTiming(1, cfg);
    headerTranslateY.value = withTiming(0, cfg);
  }, [breathe, headerOpacity, headerTranslateY]);

  const meQuery = api.user.me.useQuery(undefined, {
    staleTime: 30_000,
  });
  const likedMeQuery = api.match.likedMe.useQuery();
  const matchesQuery = api.match.matches.useQuery();
  const visitorsQuery = api.user.visitors.useQuery({ limit: 100 });
  const logoutMut = api.auth.logout.useMutation();
  const checkinQuery = api.checkin.history.useQuery(undefined, { staleTime: 60_000 });
  const cancelDeletionMut = api.user.cancelDeletion.useMutation({
    onSuccess: () => {
      const s = useAppStore.getState();
      if (s.token && s.refreshToken && s.user) {
        s.setAuth(s.token, s.refreshToken, {
          ...s.user,
          status: 'ACTIVE',
          deletionRequestedAt: null,
        });
      }
      meQuery.refetch();
      toast.success('注销申请已撤回');
    },
  });

  const user = (meQuery.data as any) ?? storeUser;

  useEffect(() => {
    track('screen_view', { screen_name: 'my_profile' });
  }, [track]);

  const avatarUrl =
    user?.photos?.[0]?.url ??
    (user as any)?.avatar ??
    'https://picsum.photos/seed/me/200/200';

  const age =
    typeof user?.age === 'number'
      ? user.age
      : user?.birthday
        ? calculateAge(new Date(user.birthday))
        : null;

  const verificationLevel = user?.verificationLevel ?? null;

  const deletionDeadline = (() => {
    const raw = user?.deletionRequestedAt;
    if (!raw) return '';
    const d = new Date(new Date(raw).getTime() + 14 * 24 * 60 * 60 * 1000);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  })();

  const performLogout = async () => {
    track('auth_logout', {});
    try {
      await logoutMut.mutateAsync();
    } catch {
      // ignore network failure on logout
    }
    clearUser();
    clearAuth();
    router.replace('/(auth)/login');
  };

  const handleLogout = () => {
    // Alert.alert's 3-button pattern is unreliable on react-native-web
    // (destructive button onPress often doesn't fire). Fall back to window.confirm.
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

  const stats = [
    { label: '获赞', value: likedMeQuery.data?.length ?? 0, route: '/profile/liked-me' as const },
    { label: '匹配', value: matchesQuery.data?.length ?? 0, route: null },
    { label: '来访', value: visitorsQuery.data?.length ?? 0, route: '/profile/visitors' as const },
  ];

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Pending deletion banner */}
        {user?.status === 'PENDING_DELETION' && (
          <View className="mx-4 mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <View className="flex-row items-center mb-2" style={{ gap: 6 }}>
              <Ionicons name="warning" size={16} color="#b45309" />
              <Text className="text-sm font-bold text-amber-700">账号注销申请中</Text>
            </View>
            <Text className="text-xs text-amber-600 leading-5 mb-3">
              {deletionDeadline
                ? `您的账号将于 ${deletionDeadline} 正式注销。在此之前，您可以随时撤回申请，恢复正常使用。`
                : '您的账号注销申请正在处理中，14天内可随时撤回。'}
            </Text>
            <Pressable
              className={`rounded-full py-2.5 items-center ${cancelDeletionMut.isPending ? 'bg-amber-200' : 'bg-amber-500'}`}
              onPress={() => cancelDeletionMut.mutate()}
              disabled={cancelDeletionMut.isPending}
            >
              <Text className="text-white text-sm font-bold">
                {cancelDeletionMut.isPending ? '处理中...' : '取消注销'}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Header profile area */}
        <Animated.View style={[headerStyle, { backgroundColor: '#fff' }]} className="px-6 pt-6 pb-6 items-center">
          <Animated.View style={breatheStyle}>
            <Avatar
              source={{ uri: avatarUrl }}
              size={80}
              verified={!!verificationLevel}
              verificationLevel={verificationLevel ?? 'L1'}
              online
            />
          </Animated.View>
          <Text className="text-xl font-bold text-gray-900 mt-3">
            {user?.nickname ?? '用户'}
          </Text>
          <View className="flex-row items-center mt-1" style={{ gap: 6 }}>
            <Text className="text-sm text-gray-500">
              {age ?? '--'}岁 · {user?.city ?? '--'}
            </Text>
            {verificationLevel && (
              <Badge
                label={verificationLevel}
                variant="verification"
                level={verificationLevel}
              />
            )}
          </View>

          <Pressable
            className="mt-4 bg-rose-50 rounded-full px-6 py-2"
            onPress={() => router.push('/profile/edit')}
          >
            <Text className="text-rose-500 font-medium text-sm">编辑资料</Text>
          </Pressable>
        </Animated.View>

        {/* Daily check-in card */}
        <Pressable
          className="bg-white mt-2 mx-4 rounded-2xl p-4 flex-row items-center"
          style={{ shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 }}
          onPress={() => router.push('/profile/checkin' as any)}
        >
          <View className="w-11 h-11 rounded-xl bg-orange-50 items-center justify-center">
            <Ionicons name="flame" size={24} color="#f97316" />
          </View>
          <View className="flex-1 ml-3">
            <Text className="text-base font-bold text-gray-900">每日签到</Text>
            <Text className="text-xs text-gray-500 mt-0.5">
              {checkinQuery.data?.checkedInToday
                ? `已签到 · 连续${checkinQuery.data.currentStreak}天`
                : '今日未签到，点击领取奖励'}
            </Text>
          </View>
          <View className="flex-row items-center" style={{ gap: 4 }}>
            {!checkinQuery.data?.checkedInToday && (
              <View className="bg-rose-500 rounded-full px-2.5 py-1">
                <Text className="text-white text-xs font-bold">签到</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
          </View>
        </Pressable>

        {/* Stats row */}
        <View className="bg-white mt-2 flex-row py-4">
          {stats.map((stat, i) => (
            stat.route ? (
              <Pressable
                key={stat.label}
                className="flex-1 items-center"
                onPress={() => router.push(stat.route as any)}
              >
                {i > 0 && (
                  <View className="absolute left-0 top-1 bottom-1 w-px bg-gray-100" />
                )}
                <AnimatedCounter value={stat.value} className="text-xl font-bold text-gray-900" />
                <Text className="text-xs text-rose-500 mt-0.5">{stat.label}</Text>
              </Pressable>
            ) : (
              <View key={stat.label} className="flex-1 items-center">
                {i > 0 && (
                  <View className="absolute left-0 top-1 bottom-1 w-px bg-gray-100" />
                )}
                <AnimatedCounter value={stat.value} className="text-xl font-bold text-gray-900" />
                <Text className="text-xs text-gray-500 mt-0.5">{stat.label}</Text>
              </View>
            )
          ))}
        </View>

        {/* Menu items */}
        <View className="bg-white mt-2">
          {MENU_ITEMS.map((item) => (
            <ListItem
              key={item.title}
              left={
                <View
                  className="w-9 h-9 rounded-xl items-center justify-center"
                  style={{ backgroundColor: item.iconColor + '15' }}
                >
                  <Ionicons name={item.icon} size={20} color={item.iconColor} />
                </View>
              }
              title={item.title}
              right={<Ionicons name="chevron-forward" size={18} color="#d1d5db" />}
              onPress={() => router.push(item.route as any)}
            />
          ))}
        </View>

        {/* Logout */}
        <View className="mt-2 bg-white">
          <ListItem
            left={
              <View className="w-9 h-9 rounded-xl items-center justify-center" style={{ backgroundColor: '#fef2f2' }}>
                <Ionicons name="log-out-outline" size={20} color="#ef4444" />
              </View>
            }
            title="退出登录"
            showDivider={false}
            onPress={handleLogout}
          />
        </View>

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
