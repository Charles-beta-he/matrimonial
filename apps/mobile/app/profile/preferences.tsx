import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Switch, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, toast } from '@matrimonial/ui';
import { api } from '@matrimonial/api-client';
import { ScalePressable } from '../../components/ScalePressable';

const EDUCATION_OPTIONS: Array<{ label: string; value: string }> = [
  { label: '不限', value: '' },
  { label: '高中及以上', value: 'HIGH_SCHOOL' },
  { label: '大专及以上', value: 'ASSOCIATE' },
  { label: '本科及以上', value: 'BACHELOR' },
  { label: '硕士及以上', value: 'MASTER' },
  { label: '博士', value: 'PHD' },
];

const AGE_OPTIONS = Array.from({ length: 42 }, (_, i) => i + 18); // 18-59

function RangePicker({
  label,
  min,
  max,
  minValue,
  maxValue,
  onChangeMin,
  onChangeMax,
  suffix,
}: {
  label: string;
  min: number;
  max: number;
  minValue: number;
  maxValue: number;
  onChangeMin: (v: number) => void;
  onChangeMax: (v: number) => void;
  suffix?: string;
}) {
  const values = Array.from({ length: max - min + 1 }, (_, i) => i + min);
  return (
    <View className="mb-4">
      <Text className="text-sm font-semibold text-gray-700 mb-2">{label}</Text>
      <View className="flex-row items-center" style={{ gap: 8 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6 }}
        >
          {values.map((v) => (
            <ScalePressable
              key={`min-${v}`}
              className={`rounded-full px-3 py-1.5 border ${
                v === minValue
                  ? 'border-rose-500 bg-rose-50'
                  : 'border-gray-200 bg-white'
              }`}
              onPress={() => {
                onChangeMin(v);
                if (v > maxValue) onChangeMax(v);
              }}
            >
              <Text
                className={`text-xs ${v === minValue ? 'text-rose-500 font-medium' : 'text-gray-500'}`}
              >
                {v}{suffix}
              </Text>
            </ScalePressable>
          ))}
        </ScrollView>
      </View>
      <Text className="text-xs text-gray-400 mt-1 text-center">
        最小 {minValue}{suffix} — 最大 {maxValue}{suffix}
      </Text>
      <View className="flex-row items-center mt-2" style={{ gap: 6 }}>
        <Text className="text-xs text-gray-500">最大：</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6 }}
        >
          {values.filter((v) => v >= minValue).map((v) => (
            <ScalePressable
              key={`max-${v}`}
              className={`rounded-full px-3 py-1.5 border ${
                v === maxValue
                  ? 'border-rose-500 bg-rose-50'
                  : 'border-gray-200 bg-white'
              }`}
              onPress={() => onChangeMax(v)}
            >
              <Text
                className={`text-xs ${v === maxValue ? 'text-rose-500 font-medium' : 'text-gray-500'}`}
              >
                {v}{suffix}
              </Text>
            </ScalePressable>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

/** Dating preferences edit screen */
export default function PreferencesScreen() {
  const router = useRouter();
  const headerOpacity = useSharedValue(0);
  const headerY = useSharedValue(-14);
  useEffect(() => {
    const e = Easing.out(Easing.cubic);
    headerOpacity.value = withTiming(1, { duration: 320, easing: e });
    headerY.value = withTiming(0, { duration: 320, easing: e });
  }, []);
  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerY.value }],
  }));
  const meQuery = api.user.me.useQuery();
  const updateMut = api.user.updatePreferences.useMutation({
    onSuccess: () => toast.success('偏好已保存'),
    onError: (e: any) => toast.error(e?.message ?? '保存失败'),
  });

  const prefs = (meQuery.data as any)?.preferences;

  const [ageMin, setAgeMin] = useState(22);
  const [ageMax, setAgeMax] = useState(35);
  const [heightMin, setHeightMin] = useState(155);
  const [heightMax, setHeightMax] = useState(185);
  const [educationMin, setEducationMin] = useState('');
  const [acceptLongDistance, setAcceptLongDistance] = useState(false);
  const saveScale = useSharedValue(1);
  const saveStyle = useAnimatedStyle(() => ({ transform: [{ scale: saveScale.value }] }));

  useEffect(() => {
    if (!prefs) return;
    if (prefs.ageMin) setAgeMin(prefs.ageMin);
    if (prefs.ageMax) setAgeMax(prefs.ageMax);
    if (prefs.heightMin) setHeightMin(prefs.heightMin);
    if (prefs.heightMax) setHeightMax(prefs.heightMax);
    if (prefs.educationMin) setEducationMin(prefs.educationMin);
    if (typeof prefs.acceptLongDistance === 'boolean') setAcceptLongDistance(prefs.acceptLongDistance);
  }, [prefs]);

  const handleSave = () => {
    saveScale.value = withSequence(
      withSpring(0.96, { damping: 10, stiffness: 400 }),
      withSpring(1.04, { damping: 8, stiffness: 280 }),
      withSpring(1.0, { damping: 12, stiffness: 240 }),
    );
    const payload: Record<string, unknown> = { ageMin, ageMax, heightMin, heightMax, acceptLongDistance };
    if (educationMin) payload.educationMin = educationMin;
    updateMut.mutate(payload as any);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <Animated.View className="px-4 py-3 bg-white border-b border-gray-100" style={[{ flexDirection: 'row', alignItems: 'center' }, headerStyle]}>
        <Pressable onPress={() => router.back()} className="mr-3">
          <Ionicons name="chevron-back" size={24} color="#374151" />
        </Pressable>
        <Text className="text-xl font-bold text-gray-900">择偶偏好</Text>
      </Animated.View>

      {meQuery.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#f43f5e" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          <View className="bg-white rounded-2xl p-4 mb-4">
            <Text className="text-base font-semibold text-gray-900 mb-4">年龄范围</Text>

            {/* Age min */}
            <Text className="text-sm text-gray-600 mb-2">最小年龄：{ageMin}岁</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ height: 40 }} contentContainerStyle={{ gap: 6, alignItems: 'center' }}>
              {AGE_OPTIONS.filter((v) => v <= ageMax).map((v) => (
                <ScalePressable
                  key={v}
                  className={`rounded-full px-3 py-1.5 border ${v === ageMin ? 'border-rose-500 bg-rose-50' : 'border-gray-200 bg-white'}`}
                  onPress={() => setAgeMin(v)}
                >
                  <Text className={`text-xs ${v === ageMin ? 'text-rose-500 font-medium' : 'text-gray-500'}`}>{v}</Text>
                </ScalePressable>
              ))}
            </ScrollView>

            {/* Age max */}
            <Text className="text-sm text-gray-600 mb-2">最大年龄：{ageMax}岁</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ height: 40 }} contentContainerStyle={{ gap: 6, alignItems: 'center' }}>
              {AGE_OPTIONS.filter((v) => v >= ageMin).map((v) => (
                <ScalePressable
                  key={v}
                  className={`rounded-full px-3 py-1.5 border ${v === ageMax ? 'border-rose-500 bg-rose-50' : 'border-gray-200 bg-white'}`}
                  onPress={() => setAgeMax(v)}
                >
                  <Text className={`text-xs ${v === ageMax ? 'text-rose-500 font-medium' : 'text-gray-500'}`}>{v}</Text>
                </ScalePressable>
              ))}
            </ScrollView>
          </View>

          <View className="bg-white rounded-2xl p-4 mb-4">
            <Text className="text-base font-semibold text-gray-900 mb-4">身高范围</Text>

            <Text className="text-sm text-gray-600 mb-2">最低身高：{heightMin}cm</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ height: 40 }} contentContainerStyle={{ gap: 6, alignItems: 'center' }}>
              {Array.from({ length: 81 }, (_, i) => i + 140).filter((v) => v <= heightMax).map((v) => (
                <ScalePressable
                  key={v}
                  className={`rounded-full px-3 py-1.5 border ${v === heightMin ? 'border-rose-500 bg-rose-50' : 'border-gray-200 bg-white'}`}
                  onPress={() => setHeightMin(v)}
                >
                  <Text className={`text-xs ${v === heightMin ? 'text-rose-500 font-medium' : 'text-gray-500'}`}>{v}</Text>
                </ScalePressable>
              ))}
            </ScrollView>

            <Text className="text-sm text-gray-600 mb-2">最高身高：{heightMax}cm</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ height: 40 }} contentContainerStyle={{ gap: 6, alignItems: 'center' }}>
              {Array.from({ length: 81 }, (_, i) => i + 140).filter((v) => v >= heightMin).map((v) => (
                <ScalePressable
                  key={v}
                  className={`rounded-full px-3 py-1.5 border ${v === heightMax ? 'border-rose-500 bg-rose-50' : 'border-gray-200 bg-white'}`}
                  onPress={() => setHeightMax(v)}
                >
                  <Text className={`text-xs ${v === heightMax ? 'text-rose-500 font-medium' : 'text-gray-500'}`}>{v}</Text>
                </ScalePressable>
              ))}
            </ScrollView>
          </View>

          <View className="bg-white rounded-2xl p-4 mb-4">
            <Text className="text-base font-semibold text-gray-900 mb-3">最低学历要求</Text>
            <View className="flex-row flex-wrap" style={{ gap: 8 }}>
              {EDUCATION_OPTIONS.map((opt) => (
                <ScalePressable
                  key={opt.value}
                  className={`rounded-full px-4 py-2 border ${
                    educationMin === opt.value ? 'border-rose-500 bg-rose-50' : 'border-gray-200 bg-white'
                  }`}
                  onPress={() => setEducationMin(opt.value)}
                >
                  <Text className={`text-sm ${educationMin === opt.value ? 'text-rose-500 font-medium' : 'text-gray-600'}`}>
                    {opt.label}
                  </Text>
                </ScalePressable>
              ))}
            </View>
          </View>

          <View className="bg-white rounded-2xl p-4 mb-6">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-base font-semibold text-gray-900">接受异地</Text>
                <Text className="text-xs text-gray-400 mt-0.5">开启后可匹配不同城市的用户</Text>
              </View>
              <Switch
                value={acceptLongDistance}
                onValueChange={setAcceptLongDistance}
                trackColor={{ false: '#e5e7eb', true: '#fda4af' }}
                thumbColor={acceptLongDistance ? '#f43f5e' : '#fff'}
              />
            </View>
          </View>

          <Animated.View style={saveStyle}>
            <Button
              title={updateMut.isPending ? '保存中...' : '保存偏好'}
              variant="primary"
              size="lg"
              fullWidth
              disabled={updateMut.isPending}
              onPress={handleSave}
            />
          </Animated.View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
