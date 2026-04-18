import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Text, View } from 'react-native';
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
import { Button, Input, toast } from '@matrimonial/ui';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@matrimonial/api-client';
import { useAppStore } from '../../../stores/useAppStore';
import { useAnalytics } from '../../../hooks/useAnalytics';

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
      className={`w-5 h-5 rounded border-2 items-center justify-center ${
        checked ? 'bg-rose-500 border-rose-500' : 'border-gray-300 bg-white'
      }`}
    >
      {checked && <Ionicons name="checkmark" size={14} color="#ffffff" />}
    </ScalePressable>
  );
}


export default function RegisterStep1Phone() {
  const router = useRouter();
  const setAuth = useAppStore((s) => s.setAuth);

  // Entrance
  const headingOpacity = useSharedValue(0);
  const headingY = useSharedValue(-20);
  const formOpacity = useSharedValue(0);
  const formY = useSharedValue(24);
  const ctaOpacity = useSharedValue(0);
  useEffect(() => {
    const e = Easing.out(Easing.cubic);
    headingOpacity.value = withTiming(1, { duration: 320, easing: e });
    headingY.value = withTiming(0, { duration: 320, easing: e });
    formOpacity.value = withDelay(160, withTiming(1, { duration: 320, easing: e }));
    formY.value = withDelay(160, withTiming(0, { duration: 320, easing: e }));
    ctaOpacity.value = withDelay(300, withTiming(1, { duration: 280, easing: e }));
  }, []);
  const headingStyle = useAnimatedStyle(() => ({
    opacity: headingOpacity.value,
    transform: [{ translateY: headingY.value }],
  }));
  const formStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
    transform: [{ translateY: formY.value }],
  }));
  const ctaStyle = useAnimatedStyle(() => ({ opacity: ctaOpacity.value }));
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
            // Existing account — 平滑登录，跳到主页
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
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View className="flex-1 px-6 pt-4">
          <Animated.View style={headingStyle}>
            <Text className="text-2xl font-bold text-gray-900 mb-2">输入手机号</Text>
            <Text className="text-sm text-gray-400 mb-8">我们将发送验证码到您的手机</Text>
          </Animated.View>

          <Animated.View style={formStyle}>
            <View className="mb-4">
              <Input
                label="手机号"
                placeholder="请输入手机号"
                value={phone}
                onChangeText={setPhone}
                maxLength={11}
              />
            </View>

            <View className="mb-8">
              <Input
                label="验证码"
                placeholder="请输入验证码"
                value={code}
                onChangeText={setCode}
                maxLength={6}
                rightIcon={
                  <ScalePressable
                    onPress={handleSendCode}
                    disabled={countdown > 0 || !phone || sendCodeMutation.isPending}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        countdown > 0 || !phone ? 'text-gray-300' : 'text-rose-500'
                      }`}
                    >
                      {countdown > 0
                        ? `${countdown}s`
                        : sendCodeMutation.isPending
                          ? '发送中...'
                          : '发送验证码'}
                    </Text>
                  </ScalePressable>
                }
              />
            </View>

            {/* Legal agreement checkbox */}
            <View className="flex-row items-start mb-6" style={{ gap: 8 }}>
              <Checkbox checked={agreed} onToggle={() => setAgreed(!agreed)} />
              <Text className="flex-1 text-xs text-gray-500 leading-5">
                我已阅读并同意
                <Text className="text-rose-500" onPress={() => router.push('/legal/terms')}>
                  《用户服务协议》
                </Text>
                和
                <Text className="text-rose-500" onPress={() => router.push('/legal/privacy')}>
                  《隐私保护政策》
                </Text>
              </Text>
            </View>
          </Animated.View>

          <Animated.View style={ctaStyle}>
            <Button
              title={verifyCodeMutation.isPending ? '验证中...' : '下一步'}
              variant="primary"
              size="lg"
              fullWidth
              disabled={!phone || !code || !agreed || verifyCodeMutation.isPending}
              onPress={handleNext}
            />
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
