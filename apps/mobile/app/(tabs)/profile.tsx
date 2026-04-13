import { useEffect } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';
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
  route: '/profile/verification' | '/profile/membership' | '/profile/privacy' | '/profile/safety' | '/profile/settings';
}

const MENU_ITEMS: MenuItem[] = [
  { title: '认证中心', icon: 'shield-checkmark-outline', iconColor: '#3b82f6', route: '/profile/verification' },
  { title: '会员中心', icon: 'diamond-outline',          iconColor: '#f59e0b', route: '/profile/membership' },
  { title: '隐私设置', icon: 'lock-closed-outline',      iconColor: '#6b7280', route: '/profile/privacy' },
  { title: '安全工具', icon: 'shield-outline',           iconColor: '#ef4444', route: '/profile/safety' },
  { title: '设置',     icon: 'settings-outline',         iconColor: '#64748b', route: '/profile/settings' },
];

/** My profile tab */
export default function ProfileTab() {
  const router = useRouter();
  const storeUser = useAppStore((s) => s.user);
  const clearAuth = useAppStore((s) => s.clearAuth);
  const { track, clearUser } = useAnalytics();

  const meQuery = api.user.me.useQuery(undefined, {
    staleTime: 30_000,
  });
  const likedMeQuery = api.match.likedMe.useQuery();
  const matchesQuery = api.match.matches.useQuery();
  const visitorsQuery = api.user.visitors.useQuery({ limit: 100 });
  const logoutMut = api.auth.logout.useMutation();

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
    { label: '获赞', value: likedMeQuery.data?.length ?? 0 },
    { label: '匹配', value: matchesQuery.data?.length ?? 0 },
    { label: '来访', value: visitorsQuery.data?.length ?? 0 },
  ];

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header profile area */}
        <View className="bg-white px-6 pt-6 pb-6 items-center">
          <Avatar
            source={{ uri: avatarUrl }}
            size={80}
            verified={!!verificationLevel}
            verificationLevel={verificationLevel ?? 'L1'}
            online
          />
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
        </View>

        {/* Stats row */}
        <View className="bg-white mt-2 flex-row py-4">
          {stats.map((stat, i) => (
            <View key={stat.label} className="flex-1 items-center">
              {i > 0 && (
                <View className="absolute left-0 top-1 bottom-1 w-px bg-gray-100" />
              )}
              <Text className="text-xl font-bold text-gray-900">{stat.value}</Text>
              <Text className="text-xs text-gray-500 mt-0.5">{stat.label}</Text>
            </View>
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
