import { useState } from 'react';
import { useScreenTracking } from '../../hooks/useAnalytics';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { StaggeredListItem } from '../../components/StaggeredListItem';
import { ScalePressable } from '../../components/ScalePressable';
import { colors } from '../../constants/colors';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Card } from '@matrimonial/ui';
import { Ionicons } from '@expo/vector-icons';
import {
  useVideoRooms,
  useCreateVideoRoom,
  useJoinVideoRoom,
} from '@matrimonial/api-client';
import { ScreenHeader } from '../../components/ScreenHeader';

type TabType = '1v1' | 'hosted';

/** Video dating hall screen */
export default function VideoHallScreen() {
  useScreenTracking('video_hall');
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('1v1');
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('综合');

  const roomsQuery = useVideoRooms();
  const createRoom = useCreateVideoRoom();
  const joinRoom = useJoinVideoRoom();

  const tabGlow = useSharedValue(0);
  const tabGlowStyle = useAnimatedStyle(() => ({
    opacity: tabGlow.value,
  }));

  const switchTab = (tab: TabType) => {
    setActiveTab(tab);
    tabGlow.value = withSpring(0.4, { damping: 8, stiffness: 300 }, () => {
      tabGlow.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) });
    });
  };

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
      <ScreenHeader title="视频相亲大厅" />

      {/* Quick Match Entry Card */}
      <ScalePressable
        onPress={() => router.push('/chat/quick-match')}
        className="mx-4 mt-4 mb-4 bg-gradient-to-r rounded-2xl overflow-hidden"
      >
        <View className="bg-rose-500 rounded-2xl p-4 flex-row items-center">
          <View className="w-12 h-12 rounded-full bg-white/20 items-center justify-center mr-3">
            <Ionicons name="flash" size={28} color={colors.white} />
          </View>
          <View className="flex-1">
            <Text className="text-white text-lg font-bold">视频速配</Text>
            <Text className="text-white/80 text-xs">3分钟随机匹配，快速了解新朋友</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.white} />
        </View>
      </ScalePressable>

      {/* Tabs */}
      <View className="flex-row mx-4 bg-gray-100 rounded-xl p-1 mb-4" style={{ overflow: 'hidden' }}>
        {/* Glow overlay — activates on tab switch */}
        <Animated.View
          pointerEvents="none"
          style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.primary, borderRadius: 12 }, tabGlowStyle]}
        />
        <ScalePressable
          containerStyle={{ flex: 1, borderRadius: 8, backgroundColor: activeTab === '1v1' ? '#fff' : 'transparent', alignItems: 'center', paddingVertical: 10 }}
          onPress={() => switchTab('1v1')}
        >
          <Text style={{ fontSize: 14, fontWeight: '500', color: activeTab === '1v1' ? '#f43f5e' : '#6b7280' }}>
            1v1 快速匹配
          </Text>
        </ScalePressable>
        <ScalePressable
          containerStyle={{ flex: 1, borderRadius: 8, backgroundColor: activeTab === 'hosted' ? '#fff' : 'transparent', alignItems: 'center', paddingVertical: 10 }}
          onPress={() => switchTab('hosted')}
        >
          <Text style={{ fontSize: 14, fontWeight: '500', color: activeTab === 'hosted' ? '#f43f5e' : '#6b7280' }}>
            红娘主持房
          </Text>
        </ScalePressable>
      </View>

      {activeTab === '1v1' ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-40 h-40 rounded-full bg-rose-100 items-center justify-center mb-6">
            <Ionicons name="videocam-outline" size={72} color={colors.primary} />
          </View>
          <Text className="text-lg font-semibold text-gray-900 mb-2">1v1 视频快聊</Text>
          <Text className="text-sm text-gray-500 text-center mb-8">
            1v1 视频通话仅向匹配成功的用户开放{'\n'}请从聊天列表进入视频通话
          </Text>
          <ScalePressable
            className="bg-rose-500 rounded-full px-12 py-4 shadow-lg opacity-80"
            onPress={() =>
              Alert.alert('提示', '请先在"发现"中匹配对象，匹配成功后可在聊天中发起视频通话')
            }
          >
            <Text className="text-white text-lg font-bold">去匹配</Text>
          </ScalePressable>
        </View>
      ) : (
        <View className="flex-1">
          {roomsQuery.isLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color={colors.primary} />
              <Text className="text-sm text-gray-500 mt-2">正在加载房间...</Text>
            </View>
          ) : roomsQuery.isError ? (
            <View className="flex-1 items-center justify-center px-8">
              <Text className="text-base text-gray-700 mb-2">加载失败</Text>
              <Text className="text-sm text-gray-400 mb-4 text-center">
                视频大厅暂时不可用，请稍后再试
              </Text>
              <ScalePressable
                onPress={() => roomsQuery.refetch()}
                className="bg-rose-500 rounded-full px-6 py-2"
              >
                <Text className="text-white font-medium">重试</Text>
              </ScalePressable>
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
              renderItem={({ item, index }) => (
                <StaggeredListItem index={index}>
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
                    <ScalePressable
                      onPress={() => handleJoinRoom(item.id)}
                      disabled={joinRoom.isPending}
                      className="bg-rose-500 rounded-full px-4 py-2"
                    >
                      <Text className="text-white text-sm font-medium">进入</Text>
                    </ScalePressable>
                  </View>
                </Card>
                </StaggeredListItem>
              )}
            />
          )}

          {/* Floating create button */}
          <ScalePressable
            onPress={() => setCreateOpen(true)}
            containerStyle={{ position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#f43f5e', alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="add" size={30} color={colors.white} />
          </ScalePressable>
        </View>
      )}

      {/* Create room modal */}
      <Modal visible={createOpen} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6">
            <Text className="text-xl font-bold text-gray-900 mb-4">创建主持房</Text>

            <Text className="text-sm text-gray-600 mb-2">房间标题</Text>
            <TextInput
              aria-label="房间标题"
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="例如：周末轻聊局"
              maxLength={50}
              className="border border-gray-200 rounded-xl px-4 py-3 mb-4 text-base"
            />

            <Text className="text-sm text-gray-600 mb-2">分类</Text>
            <View className="flex-row flex-wrap gap-2 mb-6">
              {['综合', '90后', '读书', '旅行', '美食'].map((cat) => (
                <ScalePressable
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
                </ScalePressable>
              ))}
            </View>

            <View className="flex-row gap-3">
              <ScalePressable
                containerStyle={{ flex: 1, backgroundColor: '#f3f4f6', borderRadius: 24, paddingVertical: 12, alignItems: 'center' }}
                onPress={() => setCreateOpen(false)}
              >
                <Text className="text-gray-700 font-medium">取消</Text>
              </ScalePressable>
              <ScalePressable
                containerStyle={{ flex: 1, backgroundColor: '#f43f5e', borderRadius: 24, paddingVertical: 12, alignItems: 'center' }}
                onPress={handleCreate}
                disabled={createRoom.isPending}
              >
                <Text className="text-white font-medium">
                  {createRoom.isPending ? '创建中...' : '创建'}
                </Text>
              </ScalePressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
