import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button } from '@matrimonial/ui';
import { Ionicons } from '@expo/vector-icons';
import { useAnalytics } from '../../../hooks/useAnalytics';

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <View className="flex-row mb-8" style={{ gap: 4 }}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          className={`flex-1 h-1 rounded-full ${i < step ? 'bg-rose-500' : 'bg-gray-200'}`}
        />
      ))}
    </View>
  );
}

export default function RegisterComplete() {
  const router = useRouter();
  const { track } = useAnalytics();

  useEffect(() => {
    track('register_complete');
  }, [track]);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6 pt-4">
        <ProgressBar step={4} total={4} />

        <View className="flex-1 items-center justify-center" style={{ gap: 16 }}>
          <View className="w-20 h-20 rounded-full bg-rose-50 items-center justify-center mb-4">
            <Ionicons name="checkmark-circle" size={56} color="#f43f5e" />
          </View>

          <Text className="text-3xl font-bold text-gray-900 text-center">注册成功！</Text>
          <Text className="text-base text-gray-400 text-center leading-6">
            欢迎加入缘分，你的缘分之旅{'\n'}从这里开始
          </Text>
        </View>

        <Button
          title="开始探索"
          variant="primary"
          size="lg"
          fullWidth
          onPress={() => router.replace('/(tabs)')}
        />
        <View className="h-4" />
      </View>
    </SafeAreaView>
  );
}
