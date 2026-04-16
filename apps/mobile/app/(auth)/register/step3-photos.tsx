import { useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, toast } from '@matrimonial/ui';
import { api } from '@matrimonial/api-client';
import { useUpload } from '../../../hooks/useUpload';
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

const SLOTS = 6;

export default function RegisterStep3Photos() {
  const router = useRouter();
  const [photos, setPhotos] = useState<(string | null)[]>(Array(SLOTS).fill(null));
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const { pickAndUpload, uploading } = useUpload();
  const mountedAtRef = useRef(Date.now());
  const { track } = useAnalytics();
  const utils = api.useUtils();
  const updatePhotosMut = api.user.updatePhotos.useMutation();

  const photoCount = photos.filter(Boolean).length;

  const handleNext = async () => {
    if (photoCount < 2) return;
    const payload = photos
      .map((url, i) => ({ url, order: i }))
      .filter((p): p is { url: string; order: number } => !!p.url)
      .map((p, normalizedIdx) => ({
        url: p.url,
        order: normalizedIdx,
        isAvatar: normalizedIdx === 0,
      }));
    try {
      await updatePhotosMut.mutateAsync({ photos: payload });
      await utils.user.me.invalidate();
      track('register_step_complete', {
        step: 3,
        duration_ms: Date.now() - mountedAtRef.current,
      });
      router.push('/(auth)/register/step4-preferences');
    } catch (e: any) {
      toast.error(e?.message ?? '保存照片失败');
    }
  };

  const handleAddPhoto = async (index: number) => {
    if (uploading) return;
    setActiveSlot(index);
    const result = await pickAndUpload('photo');
    setActiveSlot(null);
    if (result) {
      const updated = [...photos];
      updated[index] = result.publicUrl;
      setPhotos(updated);
    }
  };

  const handleRemovePhoto = (index: number) => {
    const updated = [...photos];
    updated[index] = null;
    setPhotos(updated);
  };

  const renderSlot = (index: number, variant: 'main' | 'small') => {
    const uri = photos[index];
    const isActive = activeSlot === index && uploading;
    const radius = variant === 'main' ? 'rounded-2xl' : 'rounded-xl';
    return (
      <Pressable
        className={`w-full h-full overflow-hidden ${radius}`}
        onPress={() => (uri ? handleRemovePhoto(index) : handleAddPhoto(index))}
        disabled={isActive}
      >
        {uri ? (
          <View className="w-full h-full bg-gray-200">
            <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            <Pressable
              onPress={() => handleRemovePhoto(index)}
              className="absolute top-2 right-2 bg-black/60 rounded-full w-6 h-6 items-center justify-center"
            >
              <Ionicons name="close" size={14} color="#ffffff" />
            </Pressable>
          </View>
        ) : isActive ? (
          <View className={`w-full h-full items-center justify-center bg-rose-50 border-2 border-dashed border-rose-300 ${radius}`}>
            <ActivityIndicator color="#f43f5e" />
            <Text className="text-xs text-rose-400 mt-1">上传中...</Text>
          </View>
        ) : (
          <View className={`w-full h-full border-2 border-dashed border-gray-300 items-center justify-center bg-gray-50 ${radius}`}>
            <Ionicons
              name="add"
              size={variant === 'main' ? 32 : 24}
              color="#d1d5db"
              style={{ marginBottom: 2 }}
            />
            {variant === 'main' ? <Text className="text-xs text-gray-400">主照片</Text> : null}
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 px-6 pt-4" showsVerticalScrollIndicator={false}>
        <ProgressBar step={2} total={4} />

        <Text className="text-2xl font-bold text-gray-900 mb-1">上传照片</Text>
        <Text className="text-sm text-gray-400 mb-6">至少上传2张真人照片</Text>

        {/* Photo grid: first row has 1 large + 2 small, second row has 3 small */}
        <View className="flex-row mb-3" style={{ gap: 8 }}>
          {/* Main photo slot */}
          <View style={{ flex: 2, aspectRatio: 3 / 4 }}>
            {renderSlot(0, 'main')}
          </View>

          {/* Right column: 2 small slots */}
          <View className="flex-1" style={{ gap: 8 }}>
            {[1, 2].map((idx) => (
              <View key={idx} className="flex-1" style={{ aspectRatio: 1 }}>
                {renderSlot(idx, 'small')}
              </View>
            ))}
          </View>
        </View>

        {/* Bottom row: 3 small slots */}
        <View className="flex-row mb-8" style={{ gap: 8 }}>
          {[3, 4, 5].map((idx) => (
            <View key={idx} className="flex-1" style={{ aspectRatio: 1 }}>
              {renderSlot(idx, 'small')}
            </View>
          ))}
        </View>

        <Text className="text-center text-sm text-gray-400 mb-6">
          已添加 {photoCount}/6 张照片
        </Text>

        <Button
          title={updatePhotosMut.isPending ? '保存中...' : '下一步'}
          variant="primary"
          size="lg"
          fullWidth
          disabled={photoCount < 2 || uploading || updatePhotosMut.isPending}
          onPress={handleNext}
        />

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
