import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { ScalePressable } from '../../../components/ScalePressable';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input, toast } from '@matrimonial/ui';
import type { Gender } from '@matrimonial/shared';
import { api } from '@matrimonial/api-client';
import { useAnalytics } from '../../../hooks/useAnalytics';
import { colors } from '../../../constants/colors';
import { RegisterShell } from '../../../components/RegisterShell';

function GenderCard({
  selected,
  onPress,
  icon,
  label,
}: {
  selected: boolean;
  onPress: () => void;
  icon: 'male' | 'female';
  label: string;
}) {
  return (
    <ScalePressable
      containerStyle={{
        flex: 1,
        height: 104,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: selected ? '#e11d48' : '#eef0f3',
        backgroundColor: selected ? '#fff1f2' : '#ffffff',
      }}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={26}
        color={selected ? colors.primary : colors.gray400}
        style={{ marginBottom: 6 }}
      />
      <Text style={{ fontSize: 15, fontWeight: '600', color: selected ? '#e11d48' : '#374151' }}>
        {label}
      </Text>
    </ScalePressable>
  );
}

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
    <RegisterShell step={2} title="说说你自己" subtitle="一些基础资料，让对方一眼认识你">
      <View style={{ gap: 18 }}>
        <Input
          aria-label="昵称"
          label="昵称"
          placeholder="给自己起个名字"
          value={nickname}
          onChangeText={setNickname}
          maxLength={20}
        />

        <View>
          <Text style={{ fontSize: 13, fontWeight: '500', color: '#4b5563', marginBottom: 8 }}>性别</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <GenderCard
              selected={gender === 'MALE'}
              onPress={() => setGender('MALE')}
              icon="male"
              label="男生"
            />
            <GenderCard
              selected={gender === 'FEMALE'}
              onPress={() => setGender('FEMALE')}
              icon="female"
              label="女生"
            />
          </View>
        </View>

        <Input
          aria-label="生日"
          label="生日"
          placeholder="YYYY-MM-DD"
          value={birthday}
          onChangeText={setBirthday}
          maxLength={10}
        />

        <Input
          aria-label="所在城市"
          label="所在城市"
          placeholder="你目前生活在哪个城市"
          value={city}
          onChangeText={setCity}
        />
      </View>

      <View style={{ height: 28 }} />
      <Button
        title={updateMut.isPending ? '保存中...' : '下一步'}
        variant="primary"
        size="lg"
        fullWidth
        disabled={!isValid || updateMut.isPending}
        onPress={handleNext}
      />
    </RegisterShell>
  );
}
