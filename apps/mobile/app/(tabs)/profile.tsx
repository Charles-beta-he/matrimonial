import { useEffect } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Avatar, Badge, ListItem } from '@matrimonial/ui';
import { useAppStore } from '../../stores/useAppStore';
import { useAnalytics } from '../../hooks/useAnalytics';

const MENU_ITEMS = [
  { title: '认证中心', icon: '🛡️', route: '/profile/verification' },
  { title: '会员中心', icon: '👑', route: '/profile/membership' },
  { title: '隐私设置', icon: '🔒', route: '/profile/privacy' },
  { title: '安全工具', icon: '🆘', route: '/profile/safety' },
  { title: '设置', icon: '⚙️', route: '/profile/settings' },
] as const;

/** My profile tab */
export default function ProfileTab() {
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const clearAuth = useAppStore((s) => s.clearAuth);
  const { track, clearUser } = useAnalytics();

  useEffect(() => {
    track('screen_view', { screen_name: 'my_profile' });
  }, [track]);

  const handleLogout = () => {
    Alert.alert('退出登录', '确定要退出登录吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '确定',
        style: 'destructive',
        onPress: () => {
          track('auth_logout', {});
          clearUser();
          clearAuth();
          router.replace('/');
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header profile area */}
        <View className="bg-white px-6 pt-6 pb-6 items-center">
          <Avatar
            source={{ uri: user?.photos?.[0]?.url ?? 'https://picsum.photos/seed/me/200/200' }}
            size={80}
            verified={!!user?.verificationLevel}
            verificationLevel={user?.verificationLevel ?? 'L1'}
            online
          />
          <Text className="text-xl font-bold text-gray-900 mt-3">
            {user?.nickname ?? '用户'}
          </Text>
          <View className="flex-row items-center mt-1" style={{ gap: 6 }}>
            <Text className="text-sm text-gray-500">
              {user?.age ?? 28}岁 · {user?.city ?? '北京'}
            </Text>
            {user?.verificationLevel && (
              <Badge
                label={user.verificationLevel}
                variant="verification"
                level={user.verificationLevel}
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
          {[
            { label: '获赞', value: 128 },
            { label: '匹配', value: 36 },
            { label: '来访', value: 256 },
          ].map((stat, i) => (
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
              left={<Text className="text-lg">{item.icon}</Text>}
              title={item.title}
              right={<Text className="text-gray-300">&gt;</Text>}
              onPress={
                item.route
                  ? () => router.push(item.route as any)
                  : () => Alert.alert('设置', '功能开发中')
              }
            />
          ))}
        </View>

        {/* Logout */}
        <View className="mt-2 bg-white">
          <ListItem
            left={<Text className="text-lg">🚪</Text>}
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
