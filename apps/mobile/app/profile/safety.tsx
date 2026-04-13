import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Input } from '@matrimonial/ui';

/** Safety tools screen */
export default function SafetyScreen() {
  const router = useRouter();
  const [emergencyContact, setEmergencyContact] = useState('');

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center px-4 py-3 bg-white">
        <Pressable onPress={() => router.back()} className="mr-3">
          <Ionicons name="chevron-back" size={24} color="#374151" />
        </Pressable>
        <Text className="text-lg font-semibold text-gray-900">安全工具</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Emergency contact */}
        <View className="bg-white mt-2 p-4">
          <View className="flex-row items-center mb-3" style={{ gap: 8 }}>
            <Ionicons name="call" size={18} color="#3b82f6" />
            <Text className="text-base font-semibold text-gray-900">紧急联系人</Text>
          </View>
          <Text className="text-sm text-gray-500 mb-3">
            设置紧急联系人，在遇到危险时可以一键发送求助信息
          </Text>
          <Input
            placeholder="输入手机号"
            value={emergencyContact}
            onChangeText={setEmergencyContact}
            maxLength={11}
          />
          <View className="mt-3">
            <Button
              title="保存联系人"
              variant="primary"
              size="sm"
              onPress={() => Alert.alert('已保存', '紧急联系人已设置')}
              disabled={!emergencyContact}
            />
          </View>
        </View>

        {/* Date check-in */}
        <Card className="mx-4 mt-4 p-4">
          <View className="flex-row items-center mb-2" style={{ gap: 8 }}>
            <Ionicons name="location" size={18} color="#f59e0b" />
            <Text className="text-base font-semibold text-gray-900">约会报备</Text>
          </View>
          <Text className="text-sm text-gray-500 mb-2">
            约会前向紧急联系人分享你的约会信息（时间、地点、对方资料），系统会自动在约会结束后询问你是否安全。
          </Text>
          <Text className="text-xs text-gray-400">
            如果在约定时间内没有回复，系统将自动通知紧急联系人。
          </Text>
        </Card>

        {/* SOS Button */}
        <View className="items-center mt-6 px-4">
          <Text className="text-base font-semibold text-gray-900 mb-2">SOS 紧急按钮</Text>
          <Text className="text-sm text-gray-500 text-center mb-4">
            遇到紧急情况时按下此按钮，系统将向紧急联系人发送你的位置信息
          </Text>
          <Pressable
            className="w-32 h-32 rounded-full bg-red-500 items-center justify-center"
            style={
              Platform.OS === 'web'
                ? { boxShadow: '0 4px 16px rgba(239,68,68,0.3)' }
                : { shadowColor: '#ef4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }
            }
            onPress={() =>
              Alert.alert(
                '紧急求助',
                '确定发送求助信息给紧急联系人吗？',
                [
                  { text: '取消', style: 'cancel' },
                  {
                    text: '确定',
                    style: 'destructive',
                    onPress: () =>
                      Alert.alert(
                        '已发送',
                        '功能开发中，正式环境将发送给紧急联系人',
                      ),
                  },
                ],
              )
            }
          >
            <Text className="text-white text-3xl font-bold">SOS</Text>
          </Pressable>
        </View>

        {/* Post-date feedback */}
        <Card className="mx-4 mt-6 p-4 mb-8">
          <View className="flex-row items-center mb-2" style={{ gap: 8 }}>
            <Ionicons name="chatbubbles" size={18} color="#10b981" />
            <Text className="text-base font-semibold text-gray-900">约后反馈</Text>
          </View>
          <Text className="text-sm text-gray-500">
            约会结束后，你可以对约会体验进行匿名反馈。如果遇到不当行为，平台会进行调查处理，保护其他用户的安全。
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
