import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Card } from '@matrimonial/ui';
import { useAnalytics } from '../../hooks/useAnalytics';

const SECTIONS = [
  {
    title: '兴趣圈子',
    description: '找到志同道合的人，从共同爱好开始',
    icon: '🎯',
    route: '/explore/circles' as const,
    color: 'bg-purple-50',
  },
  {
    title: '线下活动',
    description: '参加精心组织的线下活动，面对面认识',
    icon: '🎉',
    route: '/explore/activities' as const,
    color: 'bg-amber-50',
  },
  {
    title: '搭子广场',
    description: '找饭搭子、运动搭子，轻松开始社交',
    icon: '🤝',
    route: '/explore/buddy' as const,
    color: 'bg-green-50',
  },
];

/** Explore tab */
export default function ExploreTab() {
  const router = useRouter();
  const { track } = useAnalytics();

  useEffect(() => {
    track('screen_view', { screen_name: 'explore' });
  }, [track]);

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 py-3">
        <Text className="text-2xl font-bold text-gray-900">探索</Text>
      </View>

      <View className="flex-1 px-4" style={{ gap: 12 }}>
        {SECTIONS.map((section) => (
          <Card
            key={section.title}
            className="p-4"
            onPress={() => router.push(section.route)}
          >
            <View className="flex-row items-center">
              <View
                className={`w-14 h-14 rounded-2xl items-center justify-center mr-4 ${section.color}`}
              >
                <Text className="text-2xl">{section.icon}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-lg font-semibold text-gray-900 mb-1">
                  {section.title}
                </Text>
                <Text className="text-sm text-gray-500">{section.description}</Text>
              </View>
              <Text className="text-gray-300 text-lg">&gt;</Text>
            </View>
          </Card>
        ))}
      </View>
    </SafeAreaView>
  );
}
