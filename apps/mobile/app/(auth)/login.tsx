import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button, ChromaText, Input } from '@matrimonial/ui';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@matrimonial/api-client';
import { useAppStore } from '../../stores/useAppStore';
import { useAnalytics } from '../../hooks/useAnalytics';
import { ScalePressable } from '../../components/ScalePressable';

export default function LoginScreen() {
  const router = useRouter();
  const setAuth = useAppStore((s) => s.setAuth);
  const { track, setUserId } = useAnalytics();

  // Entrance animations
  const iconScale = useSharedValue(0);
  const iconOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const formOpacity = useSharedValue(0);
  const formY = useSharedValue(28);
  const ctaOpacity = useSharedValue(0);
  const ctaY = useSharedValue(16);
  useEffect(() => {
    const e = Easing.out(Easing.cubic);
    iconScale.value = withSpring(1, { damping: 9, stiffness: 160 });
    iconOpacity.value = withTiming(1, { duration: 300 });
    titleOpacity.value = withDelay(150, withTiming(1, { duration: 350, easing: e }));
    formOpacity.value = withDelay(260, withTiming(1, { duration: 350, easing: e }));
    formY.value = withDelay(260, withTiming(0, { duration: 350, easing: e }));
    ctaOpacity.value = withDelay(380, withTiming(1, { duration: 300, easing: e }));
    ctaY.value = withDelay(380, withTiming(0, { duration: 300, easing: e }));
  }, []);
  const iconStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
    transform: [{ scale: iconScale.value }],
  }));
  const titleStyle = useAnimatedStyle(() => ({ opacity: titleOpacity.value }));
  const formStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
    transform: [{ translateY: formY.value }],
  }));
  const ctaStyle = useAnimatedStyle(() => ({
    opacity: ctaOpacity.value,
    transform: [{ translateY: ctaY.value }],
  }));

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [chromaTrigger, setChromaTrigger] = useState(false);
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
    setChromaTrigger((v) => !v);

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
          // 新用户必须走注册引导完善资料后才进主页
          if (data.isNewUser) {
            router.replace('/(auth)/register/step2-basic-info');
          } else {
            router.replace('/(tabs)');
          }
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
            <Animated.View style={[{ marginBottom: 8 }, iconStyle]}>
              <Ionicons name="heart" size={48} color="#f43f5e" />
            </Animated.View>
            <Animated.View style={titleStyle}>
              <ChromaText
                text="缘分"
                style={{ fontSize: 26, fontWeight: '700', color: '#f43f5e' }}
                trigger={chromaTrigger}
              />
            </Animated.View>
            <Animated.Text className="text-sm text-gray-400 mt-1" style={titleStyle}>
              遇见对的人
            </Animated.Text>
          </View>

          {/* Phone + Code */}
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
            <View className="mb-6">
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
                      {countdown > 0 ? `${countdown}s` : sendCodeMutation.isPending ? '发送中...' : '发送验证码'}
                    </Text>
                  </ScalePressable>
                }
              />
            </View>
          </Animated.View>

          {/* CTA + Register link */}
          <Animated.View style={ctaStyle}>
            <Button
              title="登录"
              variant="primary"
              size="lg"
              fullWidth
              loading={verifyCodeMutation.isPending}
              disabled={!phone || !code}
              onPress={handleLogin}
            />
            <View className="flex-row justify-center mt-6">
              <Text className="text-gray-400 text-sm">还没有账号？</Text>
              <ScalePressable onPress={() => router.push('/(auth)/register/step1-phone')}>
                <Text className="text-rose-500 text-sm font-medium">立即注册</Text>
              </ScalePressable>
            </View>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
