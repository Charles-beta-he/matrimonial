import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Avatar, Badge, Card } from '@matrimonial/ui';

interface BuddyPost {
  id: string;
  nickname: string;
  avatar: string;
  content: string;
  tags: string[];
  time: string;
  interested: number;
}

const MOCK_POSTS: BuddyPost[] = [
  {
    id: 'b1',
    nickname: '小林',
    avatar: 'https://picsum.photos/seed/b1/100/100',
    content: '找饭搭子 | 周末想去三里屯那家新开的日料店，有人一起吗？AA制，最好是吃货~',
    tags: ['饭搭子', '日料'],
    time: '2小时前',
    interested: 5,
  },
  {
    id: 'b2',
    nickname: '阿杰',
    avatar: 'https://picsum.photos/seed/b2/100/100',
    content: '找运动搭子 | 工作日晚上约打羽毛球，望京附近，水平中等偏上，求组队',
    tags: ['运动搭子', '羽毛球'],
    time: '3小时前',
    interested: 8,
  },
  {
    id: 'b3',
    nickname: '思思',
    avatar: 'https://picsum.photos/seed/b3/100/100',
    content: '找旅行搭子 | 五一想去大理，已经订好了机票，还差一个小伙伴一起自驾环洱海',
    tags: ['旅行搭子', '大理'],
    time: '5小时前',
    interested: 12,
  },
  {
    id: 'b4',
    nickname: '大伟',
    avatar: 'https://picsum.photos/seed/b4/100/100',
    content: '找学习搭子 | 周末一起去国图自习？互相监督效率更高，可以中午一起吃饭交流',
    tags: ['学习搭子', '自习'],
    time: '6小时前',
    interested: 3,
  },
  {
    id: 'b5',
    nickname: '小雨',
    avatar: 'https://picsum.photos/seed/b5/100/100',
    content: '找电影搭子 | 想看最新上映的科幻片，周五晚场，朝阳大悦城附近，看完可以聊剧情',
    tags: ['电影搭子', '科幻'],
    time: '8小时前',
    interested: 6,
  },
];

/** Buddy square screen */
export default function BuddyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={() => router.back()} className="mr-3">
          <Text className="text-lg">&lt;</Text>
        </Pressable>
        <Text className="text-xl font-bold text-gray-900">搭子广场</Text>
      </View>

      <FlatList
        data={MOCK_POSTS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 80 }}
        renderItem={({ item }) => (
          <Card className="p-4">
            {/* Header */}
            <View className="flex-row items-center mb-3">
              <Avatar source={{ uri: item.avatar }} size={40} />
              <View className="ml-3 flex-1">
                <Text className="text-sm font-semibold text-gray-900">
                  {item.nickname}
                </Text>
                <Text className="text-xs text-gray-400">{item.time}</Text>
              </View>
            </View>

            {/* Content */}
            <Text className="text-base text-gray-800 mb-3 leading-6">
              {item.content}
            </Text>

            {/* Tags */}
            <View className="flex-row flex-wrap mb-3" style={{ gap: 6 }}>
              {item.tags.map((tag) => (
                <Badge key={tag} label={`#${tag}`} variant="tag" />
              ))}
            </View>

            {/* Action */}
            <View className="flex-row items-center justify-between">
              <Text className="text-xs text-gray-400">
                {item.interested} 人感兴趣
              </Text>
              <Pressable className="bg-rose-50 rounded-full px-4 py-1.5">
                <Text className="text-sm text-rose-500 font-medium">我想去</Text>
              </Pressable>
            </View>
          </Card>
        )}
      />

      {/* FAB */}
      <Pressable
        className="absolute bottom-6 right-6 w-14 h-14 bg-rose-500 rounded-full items-center justify-center shadow-lg"
        onPress={() => {
          // TODO: navigate to post creation screen
        }}
      >
        <Text className="text-white text-2xl font-light">+</Text>
      </Pressable>
    </SafeAreaView>
  );
}
