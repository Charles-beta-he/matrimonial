import { useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button, Card, Input } from '@matrimonial/ui';

const CATEGORIES = ['全部', '读书', '运动', '旅行', '美食', '音乐', '电影', '摄影', '手工'];

const MOCK_CIRCLES = [
  { id: '1', name: '书虫俱乐部', members: 2386, cover: '📚', category: '读书' },
  { id: '2', name: '跑步爱好者', members: 1845, cover: '🏃', category: '运动' },
  { id: '3', name: '环球旅行家', members: 3120, cover: '✈️', category: '旅行' },
  { id: '4', name: '美食探店团', members: 4210, cover: '🍜', category: '美食' },
  { id: '5', name: '吉他交流群', members: 968, cover: '🎸', category: '音乐' },
  { id: '6', name: '独立电影社', members: 1567, cover: '🎬', category: '电影' },
  { id: '7', name: '户外徒步群', members: 2045, cover: '⛰️', category: '运动' },
  { id: '8', name: '烘焙工坊', members: 1234, cover: '🧁', category: '美食' },
];

/** Interest circles screen */
export default function CirclesScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('全部');

  const filteredCircles = MOCK_CIRCLES.filter((c) => {
    const matchesCategory = selectedCategory === '全部' || c.category === selectedCategory;
    const matchesSearch = !search || c.name.includes(search);
    return matchesCategory && matchesSearch;
  });

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={() => router.back()} className="mr-3">
          <Text className="text-lg">&lt;</Text>
        </Pressable>
        <Text className="text-xl font-bold text-gray-900">兴趣圈子</Text>
      </View>

      {/* Search */}
      <View className="px-4 mb-3">
        <Input
          placeholder="搜索圈子"
          value={search}
          onChangeText={setSearch}
          leftIcon={<Text className="text-gray-400">🔍</Text>}
        />
      </View>

      {/* Category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, marginBottom: 12 }}
        className="max-h-10"
      >
        {CATEGORIES.map((cat) => (
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

      {/* Circles grid */}
      <FlatList
        data={filteredCircles}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 12, paddingBottom: 24 }}
        columnWrapperStyle={{ gap: 12 }}
        renderItem={({ item }) => (
          <Card className="flex-1 p-4">
            <View className="items-center">
              <View className="w-14 h-14 rounded-2xl bg-gray-100 items-center justify-center mb-2">
                <Text className="text-2xl">{item.cover}</Text>
              </View>
              <Text className="text-sm font-semibold text-gray-900 mb-1">{item.name}</Text>
              <Text className="text-xs text-gray-400 mb-3">{item.members} 成员</Text>
              <Button title="加入" variant="outline" size="sm" />
            </View>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}
