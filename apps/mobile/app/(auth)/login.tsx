import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button, Input } from '@matrimonial/ui';
import { api } from '@matrimonial/api-client';
import { useAppStore } from '../../stores/useAppStore';
import { useAnalytics } from '../../hooks/useAnalytics';

export default function LoginScreen() {
  const router = useRouter();
  const setAuth = useAppStore((s) => s.setAuth);
  const { track, setUserId } = useAnalytics();

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sendCodeMutation = api.auth.sendCode.useMutation();
  const verifyCodeMutation = api.auth.verifyCode.useMutation();

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleSendCode = useCallback(() => {
    if (!phone || countdown > 0) return;

    sendCodeMutation.mutate(
      { phone },
      {
        onSuccess: () => {
          track('auth_send_code', {
            phone_masked: phone.slice(0, 3) + '****' + phone.slice(-4),
          });
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
        },
        onError: (err) => {
          Alert.alert('发送失败', err.message || '验证码发送失败，请稍后再试');
        },
      },
    );
  }, [phone, countdown, sendCodeMutation, track]);

  const handleLogin = useCallback(() => {
    if (!phone || !code) return;

    verifyCodeMutation.mutate(
      { phone, code },
      {
        onSuccess: (data) => {
          setAuth(data.accessToken, data.refreshToken, {
            id: data.user.id,
            nickname: data.user.nickname,
            phone: data.user.phone,
            gender: data.user.gender,
            isNewUser: data.isNewUser,
          });
          setUserId(data.user.id);
          track('auth_verify_success', { is_new_user: !!data.isNewUser });
          router.replace('/(tabs)');
        },
        onError: (err) => {
          track('auth_verify_fail', { reason: err.message ?? 'unknown' });
          Alert.alert('登录失败', err.message || '验证码错误或已过期');
        },
      },
    );
  }, [phone, code, setAuth, router, verifyCodeMutation, track, setUserId]);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View className="flex-1 px-6 pt-16">
          {/* Logo */}
          <View className="items-center mb-12">
            <Text className="text-4xl mb-2">💝</Text>
            <Text className="text-2xl font-bold text-rose-500">缘分</Text>
            <Text className="text-sm text-gray-400 mt-1">遇见对的人</Text>
          </View>

          {/* Phone */}
          <View className="mb-4">
            <Input
              label="手机号"
              placeholder="请输入手机号"
              value={phone}
              onChangeText={setPhone}
              maxLength={11}
            />
          </View>

          {/* Code */}
          <View className="mb-6">
            <Input
              label="验证码"
              placeholder="请输入验证码"
              value={code}
              onChangeText={setCode}
              maxLength={6}
              rightIcon={
                <Pressable
                  onPress={handleSendCode}
                  disabled={countdown > 0 || !phone || sendCodeMutation.isPending}
                >
                  <Text
                    className={`text-sm font-medium ${
                      countdown > 0 || !phone ? 'text-gray-300' : 'text-rose-500'
                    }`}
                  >
                    {countdown > 0 ? `${countdown}s` : sendCodeMutation.isPending ? '发送中...' : '发送验证码'}
                  </Text>
                </Pressable>
              }
            />
          </View>

          {/* Login button */}
          <Button
            title="登录"
            variant="primary"
            size="lg"
            fullWidth
            loading={verifyCodeMutation.isPending}
            disabled={!phone || !code}
            onPress={handleLogin}
          />

          {/* Register link */}
          <View className="flex-row justify-center mt-6">
            <Text className="text-gray-400 text-sm">还没有账号？</Text>
            <Pressable onPress={() => router.push('/(auth)/register/step1-phone')}>
              <Text className="text-rose-500 text-sm font-medium">立即注册</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
