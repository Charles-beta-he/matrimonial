import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform, Text, View } from 'react-native';
import { ScalePressable } from '../../../components/ScalePressable';
import { useRouter } from 'expo-router';
import { Button, Input, toast } from '@matrimonial/ui';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@matrimonial/api-client';
import { useAppStore } from '../../../stores/useAppStore';
import { useAnalytics } from '../../../hooks/useAnalytics';
import { colors } from '../../../constants/colors';
import { RegisterShell } from '../../../components/RegisterShell';

function Checkbox({
  checked,
  onToggle,
}: {
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <ScalePressable
      onPress={onToggle}
      containerStyle={{
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 1.5,
        borderColor: checked ? '#e11d48' : '#d1d5db',
        backgroundColor: checked ? '#e11d48' : '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {checked && <Ionicons name="checkmark" size={14} color={colors.white} />}
    </ScalePressable>
  );
}

export default function RegisterStep1Phone() {
  const router = useRouter();
  const setAuth = useAppStore((s) => s.setAuth);

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedAtRef = useRef(Date.now());
  const { track, setUserId } = useAnalytics();

  const sendCodeMutation = api.auth.sendCode.useMutation();
  const verifyCodeMutation = api.auth.verifyCode.useMutation();

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startCountdown = () => {
    setCountdown(60);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendCode = useCallback(() => {
    if (!phone || countdown > 0) return;
    sendCodeMutation.mutate(
      { phone },
      {
        onSuccess: () => {
          track('auth_send_code', {
            phone_masked: phone.slice(0, 3) + '****' + phone.slice(-4),
          });
          startCountdown();
          toast.success('验证码已发送');
        },
        onError: (err: any) => {
          toast.error(err?.message ?? '验证码发送失败');
        },
      },
    );
  }, [phone, countdown, sendCodeMutation, track]);

  const handleNext = () => {
    if (!phone || !code || !agreed) return;
    verifyCodeMutation.mutate(
      { phone, code },
      {
        onSuccess: (data: any) => {
          setAuth(data.accessToken, data.refreshToken, {
            id: data.user.id,
            nickname: data.user.nickname,
            phone: data.user.phone,
            gender: data.user.gender,
            isNewUser: data.isNewUser,
          });
          setUserId(data.user.id);
          track('register_step_complete', {
            step: 1,
            duration_ms: Date.now() - mountedAtRef.current,
            is_new_user: !!data.isNewUser,
          });
          if (data.isNewUser) {
            router.replace('/(auth)/register/step2-basic-info');
          } else {
            const message = '该手机号已注册，已为您登录';
            if (Platform.OS === 'web') {
              toast.info(message);
            } else {
              Alert.alert('提示', message);
            }
            router.replace('/(tabs)');
          }
        },
        onError: (err: any) => {
          toast.error(err?.message ?? '验证码错误或已过期');
          track('auth_verify_fail', { reason: err?.message ?? 'unknown' });
        },
      },
    );
  };

  return (
    <RegisterShell
      step={1}
      title="先验证手机"
      subtitle="我们会给你发送一条 6 位验证码，几秒就到"
    >
      <View style={{ gap: 16 }}>
        <Input
          aria-label="手机号"
          label="手机号"
          placeholder="请输入手机号"
          value={phone}
          onChangeText={setPhone}
          maxLength={11}
        />

        <Input
          aria-label="验证码"
          label="验证码"
          placeholder="6 位数字"
          value={code}
          onChangeText={setCode}
          maxLength={6}
          rightIcon={
            <ScalePressable
              onPress={handleSendCode}
              disabled={countdown > 0 || !phone || sendCodeMutation.isPending}
            >
              <Text
                className={`text-sm font-semibold ${
                  countdown > 0 || !phone ? 'text-gray-300' : 'text-rose-600'
                }`}
              >
                {countdown > 0
                  ? `${countdown}s`
                  : sendCodeMutation.isPending
                    ? '发送中...'
                    : '获取验证码'}
              </Text>
            </ScalePressable>
          }
        />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 24, marginBottom: 28 }}>
        <Checkbox checked={agreed} onToggle={() => setAgreed(!agreed)} />
        <Text style={{ flex: 1, fontSize: 12, lineHeight: 18, color: '#6b7280' }}>
          我已阅读并同意
          <Text style={{ color: '#e11d48' }} onPress={() => router.push('/legal/terms')}>
            《用户服务协议》
          </Text>
          和
          <Text style={{ color: '#e11d48' }} onPress={() => router.push('/legal/privacy')}>
            《隐私保护政策》
          </Text>
        </Text>
      </View>

      <Button
        title={verifyCodeMutation.isPending ? '验证中...' : '下一步'}
        variant="primary"
        size="lg"
        fullWidth
        disabled={!phone || !code || !agreed || verifyCodeMutation.isPending}
        onPress={handleNext}
      />
    </RegisterShell>
  );
}
