import { useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button, TagSelector } from '@matrimonial/ui';
import { ALL_TAGS, TAG_CATEGORIES } from '@matrimonial/shared';
import { useAppStore } from '../../../stores/useAppStore';
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

const CATEGORY_LABELS: Record<string, string> = {
  interests: '兴趣爱好',
  lifestyle: '生活方式',
  personality: '性格特点',
  food: '美食偏好',
};

export default function RegisterStep5Tags() {
  const router = useRouter();
  const setAuth = useAppStore((s) => s.setAuth);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const mountedAtRef = useRef(Date.now());
  const { track } = useAnalytics();

  const handleToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleComplete = () => {
    track('register_step_complete', {
      step: 5,
      duration_ms: Date.now() - mountedAtRef.current,
    });
    // TODO: call api.user.register mutation with all collected data
    // Mock for demo
    setAuth('mock-token', {
      id: 'u1',
      nickname: '新用户',
      gender: 'MALE',
      birthday: '1995-01-01',
      city: '北京',
      verificationLevel: 'L1',
      photos: [],
      prompts: [],
      tags: selectedTags,
      isOnline: true,
      lastActiveAt: new Date().toISOString(),
      age: 29,
    });
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 px-6 pt-4" showsVerticalScrollIndicator={false}>
        <ProgressBar step={5} total={5} />

        <Text className="text-2xl font-bold text-gray-900 mb-1">选择你的标签</Text>
        <Text className="text-sm text-gray-400 mb-2">选择3-5个最能代表你的标签</Text>
        <Text className="text-sm text-rose-500 font-medium mb-6">
          已选 {selectedTags.length}/5
        </Text>

        {Object.entries(TAG_CATEGORIES).map(([key, tags]) => (
          <View key={key} className="mb-6">
            <Text className="text-base font-semibold text-gray-900 mb-3">
              {CATEGORY_LABELS[key] ?? key}
            </Text>
            <TagSelector
              tags={tags as unknown as string[]}
              selectedTags={selectedTags}
              onToggle={handleToggle}
              max={5}
            />
          </View>
        ))}

        <Button
          title="完成注册"
          variant="primary"
          size="lg"
          fullWidth
          disabled={selectedTags.length < 3}
          onPress={handleComplete}
        />

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
