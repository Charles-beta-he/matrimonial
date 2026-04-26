import { useEffect } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StaggeredListItem } from '../../components/StaggeredListItem';
import { ScalePressable } from '../../components/ScalePressable';
import { ChromaTransition } from '../../components/ChromaTransition';
import { TabHeader } from '../../components/TabHeader';
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
    description: '志同道合的小群，从共同爱好开始',
    icon: 'people-circle-outline',
    iconColor: '#7c3aed',
    bgColor: '#f4eeff',
    route: '/explore/circles',
  },
  {
    title: '线下活动',
    description: '精选活动，面对面认识真实的彼此',
    icon: 'calendar-outline',
    iconColor: '#ca8a04',
    bgColor: '#fff8e0',
    route: '/explore/activities',
  },
  {
    title: '搭子广场',
    description: '饭搭子、运动搭子，从轻量社交开始',
    icon: 'sparkles-outline',
    iconColor: '#0d9488',
    bgColor: '#e6f6f3',
    route: '/explore/buddy',
  },
];

export default function ExploreTab() {
  const router = useRouter();
  const { track } = useAnalytics();

  useEffect(() => {
    track('screen_view', { screen_name: 'explore' });
  }, [track]);

  return (
    <ChromaTransition>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fdfcfa' }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          <TabHeader eyebrow="探索 · DISCOVER" title="多种相遇方式" subtitle="不止滑卡片，还有视频、圈子、活动" />

          {/* Hero feature card */}
          <View style={{ paddingHorizontal: 24 }}>
            <StaggeredListItem index={0}>
              <ScalePressable
                onPress={() => router.push('/chat/quick-match')}
                containerStyle={{
                  borderRadius: 22,
                  shadowColor: '#0b0b0f',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.12,
                  shadowRadius: 18,
                }}
                style={{
                  backgroundColor: '#0b0b0f',
                  borderRadius: 22,
                  padding: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: '#e11d48',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 16,
                  }}
                >
                  <Ionicons name="videocam" size={26} color={colors.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '600',
                      color: '#fb7185',
                      letterSpacing: 1.4,
                      marginBottom: 4,
                    }}
                  >
                    LIVE · 即刻匹配
                  </Text>
                  <Text style={{ fontSize: 17, fontWeight: '700', color: '#ffffff', marginBottom: 4 }}>
                    视频快速匹配
                  </Text>
                  <Text style={{ fontSize: 12, color: '#9ca3af' }}>
                    随机一位真实用户，3 分钟视频相亲
                  </Text>
                </View>
                <Ionicons name="arrow-forward" size={20} color="#ffffff" />
              </ScalePressable>
            </StaggeredListItem>
          </View>

          {/* Section eyebrow */}
          <View style={{ paddingHorizontal: 24, paddingTop: 28, paddingBottom: 12 }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '600',
                color: '#9ca3af',
                letterSpacing: 1.6,
              }}
            >
              更多方式
            </Text>
          </View>

          <View style={{ paddingHorizontal: 24, gap: 12 }}>
            {SECTIONS.map((section, i) => (
              <StaggeredListItem key={section.title} index={i + 1}>
                <ScalePressable
                  onPress={() => router.push(section.route)}
                  containerStyle={{ borderRadius: 18 }}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 18,
                    padding: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#eef0f3',
                  }}
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      backgroundColor: section.bgColor,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 14,
                    }}
                  >
                    <Ionicons name={section.icon} size={22} color={section.iconColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: '#0b0b0f', marginBottom: 2 }}>
                      {section.title}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#6b7280' }} numberOfLines={1}>
                      {section.description}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.gray300} />
                </ScalePressable>
              </StaggeredListItem>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ChromaTransition>
  );
}
