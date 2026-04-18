import { useEffect, useRef, useState } from 'react';
import { ScrollView, Switch, Text, View } from 'react-native';
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
import { AnimatedProgressBar, Button, Input, toast } from '@matrimonial/ui';
import { api } from '@matrimonial/api-client';
import { useAnalytics } from '../../../hooks/useAnalytics';


const EDUCATION_OPTIONS = [
  { value: 'HIGH_SCHOOL', label: '高中' },
  { value: 'ASSOCIATE', label: '大专' },
  { value: 'BACHELOR', label: '本科' },
  { value: 'MASTER', label: '硕士' },
  { value: 'PHD', label: '博士' },
] as const;

type EducationMin = 'HIGH_SCHOOL' | 'ASSOCIATE' | 'BACHELOR' | 'MASTER' | 'PHD';

export default function RegisterStep4Preferences() {
  const router = useRouter();
  const [ageMin, setAgeMin] = useState('22');
  const [ageMax, setAgeMax] = useState('35');
  const [heightMin, setHeightMin] = useState('155');
  const [heightMax, setHeightMax] = useState('185');
  const [cityPref, setCityPref] = useState('');
  const [educationMin, setEducationMin] = useState<EducationMin>('BACHELOR');
  const [acceptLongDistance, setAcceptLongDistance] = useState(false);
  const mountedAtRef = useRef(Date.now());
  const { track } = useAnalytics();
  const updatePreferencesMut = api.user.updatePreferences.useMutation();

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

  const parseIntOrUndef = (s: string): number | undefined => {
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : undefined;
  };

  const handleNext = async () => {
    const cities = cityPref
      .split(/[,，、\s]+/)
      .map((c) => c.trim())
      .filter(Boolean);
    try {
      await updatePreferencesMut.mutateAsync({
        ageMin: parseIntOrUndef(ageMin),
        ageMax: parseIntOrUndef(ageMax),
        heightMin: parseIntOrUndef(heightMin),
        heightMax: parseIntOrUndef(heightMax),
        cities: cities.length > 0 ? cities : undefined,
        educationMin,
        acceptLongDistance,
      });
      track('register_step_complete', {
        step: 4,
        duration_ms: Date.now() - mountedAtRef.current,
      });
      router.push('/(auth)/register/step5-tags');
    } catch (e: any) {
      toast.error(e?.message ?? '保存偏好失败');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 px-6 pt-4" showsVerticalScrollIndicator={false}>
        <AnimatedProgressBar step={3} total={4} />

        <Animated.View style={headingStyle}>
          <Text className="text-2xl font-bold text-gray-900 mb-2">择偶偏好</Text>
          <Text className="text-sm text-gray-400 mb-8">帮助我们为你推荐合适的人</Text>
        </Animated.View>

        <Animated.View style={formStyle}>
        {/* Age range */}
        <Text className="text-sm text-gray-600 mb-2 font-medium">年龄范围</Text>
        <View className="flex-row items-center mb-4" style={{ gap: 12 }}>
          <View className="flex-1">
            <Input placeholder="最小" value={ageMin} onChangeText={setAgeMin} />
          </View>
          <Text className="text-gray-400">—</Text>
          <View className="flex-1">
            <Input placeholder="最大" value={ageMax} onChangeText={setAgeMax} />
          </View>
          <Text className="text-gray-400 text-sm">岁</Text>
        </View>

        {/* Height range */}
        <Text className="text-sm text-gray-600 mb-2 font-medium">身高范围</Text>
        <View className="flex-row items-center mb-4" style={{ gap: 12 }}>
          <View className="flex-1">
            <Input placeholder="最低" value={heightMin} onChangeText={setHeightMin} />
          </View>
          <Text className="text-gray-400">—</Text>
          <View className="flex-1">
            <Input placeholder="最高" value={heightMax} onChangeText={setHeightMax} />
          </View>
          <Text className="text-gray-400 text-sm">cm</Text>
        </View>

        {/* City preferences */}
        <View className="mb-4">
          <Input
            label="城市偏好"
            placeholder="如: 北京、上海、深圳"
            value={cityPref}
            onChangeText={setCityPref}
          />
        </View>

        {/* Education minimum */}
        <Text className="text-sm text-gray-600 mb-2 font-medium">最低学历</Text>
        <View className="flex-row flex-wrap mb-4" style={{ gap: 8 }}>
          {EDUCATION_OPTIONS.map((opt) => (
            <ScalePressable
              key={opt.value}
              className={`rounded-full px-4 py-2 ${
                educationMin === opt.value ? 'bg-rose-500' : 'bg-gray-100'
              }`}
              onPress={() => setEducationMin(opt.value)}
            >
              <Text
                className={`text-sm ${
                  educationMin === opt.value ? 'text-white' : 'text-gray-700'
                }`}
              >
                {opt.label}
              </Text>
            </ScalePressable>
          ))}
        </View>

        {/* Accept long distance */}
        <View className="flex-row items-center justify-between bg-gray-50 rounded-xl px-4 py-3 mb-8">
          <View>
            <Text className="text-base text-gray-900">接受异地</Text>
            <Text className="text-xs text-gray-400">是否愿意与外地的人交往</Text>
          </View>
          <Switch
            value={acceptLongDistance}
            onValueChange={setAcceptLongDistance}
            trackColor={{ false: '#d1d5db', true: '#fda4af' }}
            thumbColor={acceptLongDistance ? '#f43f5e' : '#f4f4f5'}
          />
        </View>

        <Button
          title={updatePreferencesMut.isPending ? '保存中...' : '下一步'}
          variant="primary"
          size="lg"
          fullWidth
          disabled={updatePreferencesMut.isPending}
          onPress={handleNext}
        />
        </Animated.View>

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
