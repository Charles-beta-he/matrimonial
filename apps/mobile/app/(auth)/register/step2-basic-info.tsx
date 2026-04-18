import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
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
import { AnimatedProgressBar, Button, Input, toast } from '@matrimonial/ui';
import type { Gender } from '@matrimonial/shared';
import { api } from '@matrimonial/api-client';
import { useAnalytics } from '../../../hooks/useAnalytics';


export default function RegisterStep2BasicInfo() {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [birthday, setBirthday] = useState('');
  const [city, setCity] = useState('');
  const mountedAtRef = useRef(Date.now());
  const { track } = useAnalytics();
  const utils = api.useUtils();
  const updateMut = api.user.updateProfile.useMutation();

  const isValid =
    nickname.length >= 2 &&
    gender !== null &&
    /^\d{4}-\d{2}-\d{2}$/.test(birthday) &&
    city.length > 0;

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
    if (!isValid) return;
    const birthdayDate = new Date(`${birthday}T00:00:00.000Z`);
    if (Number.isNaN(birthdayDate.getTime())) {
      toast.error('生日格式不正确，请使用 YYYY-MM-DD');
      return;
    }
    try {
      await updateMut.mutateAsync({
        nickname,
        gender: gender as 'MALE' | 'FEMALE',
        birthday: birthdayDate,
        city,
      });
      await utils.user.me.invalidate();
      track('register_step_complete', {
        step: 2,
        duration_ms: Date.now() - mountedAtRef.current,
      });
      router.push('/(auth)/register/step3-photos');
    } catch (e: any) {
      toast.error(e?.message ?? '保存失败，请重试');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView className="flex-1 px-6 pt-4" showsVerticalScrollIndicator={false}>
          <AnimatedProgressBar step={1} total={4} />

          <Animated.View style={headingStyle}>
            <Text className="text-2xl font-bold text-gray-900 mb-2">基本资料</Text>
            <Text className="text-sm text-gray-400 mb-8">让我们更好地了解你</Text>
          </Animated.View>

          <Animated.View style={formStyle}>
          {/* Nickname */}
          <View className="mb-4">
            <Input
              label="昵称"
              placeholder="给自己起个名字"
              value={nickname}
              onChangeText={setNickname}
              maxLength={20}
            />
          </View>

          {/* Gender */}
          <Text className="text-sm text-gray-600 mb-2">性别</Text>
          <View className="flex-row mb-4" style={{ gap: 12 }}>
            <ScalePressable
              className={`flex-1 h-24 rounded-2xl items-center justify-center border-2 ${
                gender === 'MALE' ? 'border-rose-500 bg-rose-50' : 'border-gray-200 bg-gray-50'
              }`}
              onPress={() => setGender('MALE')}
            >
              <Ionicons
                name="male"
                size={28}
                color={gender === 'MALE' ? '#f43f5e' : '#6b7280'}
                style={{ marginBottom: 4 }}
              />
              <Text
                className={`text-base font-medium ${
                  gender === 'MALE' ? 'text-rose-500' : 'text-gray-600'
                }`}
              >
                男
              </Text>
            </ScalePressable>
            <ScalePressable
              className={`flex-1 h-24 rounded-2xl items-center justify-center border-2 ${
                gender === 'FEMALE' ? 'border-rose-500 bg-rose-50' : 'border-gray-200 bg-gray-50'
              }`}
              onPress={() => setGender('FEMALE')}
            >
              <Ionicons
                name="female"
                size={28}
                color={gender === 'FEMALE' ? '#f43f5e' : '#6b7280'}
                style={{ marginBottom: 4 }}
              />
              <Text
                className={`text-base font-medium ${
                  gender === 'FEMALE' ? 'text-rose-500' : 'text-gray-600'
                }`}
              >
                女
              </Text>
            </ScalePressable>
          </View>

          {/* Birthday */}
          <View className="mb-4">
            <Input
              label="生日"
              placeholder="YYYY-MM-DD"
              value={birthday}
              onChangeText={setBirthday}
              maxLength={10}
            />
          </View>

          {/* City */}
          <View className="mb-8">
            <Input
              label="所在城市"
              placeholder="你目前在哪个城市"
              value={city}
              onChangeText={setCity}
            />
          </View>

          <Button
            title={updateMut.isPending ? '保存中...' : '下一步'}
            variant="primary"
            size="lg"
            fullWidth
            disabled={!isValid || updateMut.isPending}
            onPress={handleNext}
          />
          </Animated.View>

          <View className="h-8" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
