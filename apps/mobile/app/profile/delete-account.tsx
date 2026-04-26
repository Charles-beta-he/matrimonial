import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@matrimonial/api-client';
import { toast } from '@matrimonial/ui';
import { useAppStore } from '../../stores/useAppStore';
import { ScalePressable } from '../../components/ScalePressable';
import { colors } from '../../constants/colors';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useScreenTracking } from '../../hooks/useAnalytics';

const DELETION_ITEMS = [
  '个人资料与照片',
  '匹配记录与聊天消息',
  '会员权益（不退款）',
  '认证信息',
];

export default function DeleteAccountPage() {
  useScreenTracking('delete_account');
  const router = useRouter();
  const token = useAppStore((s) => s.token);
  const refreshToken = useAppStore((s) => s.refreshToken);
  const user = useAppStore((s) => s.user);
  const setAuth = useAppStore((s) => s.setAuth);
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
              if (token && refreshToken && user) {
                setAuth(token, refreshToken, {
                  ...user,
                  status: 'PENDING_DELETION',
                  deletionRequestedAt: new Date().toISOString(),
                });
              }
              toast.success('注销申请已提交，14天内可随时撤回');
              router.replace('/(tabs)/profile');
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fdfcfa' }}>
      <ScreenHeader title="注销账号" noBorder />
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Warning hero */}
        <View
          style={{
            marginHorizontal: 24,
            marginTop: 8,
            backgroundColor: '#0b0b0f',
            borderRadius: 22,
            padding: 22,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              position: 'absolute',
              top: -50,
              right: -40,
              width: 160,
              height: 160,
              borderRadius: 80,
              backgroundColor: 'rgba(220,38,38,0.18)',
            }}
          />
          <Text
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: '#fb7185',
              letterSpacing: 1.6,
              marginBottom: 10,
            }}
          >
            注销须知 · IRREVERSIBLE
          </Text>
          <Text
            style={{
              fontSize: 22,
              fontWeight: '700',
              color: '#ffffff',
              letterSpacing: -0.4,
              marginBottom: 10,
              lineHeight: 28,
            }}
          >
            这一步无法撤回
          </Text>
          <Text style={{ fontSize: 13, color: '#a1a1aa', lineHeight: 20 }}>
            注销成功后，以下数据将被永久删除且无法找回
          </Text>
        </View>

        {/* What gets deleted */}
        <View
          style={{
            marginHorizontal: 24,
            marginTop: 14,
            backgroundColor: '#ffffff',
            borderRadius: 18,
            padding: 18,
            borderWidth: 1,
            borderColor: '#eef0f3',
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: '#9ca3af',
              letterSpacing: 1.6,
              marginBottom: 14,
            }}
          >
            将被删除
          </Text>
          {DELETION_ITEMS.map((item, i) => (
            <View
              key={item}
              style={[
                { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
                i < DELETION_ITEMS.length - 1
                  ? { borderBottomWidth: 1, borderBottomColor: '#f4f0ea' }
                  : undefined,
              ]}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  backgroundColor: '#fee2e2',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                <Ionicons name="close" size={12} color="#dc2626" />
              </View>
              <Text style={{ fontSize: 14, color: '#0b0b0f', fontWeight: '500' }}>{item}</Text>
            </View>
          ))}
        </View>

        {/* Cooling period notice */}
        <View
          style={{
            marginHorizontal: 24,
            marginTop: 14,
            backgroundColor: '#fff8e0',
            borderRadius: 14,
            padding: 14,
            flexDirection: 'row',
            gap: 10,
            borderWidth: 1,
            borderColor: '#fde68a',
          }}
        >
          <Ionicons name="information-circle" size={18} color="#b45309" />
          <Text style={{ flex: 1, fontSize: 12, color: '#92400e', lineHeight: 18 }}>
            注销将在 <Text style={{ fontWeight: '700' }}>14 天</Text> 后生效。期间可登录账号撤回申请。
          </Text>
        </View>

        {/* Phone verification */}
        <View
          style={{
            marginHorizontal: 24,
            marginTop: 22,
            backgroundColor: '#ffffff',
            borderRadius: 18,
            padding: 18,
            borderWidth: 1,
            borderColor: '#eef0f3',
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: '#9ca3af',
              letterSpacing: 1.6,
              marginBottom: 6,
            }}
          >
            身份验证
          </Text>
          <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 16, lineHeight: 18 }}>
            为确认是你本人操作，请验证注册手机号
          </Text>

          <Text style={{ fontSize: 13, fontWeight: '500', color: '#4b5563', marginBottom: 8 }}>
            手机号
          </Text>
          <TextInput
            aria-label="手机号"
            style={{
              borderWidth: 1.5,
              borderColor: '#eef0f3',
              backgroundColor: '#fdfcfa',
              borderRadius: 14,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontSize: 15,
              color: '#0b0b0f',
              marginBottom: 16,
            }}
            placeholder="输入注册手机号"
            placeholderTextColor="#b8bcc4"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            maxLength={11}
          />

          <Text style={{ fontSize: 13, fontWeight: '500', color: '#4b5563', marginBottom: 8 }}>
            验证码
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TextInput
              aria-label="验证码"
              style={{
                flex: 1,
                borderWidth: 1.5,
                borderColor: '#eef0f3',
                backgroundColor: '#fdfcfa',
                borderRadius: 14,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 15,
                color: '#0b0b0f',
              }}
              placeholder="6 位验证码"
              placeholderTextColor="#b8bcc4"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
            />
            <ScalePressable
              style={{
                borderRadius: 14,
                paddingHorizontal: 16,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: countdown > 0 || !phone ? '#f4f0ea' : '#fff1f2',
              }}
              onPress={handleSendCode}
              disabled={countdown > 0 || !phone}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: countdown > 0 || !phone ? '#b8bcc4' : '#e11d48',
                }}
              >
                {countdown > 0 ? `${countdown}s` : '发送验证码'}
              </Text>
            </ScalePressable>
          </View>
        </View>

        {/* Confirm button */}
        <View style={{ marginHorizontal: 24, marginTop: 28 }}>
          <ScalePressable
            style={{
              borderRadius: 999,
              paddingVertical: 16,
              alignItems: 'center',
              backgroundColor: canSubmit ? '#dc2626' : '#fce7e7',
            }}
            onPress={handleConfirmDelete}
            disabled={!canSubmit}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: '700',
                color: canSubmit ? '#ffffff' : '#fda4af',
                letterSpacing: 0.6,
              }}
            >
              {deleteMut.isPending ? '提交中...' : '确认注销账号'}
            </Text>
          </ScalePressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
