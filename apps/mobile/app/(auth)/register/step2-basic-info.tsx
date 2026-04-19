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
import { colors } from '../../../constants/colors';


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
            <Text className="text-sm text-gray-500 mb-8">让我们更好地了解你</Text>
          </Animated.View>

          <Animated.View style={formStyle}>
          {/* Nickname */}
          <View className="mb-4">
            <Input
              aria-label="昵称"
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
              containerStyle={{ flex: 1, height: 96, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: gender === 'MALE' ? '#f43f5e' : '#e5e7eb', backgroundColor: gender === 'MALE' ? '#fff1f2' : '#f9fafb' }}
              onPress={() => setGender('MALE')}
            >
              <Ionicons name="male" size={28} color={gender === 'MALE' ? colors.primary : colors.gray500} style={{ marginBottom: 4 }} />
              <Text style={{ fontSize: 16, fontWeight: '500', color: gender === 'MALE' ? '#f43f5e' : '#4b5563' }}>男</Text>
            </ScalePressable>
            <ScalePressable
              containerStyle={{ flex: 1, height: 96, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: gender === 'FEMALE' ? '#f43f5e' : '#e5e7eb', backgroundColor: gender === 'FEMALE' ? '#fff1f2' : '#f9fafb' }}
              onPress={() => setGender('FEMALE')}
            >
              <Ionicons name="female" size={28} color={gender === 'FEMALE' ? colors.primary : colors.gray500} style={{ marginBottom: 4 }} />
              <Text style={{ fontSize: 16, fontWeight: '500', color: gender === 'FEMALE' ? '#f43f5e' : '#4b5563' }}>女</Text>
            </ScalePressable>
          </View>

          {/* Birthday */}
          <View className="mb-4">
            <Input
              aria-label="生日"
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
              aria-label="所在城市"
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
