import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, View } from 'react-native';
import { ScalePressable } from '../../../components/ScalePressable';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedProgressBar, Button, toast } from '@matrimonial/ui';
import { api } from '@matrimonial/api-client';
import { useUpload } from '../../../hooks/useUpload';
import { useAnalytics } from '../../../hooks/useAnalytics';
import { colors } from '../../../constants/colors';


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

  const headingOpacity = useSharedValue(0);
  const headingY = useSharedValue(-16);
  const formOpacity = useSharedValue(0);
  const formY = useSharedValue(24);
  useEffect(() => {
    const e = Easing.out(Easing.cubic);
    headingOpacity.value = withTiming(1, { duration: 320, easing: e });
    headingY.value = withTiming(0, { duration: 320, easing: e });
    formOpacity.value = withDelay(160, withTiming(1, { duration: 320, easing: e }));
    formY.value = withDelay(160, withTiming(0, { duration: 320, easing: e }));
  }, []);
  const headingStyle = useAnimatedStyle(() => ({
    opacity: headingOpacity.value,
    transform: [{ translateY: headingY.value }],
  }));
  const formStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
    transform: [{ translateY: formY.value }],
  }));

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
    const borderRadius = variant === 'main' ? 16 : 12;
    return (
      <ScalePressable
        containerStyle={{ flex: 1, borderRadius, overflow: 'hidden' }}
        style={{ flex: 1 }}
        onPress={() => (uri ? handleRemovePhoto(index) : handleAddPhoto(index))}
        disabled={isActive}
      >
        {uri ? (
          <View className="w-full h-full bg-gray-200">
            <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            <ScalePressable
              onPress={() => handleRemovePhoto(index)}
              className="absolute top-2 right-2 bg-black/60 rounded-full w-6 h-6 items-center justify-center"
            >
              <Ionicons name="close" size={14} color={colors.white} />
            </ScalePressable>
          </View>
        ) : isActive ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff1f2', borderWidth: 1.5, borderColor: '#fda4af', borderRadius }}>
            <ActivityIndicator color={colors.primary} />
            <Text style={{ fontSize: 12, color: '#fb7185', marginTop: 4 }}>上传中...</Text>
          </View>
        ) : (
          <View style={{ flex: 1, borderWidth: 1.5, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb', borderRadius }}>
            <Ionicons
              name="add"
              size={variant === 'main' ? 32 : 24}
              color={colors.gray300}
              style={{ marginBottom: 2 }}
            />
            {variant === 'main' ? <Text style={{ fontSize: 12, color: '#9ca3af' }}>主照片</Text> : null}
          </View>
        )}
      </ScalePressable>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 px-6 pt-4" showsVerticalScrollIndicator={false}>
        <AnimatedProgressBar step={2} total={4} />

        <Animated.View style={headingStyle}>
          <Text className="text-2xl font-bold text-gray-900 mb-1">上传照片</Text>
          <Text className="text-sm text-gray-400 mb-6">至少上传2张真人照片</Text>
        </Animated.View>

        <Animated.View style={formStyle}>
        {/* Photo grid: first row has 1 large + 2 small, second row has 3 small */}
        <View className="flex-row mb-3" style={{ gap: 8 }}>
          {/* Main photo slot */}
          <View style={{ flex: 2, aspectRatio: 3 / 4 }}>
            {renderSlot(0, 'main')}
          </View>

          {/* Right column: 2 small slots */}
          <View style={{ flex: 1, gap: 8 }}>
            {[1, 2].map((idx) => (
              <View key={idx} style={{ flex: 1 }}>
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
        </Animated.View>

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
