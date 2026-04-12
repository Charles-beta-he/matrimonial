import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Card } from '@matrimonial/ui';
import {
  useVideoRooms,
  useCreateVideoRoom,
  useJoinVideoRoom,
} from '@matrimonial/api-client';

type TabType = '1v1' | 'hosted';

/** Video dating hall screen */
export default function VideoHallScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('1v1');
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('综合');

  const roomsQuery = useVideoRooms();
  const createRoom = useCreateVideoRoom();
  const joinRoom = useJoinVideoRoom();

  const handleJoinRoom = async (roomId: string) => {
    try {
      const result = await joinRoom.mutateAsync({ roomId });
      router.push({
        pathname: '/chat/video-call',
        params: {
          roomName: result.room.roomName,
          token: result.token,
          wsUrl: result.wsUrl,
          userName: result.room.hostName,
          roomId: result.room.id,
        },
      });
    } catch (e: any) {
      Alert.alert('加入失败', e?.message ?? '未知错误');
    }
  };

  const handleCreate = async () => {
    if (newTitle.trim().length < 2) {
      Alert.alert('提示', '标题至少 2 个字符');
      return;
    }
    try {
      const result = await createRoom.mutateAsync({
        title: newTitle.trim(),
        category: newCategory,
      });
      setCreateOpen(false);
      setNewTitle('');
      router.push({
        pathname: '/chat/video-call',
        params: {
          roomName: result.room.roomName,
          token: result.token,
          wsUrl: result.wsUrl,
          userName: result.room.hostName,
          roomId: result.room.id,
        },
      });
    } catch (e: any) {
      Alert.alert('创建失败', e?.message ?? '未知错误');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={() => router.back()} className="mr-3">
          <Text className="text-lg">&lt;</Text>
        </Pressable>
        <Text className="text-xl font-bold text-gray-900">视频相亲大厅</Text>
      </View>

      {/* Tabs */}
      <View className="flex-row mx-4 bg-gray-100 rounded-xl p-1 mb-4">
        <Pressable
          className={`flex-1 py-2.5 rounded-lg items-center ${
            activeTab === '1v1' ? 'bg-white shadow-sm' : ''
          }`}
          onPress={() => setActiveTab('1v1')}
        >
          <Text
            className={`text-sm font-medium ${
              activeTab === '1v1' ? 'text-rose-500' : 'text-gray-500'
            }`}
          >
            1v1 快速匹配
          </Text>
        </Pressable>
        <Pressable
          className={`flex-1 py-2.5 rounded-lg items-center ${
            activeTab === 'hosted' ? 'bg-white shadow-sm' : ''
          }`}
          onPress={() => setActiveTab('hosted')}
        >
          <Text
            className={`text-sm font-medium ${
              activeTab === 'hosted' ? 'text-rose-500' : 'text-gray-500'
            }`}
          >
            红娘主持房
          </Text>
        </Pressable>
      </View>

      {activeTab === '1v1' ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-40 h-40 rounded-full bg-rose-100 items-center justify-center mb-6">
            <Text className="text-6xl">📹</Text>
          </View>
          <Text className="text-lg font-semibold text-gray-900 mb-2">1v1 视频快聊</Text>
          <Text className="text-sm text-gray-500 text-center mb-8">
            1v1 视频通话仅向匹配成功的用户开放{'\n'}请从聊天列表进入视频通话
          </Text>
          <Pressable
            className="bg-rose-500 rounded-full px-12 py-4 shadow-lg opacity-80"
            onPress={() =>
              Alert.alert('提示', '请先在"发现"中匹配对象，匹配成功后可在聊天中发起视频通话')
            }
          >
            <Text className="text-white text-lg font-bold">去匹配</Text>
          </Pressable>
        </View>
      ) : (
        <View className="flex-1">
          {roomsQuery.isLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#f43f5e" />
            </View>
          ) : (
            <FlatList
              data={roomsQuery.data ?? []}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 80 }}
              ListEmptyComponent={
                <View className="items-center justify-center py-20">
                  <Text className="text-gray-400">暂无开放房间，点击 + 创建一个</Text>
                </View>
              }
              refreshing={roomsQuery.isFetching}
              onRefresh={() => roomsQuery.refetch()}
              renderItem={({ item }) => (
                <Card className="p-4">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-gray-900 mb-1">
                        {item.title}
                      </Text>
                      <Text className="text-xs text-rose-500 mb-1">#{item.category}</Text>
                      <Text className="text-sm text-gray-500">主持: {item.hostName}</Text>
                      <Text className="text-xs text-gray-400 mt-1">
                        {item.participantCount}/{item.maxParticipants} 人
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => handleJoinRoom(item.id)}
                      disabled={joinRoom.isPending}
                      className="bg-rose-500 rounded-full px-4 py-2"
                    >
                      <Text className="text-white text-sm font-medium">进入</Text>
                    </Pressable>
                  </View>
                </Card>
              )}
            />
          )}

          {/* Floating create button */}
          <Pressable
            onPress={() => setCreateOpen(true)}
            className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-rose-500 items-center justify-center shadow-lg"
          >
            <Text className="text-white text-3xl">+</Text>
          </Pressable>
        </View>
      )}

      {/* Create room modal */}
      <Modal visible={createOpen} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6">
            <Text className="text-xl font-bold text-gray-900 mb-4">创建主持房</Text>

            <Text className="text-sm text-gray-600 mb-2">房间标题</Text>
            <TextInput
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="例如：周末轻聊局"
              maxLength={50}
              className="border border-gray-200 rounded-xl px-4 py-3 mb-4 text-base"
            />

            <Text className="text-sm text-gray-600 mb-2">分类</Text>
            <View className="flex-row flex-wrap gap-2 mb-6">
              {['综合', '90后', '读书', '旅行', '美食'].map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => setNewCategory(cat)}
                  className={`px-4 py-2 rounded-full border ${
                    newCategory === cat
                      ? 'bg-rose-500 border-rose-500'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <Text className={newCategory === cat ? 'text-white' : 'text-gray-700'}>
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setCreateOpen(false)}
                className="flex-1 bg-gray-100 rounded-full py-3 items-center"
              >
                <Text className="text-gray-700 font-medium">取消</Text>
              </Pressable>
              <Pressable
                onPress={handleCreate}
                disabled={createRoom.isPending}
                className="flex-1 bg-rose-500 rounded-full py-3 items-center"
              >
                <Text className="text-white font-medium">
                  {createRoom.isPending ? '创建中...' : '创建'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
