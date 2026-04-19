import { useEffect } from 'react';
import { Text, View } from 'react-native';
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
import { ScalePressable } from '../../components/ScalePressable';
import { ChromaTransition } from '../../components/ChromaTransition';
import { useAnalytics } from '../../hooks/useAnalytics';
import { colors } from '../../constants/colors';

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
    iconColor: colors.purple,
    bgColor: colors.purpleBg,
    route: '/explore/circles',
  },
  {
    title: '线下活动',
    description: '参加精心组织的线下活动，面对面认识',
    icon: 'calendar-outline',
    iconColor: colors.warning,
    bgColor: colors.warningBg,
    route: '/explore/activities',
  },
  {
    title: '搭子广场',
    description: '找饭搭子、运动搭子，轻松开始社交',
    icon: 'sparkles-outline',
    iconColor: colors.green,
    bgColor: colors.greenBg,
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
    <ChromaTransition>
    <SafeAreaView className="flex-1 bg-gray-50">
      <Animated.View style={[{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }, headerStyle]}>
        <Text className="text-2xl font-bold text-gray-900">探索</Text>
        <Text className="text-sm text-gray-500 mt-1">发现更多社交方式</Text>
      </Animated.View>

      <View className="flex-1 px-4" style={{ gap: 12 }}>
        {/* Quick Video Match */}
        <StaggeredListItem index={0}>
          <ScalePressable
            onPress={() => router.push('/chat/quick-match')}
            style={{
              backgroundColor: colors.errorBg, borderRadius: 12,
              padding: 16, flexDirection: 'row', alignItems: 'center',
            }}
          >
            <View style={{
              width: 48, height: 48, borderRadius: 24,
              backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
              marginRight: 12,
            }}>
              <Ionicons name="videocam" size={24} color={colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: colors.gray900 }}>视频快速匹配</Text>
              <Text style={{ fontSize: 13, color: colors.gray500, marginTop: 2 }}>随机匹配，3分钟视频相亲</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
          </ScalePressable>
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
                  <Text className="text-sm text-gray-500" numberOfLines={1}>{section.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.gray300} />
              </View>
            </Card>
          </StaggeredListItem>
        ))}
      </View>
    </SafeAreaView>
    </ChromaTransition>
  );
}
