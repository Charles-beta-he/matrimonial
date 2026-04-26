import { useRef, useState } from 'react';
import { ActivityIndicator, Image, Text, View } from 'react-native';
import { ScalePressable } from '../../../components/ScalePressable';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, toast } from '@matrimonial/ui';
import { api } from '@matrimonial/api-client';
import { useUpload } from '../../../hooks/useUpload';
import { useAnalytics } from '../../../hooks/useAnalytics';
import { colors } from '../../../constants/colors';
import { RegisterShell } from '../../../components/RegisterShell';

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
    const borderRadius = variant === 'main' ? 18 : 14;
    return (
      <ScalePressable
        containerStyle={{ flex: 1, borderRadius, overflow: 'hidden' }}
        style={{ flex: 1 }}
        onPress={() => (uri ? handleRemovePhoto(index) : handleAddPhoto(index))}
        disabled={isActive}
      >
        {uri ? (
          <View style={{ flex: 1, backgroundColor: '#e5e7eb' }}>
            <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            {variant === 'main' ? (
              <View
                style={{
                  position: 'absolute',
                  left: 10,
                  bottom: 10,
                  backgroundColor: 'rgba(15,15,20,0.55)',
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 999,
                }}
              >
                <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '600', letterSpacing: 0.4 }}>
                  主照片
                </Text>
              </View>
            ) : null}
            <ScalePressable
              onPress={() => handleRemovePhoto(index)}
              containerStyle={{
                position: 'absolute',
                top: 8,
                right: 8,
                width: 26,
                height: 26,
                borderRadius: 13,
                backgroundColor: 'rgba(15,15,20,0.65)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="close" size={14} color={colors.white} />
            </ScalePressable>
          </View>
        ) : isActive ? (
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#fff1f2',
              borderWidth: 1.5,
              borderColor: '#fda4af',
              borderRadius,
            }}
          >
            <ActivityIndicator color={colors.primary} />
            <Text style={{ fontSize: 12, color: '#fb7185', marginTop: 4 }}>上传中...</Text>
          </View>
        ) : (
          <View
            style={{
              flex: 1,
              borderWidth: 1.5,
              borderStyle: 'dashed',
              borderColor: '#e5e2da',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#faf7f2',
              borderRadius,
            }}
          >
            <View
              style={{
                width: variant === 'main' ? 44 : 32,
                height: variant === 'main' ? 44 : 32,
                borderRadius: variant === 'main' ? 22 : 16,
                backgroundColor: '#fff1f2',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: variant === 'main' ? 8 : 0,
              }}
            >
              <Ionicons name="add" size={variant === 'main' ? 24 : 18} color={colors.primary} />
            </View>
            {variant === 'main' ? (
              <Text style={{ fontSize: 12, fontWeight: '500', color: '#9ca3af', marginTop: 2 }}>
                添加主照片
              </Text>
            ) : null}
          </View>
        )}
      </ScalePressable>
    );
  };

  return (
    <RegisterShell
      step={3}
      title="放几张照片"
      subtitle="真实照片更受欢迎，至少 2 张，最多 6 张"
    >
      <View style={{ flexDirection: 'row', marginBottom: 12, gap: 10 }}>
        <View style={{ flex: 2, aspectRatio: 3 / 4 }}>{renderSlot(0, 'main')}</View>
        <View style={{ flex: 1, gap: 10 }}>
          {[1, 2].map((idx) => (
            <View key={idx} style={{ flex: 1 }}>{renderSlot(idx, 'small')}</View>
          ))}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
        {[3, 4, 5].map((idx) => (
          <View key={idx} style={{ flex: 1, aspectRatio: 1 }}>{renderSlot(idx, 'small')}</View>
        ))}
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#faf7f2',
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderRadius: 14,
          marginBottom: 24,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Ionicons name="information-circle" size={16} color={colors.gray500} />
          <Text style={{ fontSize: 12, color: '#6b7280' }}>已添加 {photoCount}/6 张</Text>
        </View>
        <Text style={{ fontSize: 12, color: photoCount >= 2 ? '#e11d48' : '#9ca3af', fontWeight: '600' }}>
          {photoCount >= 2 ? '准备就绪' : `还差 ${2 - photoCount} 张`}
        </Text>
      </View>

      <Button
        title={updatePhotosMut.isPending ? '保存中...' : '下一步'}
        variant="primary"
        size="lg"
        fullWidth
        disabled={photoCount < 2 || uploading || updatePhotosMut.isPending}
        onPress={handleNext}
      />
    </RegisterShell>
  );
}
