import { useRef, useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { ScalePressable } from '../../../components/ScalePressable';
import { useRouter } from 'expo-router';
import { Button, Input, toast } from '@matrimonial/ui';
import { api } from '@matrimonial/api-client';
import { useAnalytics } from '../../../hooks/useAnalytics';
import { colors } from '../../../constants/colors';
import { RegisterShell } from '../../../components/RegisterShell';

const EDUCATION_OPTIONS = [
  { value: 'HIGH_SCHOOL', label: '高中' },
  { value: 'ASSOCIATE', label: '大专' },
  { value: 'BACHELOR', label: '本科' },
  { value: 'MASTER', label: '硕士' },
  { value: 'PHD', label: '博士' },
] as const;

type EducationMin = 'HIGH_SCHOOL' | 'ASSOCIATE' | 'BACHELOR' | 'MASTER' | 'PHD';

function FieldGroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        fontSize: 13,
        fontWeight: '500',
        color: '#4b5563',
        marginBottom: 10,
      }}
    >
      {children}
    </Text>
  );
}

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
    <RegisterShell step={4} title="心仪的对象" subtitle="我们会按这些偏好为你筛选每日推荐">
      <View>
        <FieldGroupLabel>年龄范围</FieldGroupLabel>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <View style={{ flex: 1 }}>
            <Input aria-label="最小年龄" placeholder="最小" value={ageMin} onChangeText={setAgeMin} />
          </View>
          <Text style={{ color: '#9ca3af' }}>—</Text>
          <View style={{ flex: 1 }}>
            <Input aria-label="最大年龄" placeholder="最大" value={ageMax} onChangeText={setAgeMax} />
          </View>
          <Text style={{ color: '#9ca3af', fontSize: 13 }}>岁</Text>
        </View>

        <FieldGroupLabel>身高范围</FieldGroupLabel>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <View style={{ flex: 1 }}>
            <Input aria-label="最低身高" placeholder="最低" value={heightMin} onChangeText={setHeightMin} />
          </View>
          <Text style={{ color: '#9ca3af' }}>—</Text>
          <View style={{ flex: 1 }}>
            <Input aria-label="最高身高" placeholder="最高" value={heightMax} onChangeText={setHeightMax} />
          </View>
          <Text style={{ color: '#9ca3af', fontSize: 13 }}>cm</Text>
        </View>

        <View style={{ marginBottom: 18 }}>
          <Input
            aria-label="城市偏好"
            label="城市偏好"
            placeholder="如：北京、上海、深圳"
            value={cityPref}
            onChangeText={setCityPref}
          />
        </View>

        <FieldGroupLabel>最低学历</FieldGroupLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
          {EDUCATION_OPTIONS.map((opt) => {
            const active = educationMin === opt.value;
            return (
              <ScalePressable
                key={opt.value}
                containerStyle={{
                  paddingHorizontal: 16,
                  paddingVertical: 9,
                  borderRadius: 999,
                  backgroundColor: active ? '#e11d48' : '#ffffff',
                  borderWidth: 1,
                  borderColor: active ? '#e11d48' : '#eef0f3',
                }}
                onPress={() => setEducationMin(opt.value)}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#ffffff' : '#4b5563' }}>
                  {opt.label}
                </Text>
              </ScalePressable>
            );
          })}
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#ffffff',
            borderWidth: 1,
            borderColor: '#eef0f3',
            borderRadius: 16,
            paddingHorizontal: 16,
            paddingVertical: 14,
            marginBottom: 28,
          }}
        >
          <View style={{ flex: 1, paddingRight: 16 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 2 }}>
              接受异地
            </Text>
            <Text style={{ fontSize: 12, color: '#9ca3af', lineHeight: 18 }}>
              是否愿意与外地的人交往
            </Text>
          </View>
          <Switch
            value={acceptLongDistance}
            onValueChange={setAcceptLongDistance}
            trackColor={{ false: colors.gray300, true: colors.primaryMuted }}
            thumbColor={acceptLongDistance ? colors.primary : colors.white}
          />
        </View>
      </View>

      <Button
        title={updatePreferencesMut.isPending ? '保存中...' : '下一步'}
        variant="primary"
        size="lg"
        fullWidth
        disabled={updatePreferencesMut.isPending}
        onPress={handleNext}
      />
    </RegisterShell>
  );
}
