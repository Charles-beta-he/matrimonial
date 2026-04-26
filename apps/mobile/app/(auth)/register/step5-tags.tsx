import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, TagSelector, toast } from '@matrimonial/ui';
import { TAG_CATEGORIES } from '@matrimonial/shared';
import { api } from '@matrimonial/api-client';
import { useAnalytics } from '../../../hooks/useAnalytics';
import { RegisterShell } from '../../../components/RegisterShell';

const CATEGORY_LABELS: Record<string, string> = {
  interests: '兴趣爱好',
  lifestyle: '生活方式',
  personality: '性格特点',
  food: '美食偏好',
};

export default function RegisterStep5Tags() {
  const router = useRouter();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const mountedAtRef = useRef(Date.now());
  const { track } = useAnalytics();
  const utils = api.useUtils();
  const updateMut = api.user.updateProfile.useMutation();

  const handleToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleComplete = async () => {
    if (selectedTags.length < 3) return;
    try {
      await updateMut.mutateAsync({ tags: selectedTags });
      await utils.user.me.invalidate();
      track('register_step_complete', {
        step: 5,
        duration_ms: Date.now() - mountedAtRef.current,
      });
      router.replace('/(auth)/register/complete');
    } catch (e: any) {
      toast.error(e?.message ?? '保存标签失败');
    }
  };

  const remaining = Math.max(0, 3 - selectedTags.length);

  return (
    <RegisterShell step={5} title="贴上你的标签" subtitle="选 3-5 个最像你的，让算法读懂你">
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#ffffff',
          borderWidth: 1,
          borderColor: '#eef0f3',
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 12,
          marginBottom: 24,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, color: '#9ca3af', marginBottom: 2 }}>已选</Text>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#0b0b0f' }}>
            {selectedTags.length}{' '}
            <Text style={{ fontSize: 13, fontWeight: '500', color: '#9ca3af' }}>/ 5</Text>
          </Text>
        </View>
        <Text
          style={{
            fontSize: 12,
            fontWeight: '600',
            color: remaining > 0 ? '#9ca3af' : '#e11d48',
          }}
        >
          {remaining > 0 ? `还需选 ${remaining} 个` : '可以提交了'}
        </Text>
      </View>

      {Object.entries(TAG_CATEGORIES).map(([key, tags]) => (
        <View key={key} style={{ marginBottom: 22 }}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: '#9ca3af',
              letterSpacing: 1.4,
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
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

      <View style={{ height: 8 }} />
      <Button
        title={updateMut.isPending ? '提交中...' : '完成注册'}
        variant="primary"
        size="lg"
        fullWidth
        disabled={selectedTags.length < 3 || updateMut.isPending}
        onPress={handleComplete}
      />
    </RegisterShell>
  );
}
