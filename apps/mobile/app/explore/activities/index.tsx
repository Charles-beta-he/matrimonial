import { useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button, Card } from '@matrimonial/ui';

const ACTIVITY_CATEGORIES = ['全部', '聚餐', '户外', '文化', '运动', '桌游'];

interface Activity {
  id: string;
  title: string;
  time: string;
  location: string;
  maleCount: number;
  maleMax: number;
  femaleCount: number;
  femaleMax: number;
  fee: string;
  category: string;
  cover: string;
}

const MOCK_ACTIVITIES: Activity[] = [
  {
    id: 'a1',
    title: '周末精致火锅局',
    time: '4月13日 18:00',
    location: '朝阳区·海底捞',
    maleCount: 3,
    maleMax: 5,
    femaleCount: 4,
    femaleMax: 5,
    fee: '¥128/人',
    category: '聚餐',
    cover: '🍲',
  },
  {
    id: 'a2',
    title: '奥森公园徒步交友',
    time: '4月14日 09:00',
    location: '朝阳区·奥林匹克森林公园',
    maleCount: 5,
    maleMax: 8,
    femaleCount: 3,
    femaleMax: 8,
    fee: '免费',
    category: '户外',
    cover: '🥾',
  },
  {
    id: 'a3',
    title: '周五桌游之夜',
    time: '4月18日 19:00',
    location: '海淀区·集石桌游馆',
    maleCount: 2,
    maleMax: 4,
    femaleCount: 2,
    femaleMax: 4,
    fee: '¥68/人',
    category: '桌游',
    cover: '🎲',
  },
  {
    id: 'a4',
    title: '国家博物馆看展',
    time: '4月19日 14:00',
    location: '东城区·国家博物馆',
    maleCount: 4,
    maleMax: 6,
    femaleCount: 5,
    femaleMax: 6,
    fee: '¥30/人',
    category: '文化',
    cover: '🏛️',
  },
];

/** Offline activities screen */
export default function ActivitiesScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('全部');

  const filtered = MOCK_ACTIVITIES.filter(
    (a) => selectedCategory === '全部' || a.category === selectedCategory,
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={() => router.back()} className="mr-3">
          <Text className="text-lg">&lt;</Text>
        </Pressable>
        <Text className="text-xl font-bold text-gray-900">线下活动</Text>
      </View>

      {/* Category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, marginBottom: 12 }}
        className="max-h-10"
      >
        {ACTIVITY_CATEGORIES.map((cat) => (
          <Pressable
            key={cat}
            className={`rounded-full px-4 py-1.5 ${
              selectedCategory === cat ? 'bg-rose-500' : 'bg-white'
            }`}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text
              className={`text-sm ${
                selectedCategory === cat ? 'text-white font-medium' : 'text-gray-600'
              }`}
            >
              {cat}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Activity list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 24 }}
        renderItem={({ item }) => (
          <Card className="overflow-hidden">
            {/* Cover */}
            <View className="h-32 bg-gray-200 items-center justify-center">
              <Text className="text-5xl">{item.cover}</Text>
            </View>
            <View className="p-4">
              <Text className="text-base font-semibold text-gray-900 mb-2">
                {item.title}
              </Text>
              <View style={{ gap: 4 }}>
                <Text className="text-sm text-gray-500">⏰ {item.time}</Text>
                <Text className="text-sm text-gray-500">📍 {item.location}</Text>
                <View className="flex-row items-center">
                  <Text className="text-sm text-blue-500">
                    男 {item.maleCount}/{item.maleMax}
                  </Text>
                  <Text className="text-sm text-gray-300 mx-2">·</Text>
                  <Text className="text-sm text-rose-500">
                    女 {item.femaleCount}/{item.femaleMax}
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center justify-between mt-3">
                <Text className="text-lg font-bold text-rose-500">{item.fee}</Text>
                <Button title="报名" variant="primary" size="sm" />
              </View>
            </View>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}
