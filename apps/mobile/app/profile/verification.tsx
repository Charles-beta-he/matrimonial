import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button, Card } from '@matrimonial/ui';
import { VERIFICATION_LEVEL_LABELS } from '@matrimonial/shared';

interface VerificationItem {
  level: string;
  label: string;
  description: string;
  unlocks: string;
  completed: boolean;
  icon: string;
}

const LEVELS: VerificationItem[] = [
  {
    level: 'L1',
    label: VERIFICATION_LEVEL_LABELS.L1 ?? '手机认证',
    description: '绑定手机号码，验证真实身份',
    unlocks: '解锁基础匹配功能',
    completed: true,
    icon: '📱',
  },
  {
    level: 'L2',
    label: VERIFICATION_LEVEL_LABELS.L2 ?? '身份认证',
    description: '上传身份证件，平台审核',
    unlocks: '解锁查看匹配对象的详细资料',
    completed: false,
    icon: '🪪',
  },
  {
    level: 'L3',
    label: VERIFICATION_LEVEL_LABELS.L3 ?? '真人认证',
    description: '进行活体检测，确认真人',
    unlocks: '获得真人认证标识，匹配优先级提升',
    completed: false,
    icon: '🤳',
  },
  {
    level: 'L4',
    label: VERIFICATION_LEVEL_LABELS.L4 ?? '学历认证',
    description: '上传学位证书，平台审核',
    unlocks: '获得学历认证标识，专属匹配池',
    completed: false,
    icon: '🎓',
  },
];

/** Verification center screen */
export default function VerificationScreen() {
  const router = useRouter();

  const completedCount = LEVELS.filter((l) => l.completed).length;
  const progress = completedCount / LEVELS.length;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center px-4 py-3 bg-white">
        <Pressable onPress={() => router.back()} className="mr-3">
          <Text className="text-lg">&lt;</Text>
        </Pressable>
        <Text className="text-lg font-semibold text-gray-900">认证中心</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Progress header */}
        <View className="bg-white px-4 py-6 items-center">
          <Text className="text-sm text-gray-500 mb-2">
            当前认证等级: L{completedCount}
          </Text>
          <View className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <View
              className="h-full bg-rose-500 rounded-full"
              style={{ width: `${progress * 100}%` }}
            />
          </View>
          <Text className="text-xs text-gray-400 mt-2">
            {completedCount}/{LEVELS.length} 项已完成
          </Text>
        </View>

        {/* Level cards */}
        <View className="px-4 mt-4" style={{ gap: 12 }}>
          {LEVELS.map((item) => (
            <Card key={item.level} className="p-4">
              <View className="flex-row items-start">
                <View
                  className={`w-12 h-12 rounded-2xl items-center justify-center mr-4 ${
                    item.completed ? 'bg-green-50' : 'bg-gray-50'
                  }`}
                >
                  <Text className="text-2xl">{item.icon}</Text>
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center mb-1">
                    <Text className="text-base font-semibold text-gray-900 mr-2">
                      {item.level}: {item.label}
                    </Text>
                    {item.completed && (
                      <Text className="text-green-500 text-sm">已完成</Text>
                    )}
                  </View>
                  <Text className="text-sm text-gray-500 mb-1">{item.description}</Text>
                  <Text className="text-xs text-rose-500">{item.unlocks}</Text>

                  {!item.completed && (
                    <View className="mt-3">
                      <Button
                        title="去认证"
                        variant="primary"
                        size="sm"
                        onPress={() =>
                          Alert.alert('认证', `${item.label}功能开发中`)
                        }
                      />
                    </View>
                  )}
                </View>
              </View>
            </Card>
          ))}
        </View>

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
