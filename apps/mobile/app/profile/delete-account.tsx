import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@matrimonial/api-client';
import { toast } from '@matrimonial/ui';
import { useAppStore } from '../../stores/useAppStore';

const DELETION_ITEMS = [
  '个人资料与照片',
  '匹配记录与聊天消息',
  '会员权益（不退款）',
  '认证信息',
];

export default function DeleteAccountPage() {
  const router = useRouter();
  const clearAuth = useAppStore((s) => s.clearAuth);
  const deleteMut = api.user.requestDeletion.useMutation();

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleSendCode = useCallback(() => {
    if (!phone || countdown > 0) return;
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
  }, [phone, countdown]);

  const handleConfirmDelete = () => {
    if (!phone || !code) {
      Alert.alert('提示', '请填写手机号和验证码');
      return;
    }

    Alert.alert(
      '确认注销',
      '注销将在14天后生效，期间可登录撤回',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认注销',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMut.mutateAsync();
              clearAuth();
              router.replace('/(auth)/login');
            } catch (err: any) {
              toast.error(err?.message ?? '注销申请失败');
            }
          },
        },
      ]
    );
  };

  const canSubmit = phone.length === 11 && code.length >= 4 && !deleteMut.isPending;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="bg-white px-6 py-4 flex-row items-center">
          <Pressable onPress={() => router.back()} className="mr-4">
            <Ionicons name="chevron-back" size={24} color="#4b5563" />
          </Pressable>
          <Text className="text-lg font-bold text-gray-900">注销账号</Text>
        </View>

        {/* Warning */}
        <View className="mx-6 mt-6 bg-red-50 rounded-xl p-4">
          <View className="flex-row items-center mb-2" style={{ gap: 6 }}>
            <Ionicons name="warning" size={18} color="#dc2626" />
            <Text className="text-base font-bold text-red-600">注销须知</Text>
          </View>
          <Text className="text-sm text-red-500 leading-5">
            注销账号是不可恢复的操作。一旦注销成功，以下数据将被永久删除且无法找回。请仔细阅读后再做决定。
          </Text>
        </View>

        {/* What gets deleted */}
        <View className="mx-6 mt-4 bg-white rounded-xl p-4">
          <Text className="text-base font-bold text-gray-900 mb-3">以下内容将被删除：</Text>
          {DELETION_ITEMS.map((item) => (
            <View key={item} className="flex-row items-center mb-3">
              <View className="w-5 h-5 rounded bg-red-100 items-center justify-center mr-3">
                <Ionicons name="close" size={14} color="#ef4444" />
              </View>
              <Text className="text-sm text-gray-700">{item}</Text>
            </View>
          ))}
        </View>

        {/* Cooling period notice */}
        <View className="mx-6 mt-4 bg-amber-50 rounded-xl p-4 flex-row" style={{ gap: 8 }}>
          <Ionicons name="information-circle" size={18} color="#b45309" />
          <Text className="flex-1 text-sm text-amber-700 leading-5">
            注销将在14天后生效。在此期间，您可以随时登录账号撤回注销申请。14天冷静期结束后，所有数据将被永久删除。
          </Text>
        </View>

        {/* Phone verification */}
        <View className="mx-6 mt-6">
          <Text className="text-base font-bold text-gray-900 mb-4">身份验证</Text>
          <Text className="text-sm text-gray-500 mb-4">
            为确认是您本人操作，请验证注册手机号
          </Text>

          <View className="bg-white rounded-xl p-4">
            <Text className="text-sm text-gray-600 mb-2">手机号</Text>
            <TextInput
              className="border border-gray-200 rounded-lg px-4 py-3 text-base text-gray-900 mb-4"
              placeholder="请输入注册手机号"
              placeholderTextColor="#9ca3af"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={11}
            />

            <Text className="text-sm text-gray-600 mb-2">验证码</Text>
            <View className="flex-row" style={{ gap: 12 }}>
              <TextInput
                className="flex-1 border border-gray-200 rounded-lg px-4 py-3 text-base text-gray-900"
                placeholder="请输入验证码"
                placeholderTextColor="#9ca3af"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
              />
              <Pressable
                className={`rounded-lg px-4 py-3 items-center justify-center ${
                  countdown > 0 || !phone ? 'bg-gray-100' : 'bg-rose-50'
                }`}
                onPress={handleSendCode}
                disabled={countdown > 0 || !phone}
              >
                <Text
                  className={`text-sm font-medium ${
                    countdown > 0 || !phone ? 'text-gray-300' : 'text-rose-500'
                  }`}
                >
                  {countdown > 0 ? `${countdown}s` : '发送验证码'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Confirm button */}
        <View className="mx-6 mt-8 mb-8">
          <Pressable
            className={`rounded-full py-4 items-center ${
              canSubmit ? 'bg-red-500' : 'bg-gray-200'
            }`}
            onPress={handleConfirmDelete}
            disabled={!canSubmit}
          >
            <Text
              className={`font-bold text-base ${canSubmit ? 'text-white' : 'text-gray-400'}`}
            >
              {deleteMut.isPending ? '提交中...' : '确认注销'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
