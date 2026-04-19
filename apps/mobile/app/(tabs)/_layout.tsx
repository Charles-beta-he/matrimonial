import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus, Text } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedTabIcon } from '@/components/AnimatedTabIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@matrimonial/api-client';
import { colors } from '../../constants/colors';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const ICONS: Record<string, { focused: IoniconName; unfocused: IoniconName }> = {
  index: { focused: 'flame', unfocused: 'flame-outline' },
  explore: { focused: 'compass', unfocused: 'compass-outline' },
  messages: { focused: 'chatbubbles', unfocused: 'chatbubbles-outline' },
  profile: { focused: 'person', unfocused: 'person-outline' },
};

const LABELS: Record<string, string> = {
  index: '发现',
  explore: '探索',
  messages: '消息',
  profile: '我的',
};

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);
  const updateLastActiveMut = api.user.updateLastActive.useMutation();
  const chatListQuery = api.chat.list.useQuery(undefined, { refetchInterval: 30_000 });
  const unreadCount = ((chatListQuery.data ?? []) as any[]).filter((c) => (c.unreadCount ?? 0) > 0).length;
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    // Call once on mount (app is in foreground)
    updateLastActiveMut.mutate();

    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        updateLastActiveMut.mutate();
      }
      appState.current = nextState;
    });

    return () => sub.remove();
  }, []);
  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray400,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.gray100,
          height: 68 + bottomInset,
          paddingBottom: bottomInset + 4,
          paddingTop: 10,
        },
        title: LABELS[route.name] ?? route.name,
        tabBarLabel: ({ color }) => (
          <Text
            style={{
              color,
              fontSize: 11,
              fontWeight: '600',
              lineHeight: 14,
              marginTop: 4,
              textAlign: 'center',
            }}
          >
            {LABELS[route.name] ?? route.name}
          </Text>
        ),
        tabBarIcon: ({ color, focused, size }) => {
          const set = ICONS[route.name];
          if (!set) return null;
          return (
            <AnimatedTabIcon
              name={focused ? set.focused : set.unfocused}
              focused={focused}
              color={color}
              size={size ?? 24}
              badgeCount={route.name === 'messages' ? unreadCount : 0}
            />
          );
        },
      })}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="explore" />
      <Tabs.Screen name="messages" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
