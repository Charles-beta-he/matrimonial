import { useEffect } from 'react';
import { Alert, Platform, ScrollView, Text, View } from 'react-native';
import { AnimatedCounter } from '../../components/AnimatedCounter';
import { ScalePressable } from '../../components/ScalePressable';
import { StaggeredListItem } from '../../components/StaggeredListItem';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, Badge, toast } from '@matrimonial/ui';
import { api } from '@matrimonial/api-client';
import { calculateAge } from '@matrimonial/shared';
import { useAppStore } from '../../stores/useAppStore';
import { useAnalytics } from '../../hooks/useAnalytics';
import { ChromaTransition } from '../../components/ChromaTransition';
import { colors } from '../../constants/colors';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface MenuItem {
  title: string;
  description: string;
  icon: IoniconName;
  iconColor: string;
  iconBg: string;
  route: string;
}

const MENU_GROUPS: { label: string; items: MenuItem[] }[] = [
  {
    label: '账户',
    items: [
      {
        title: '认证中心',
        description: '提升真人可信度',
        icon: 'shield-checkmark-outline',
        iconColor: '#1d4ed8',
        iconBg: '#e6efff',
        route: '/profile/verification',
      },
      {
        title: '会员中心',
        description: '解锁更多匹配权益',
        icon: 'diamond-outline',
        iconColor: '#b45309',
        iconBg: '#fff8e0',
        route: '/profile/membership',
      },
      {
        title: '择偶偏好',
        description: '调整推荐范围',
        icon: 'options-outline',
        iconColor: '#6d28d9',
        iconBg: '#f4eeff',
        route: '/profile/preferences',
      },
    ],
  },
  {
    label: '互动',
    items: [
      {
        title: '邀请好友',
        description: '一起寻找',
        icon: 'gift-outline',
        iconColor: '#db2777',
        iconBg: '#fce7f3',
        route: '/profile/invite',
      },
      {
        title: '安全工具',
        description: 'SOS、约会报备',
        icon: 'shield-outline',
        iconColor: '#dc2626',
        iconBg: '#ffe4e6',
        route: '/profile/safety',
      },
    ],
  },
  {
    label: '设置',
    items: [
      {
        title: '隐私设置',
        description: '可见范围与拦截',
        icon: 'lock-closed-outline',
        iconColor: '#475569',
        iconBg: '#eef0f3',
        route: '/profile/privacy',
      },
      {
        title: '通用设置',
        description: '通知、缓存、版本',
        icon: 'settings-outline',
        iconColor: '#475569',
        iconBg: '#eef0f3',
        route: '/profile/settings',
      },
    ],
  },
];

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
  const headerTranslateY = useSharedValue(-12);
  const statsOpacity = useSharedValue(0);
  const statsY = useSharedValue(16);
  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }));
  const statsStyle = useAnimatedStyle(() => ({
    opacity: statsOpacity.value,
    transform: [{ translateY: statsY.value }],
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
    const e = Easing.out(Easing.cubic);
    const cfg = { duration: 400, easing: e };
    headerOpacity.value = withTiming(1, cfg);
    headerTranslateY.value = withTiming(0, cfg);
    statsOpacity.value = withDelay(180, withTiming(1, { duration: 360, easing: e }));
    statsY.value = withDelay(180, withTiming(0, { duration: 360, easing: e }));
  }, [breathe, headerOpacity, headerTranslateY]);

  const meQuery = api.user.me.useQuery(undefined, { staleTime: 30_000 });
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
    } catch (_err) {
      void _err;
    }
    clearUser();
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

  const stats = [
    { label: '获赞', value: likedMeQuery.data?.length ?? 0, route: '/profile/liked-me' as const },
    { label: '匹配', value: matchesQuery.data?.length ?? 0, route: null },
    { label: '来访', value: visitorsQuery.data?.length ?? 0, route: '/profile/visitors' as const },
  ];

  return (
    <ChromaTransition>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fdfcfa' }}>
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
          {/* Pending deletion banner */}
          {user?.status === 'PENDING_DELETION' && (
            <View
              style={{
                marginHorizontal: 24,
                marginTop: 16,
                backgroundColor: '#fff8e0',
                borderWidth: 1,
                borderColor: '#fbe098',
                borderRadius: 16,
                padding: 16,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Ionicons name="warning" size={16} color="#b45309" />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#b45309' }}>
                  账号注销申请中
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: '#92400e', lineHeight: 20, marginBottom: 12 }}>
                {deletionDeadline
                  ? `账号将于 ${deletionDeadline} 正式注销，可随时撤回。`
                  : '注销申请处理中，14 天内可撤回。'}
              </Text>
              <ScalePressable
                style={{
                  backgroundColor: cancelDeletionMut.isPending ? '#fde68a' : '#b45309',
                  borderRadius: 999,
                  paddingVertical: 10,
                  alignItems: 'center',
                }}
                onPress={() => cancelDeletionMut.mutate()}
                disabled={cancelDeletionMut.isPending}
              >
                <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '700' }}>
                  {cancelDeletionMut.isPending ? '处理中...' : '取消注销'}
                </Text>
              </ScalePressable>
            </View>
          )}

          {/* Hero card */}
          <Animated.View
            style={[
              headerStyle,
              {
                marginHorizontal: 24,
                marginTop: 16,
                backgroundColor: '#ffffff',
                borderRadius: 22,
                padding: 22,
                borderWidth: 1,
                borderColor: '#eef0f3',
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <Animated.View style={breatheStyle}>
                <Avatar
                  source={{ uri: avatarUrl }}
                  size={72}
                  verified={!!verificationLevel}
                  verificationLevel={verificationLevel ?? 'L1'}
                  online
                />
              </Animated.View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 19, fontWeight: '700', color: '#0b0b0f', letterSpacing: -0.2 }}>
                  {user?.nickname ?? '用户'}
                </Text>
                <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                  {age != null && user?.city
                    ? `${age} · ${user.city}`
                    : age != null
                      ? `${age} 岁`
                      : user?.city ?? '完善你的资料'}
                </Text>
                {verificationLevel ? (
                  <View style={{ marginTop: 8, flexDirection: 'row' }}>
                    <Badge label={verificationLevel} variant="verification" level={verificationLevel} />
                  </View>
                ) : null}
              </View>
            </View>

            <ScalePressable
              onPress={() => router.push('/profile/edit')}
              style={{
                marginTop: 18,
                backgroundColor: '#0b0b0f',
                borderRadius: 999,
                paddingVertical: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 14, letterSpacing: 0.4 }}>
                编辑资料
              </Text>
            </ScalePressable>
          </Animated.View>

          {/* Stats */}
          <Animated.View
            style={[
              statsStyle,
              {
                marginHorizontal: 24,
                marginTop: 12,
                backgroundColor: '#ffffff',
                borderRadius: 18,
                paddingVertical: 18,
                flexDirection: 'row',
                borderWidth: 1,
                borderColor: '#eef0f3',
              },
            ]}
          >
            {stats.map((stat, i) => {
              const cellStyle = {
                flex: 1,
                alignItems: 'center' as const,
                justifyContent: 'center' as const,
                borderLeftWidth: i > 0 ? 1 : 0,
                borderLeftColor: '#f1ece3',
              };
              const inner = (
                <>
                  <AnimatedCounter
                    value={stat.value}
                    style={{ fontSize: 22, fontWeight: '700', color: '#0b0b0f' }}
                  />
                  <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 4, letterSpacing: 0.4 }}>
                    {stat.label}
                  </Text>
                </>
              );
              if (stat.route) {
                return (
                  <ScalePressable
                    key={stat.label}
                    containerStyle={cellStyle}
                    style={{ alignItems: 'center', justifyContent: 'center', width: '100%' }}
                    onPress={() => router.push(stat.route as any)}
                  >
                    {inner}
                  </ScalePressable>
                );
              }
              return (
                <View key={stat.label} style={cellStyle}>
                  {inner}
                </View>
              );
            })}
          </Animated.View>

          {/* Daily check-in */}
          <ScalePressable
            style={{
              marginHorizontal: 24,
              marginTop: 12,
              backgroundColor: '#ffffff',
              borderRadius: 18,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: '#eef0f3',
            }}
            onPress={() => router.push('/profile/checkin' as any)}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: '#fff5e6',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="flame" size={22} color="#ea580c" />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#0b0b0f' }}>每日签到</Text>
              <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                {checkinQuery.data?.checkedInToday
                  ? `已签到 · 连续 ${checkinQuery.data.currentStreak} 天`
                  : '今日未签到，点击领取奖励'}
              </Text>
            </View>
            {!checkinQuery.data?.checkedInToday ? (
              <View
                style={{
                  backgroundColor: '#e11d48',
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  marginRight: 6,
                }}
              >
                <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '700', letterSpacing: 0.4 }}>
                  签到
                </Text>
              </View>
            ) : null}
            <Ionicons name="chevron-forward" size={18} color={colors.gray300} />
          </ScalePressable>

          {/* Menu groups */}
          {MENU_GROUPS.map((group) => (
            <View key={group.label} style={{ marginTop: 24 }}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '600',
                  color: '#9ca3af',
                  letterSpacing: 1.6,
                  paddingHorizontal: 24,
                  marginBottom: 10,
                }}
              >
                {group.label.toUpperCase()}
              </Text>
              <View
                style={{
                  marginHorizontal: 24,
                  backgroundColor: '#ffffff',
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: '#eef0f3',
                  overflow: 'hidden',
                }}
              >
                {group.items.map((item, i) => (
                  <StaggeredListItem key={item.title} index={i}>
                    <ScalePressable
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        borderTopWidth: i === 0 ? 0 : 1,
                        borderTopColor: '#f4f0ea',
                      }}
                      onPress={() => router.push(item.route as any)}
                    >
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          backgroundColor: item.iconBg,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ionicons name={item.icon} size={18} color={item.iconColor} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#0b0b0f' }}>
                          {item.title}
                        </Text>
                        <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                          {item.description}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.gray300} />
                    </ScalePressable>
                  </StaggeredListItem>
                ))}
              </View>
            </View>
          ))}

          {/* Logout */}
          <ScalePressable
            style={{
              marginHorizontal: 24,
              marginTop: 28,
              backgroundColor: '#ffffff',
              borderRadius: 16,
              paddingVertical: 14,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: '#fde2e6',
            }}
            onPress={handleLogout}
          >
            <Text style={{ color: '#dc2626', fontSize: 14, fontWeight: '600' }}>退出登录</Text>
          </ScalePressable>
        </ScrollView>
      </SafeAreaView>
    </ChromaTransition>
  );
}
