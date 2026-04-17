import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Card } from '@matrimonial/ui';
import { StaggeredListItem } from '../../components/StaggeredListItem';
import { useAnalytics } from '../../hooks/useAnalytics';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface Section {
  title: string;
  description: string;
  icon: IoniconName;
  iconColor: string;
  bgColor: string;
  route: '/explore/circles' | '/explore/activities' | '/explore/buddy';
}

const SECTIONS: Section[] = [
  {
    title: '兴趣圈子',
    description: '找到志同道合的人，从共同爱好开始',
    icon: 'people-circle-outline',
    iconColor: '#8b5cf6',
    bgColor: '#f5f3ff',
    route: '/explore/circles',
  },
  {
    title: '线下活动',
    description: '参加精心组织的线下活动，面对面认识',
    icon: 'calendar-outline',
    iconColor: '#f59e0b',
    bgColor: '#fffbeb',
    route: '/explore/activities',
  },
  {
    title: '搭子广场',
    description: '找饭搭子、运动搭子，轻松开始社交',
    icon: 'sparkles-outline',
    iconColor: '#10b981',
    bgColor: '#ecfdf5',
    route: '/explore/buddy',
  },
];

/** Explore tab */
export default function ExploreTab() {
  const router = useRouter();
  const { track } = useAnalytics();

  const headerOpacity = useSharedValue(0);
  const headerTranslateY = useSharedValue(-20);

  useEffect(() => {
    track('screen_view', { screen_name: 'explore' });
    const cfg = { duration: 400, easing: Easing.out(Easing.cubic) };
    headerOpacity.value = withTiming(1, cfg);
    headerTranslateY.value = withTiming(0, cfg);
  }, [track, headerOpacity, headerTranslateY]);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }));

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <Animated.View style={[headerStyle]} className="px-4 py-4">
        <Text className="text-2xl font-bold text-gray-900">探索</Text>
        <Text className="text-sm text-gray-500 mt-1">发现更多社交方式</Text>
      </Animated.View>

      <View className="flex-1 px-4" style={{ gap: 12 }}>
        {/* Quick Video Match */}
        <StaggeredListItem index={0}>
          <Pressable
            onPress={() => router.push('/chat/quick-match')}
            style={{
              backgroundColor: '#fef2f2', borderRadius: 12,
              padding: 16, flexDirection: 'row', alignItems: 'center',
            }}
          >
            <View style={{
              width: 48, height: 48, borderRadius: 24,
              backgroundColor: '#f43f5e', alignItems: 'center', justifyContent: 'center',
              marginRight: 12,
            }}>
              <Ionicons name="videocam" size={24} color="white" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>视频快速匹配</Text>
              <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>随机匹配，3分钟视频相亲</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </Pressable>
        </StaggeredListItem>

        {SECTIONS.map((section, i) => (
          <StaggeredListItem key={section.title} index={i + 1}>
            <Card
              className="p-4"
              onPress={() => router.push(section.route)}
            >
              <View className="flex-row items-center">
                <View
                  className="w-14 h-14 rounded-2xl items-center justify-center mr-4"
                  style={{ backgroundColor: section.bgColor }}
                >
                  <Ionicons name={section.icon} size={28} color={section.iconColor} />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-gray-900 mb-1">
                    {section.title}
                  </Text>
                  <Text className="text-sm text-gray-500">{section.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
              </View>
            </Card>
          </StaggeredListItem>
        ))}
      </View>
    </SafeAreaView>
  );
}
