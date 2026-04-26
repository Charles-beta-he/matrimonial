import React, { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { Button } from '@matrimonial/ui';
import { ScalePressable } from '../../components/ScalePressable';
import { ScreenHeader } from '../../components/ScreenHeader';
import { colors } from '../../constants/colors';
import { MEMBERSHIP_PLAN_DETAILS } from '@matrimonial/shared';
import { api } from '@matrimonial/api-client';
import { usePayment } from '../../hooks/usePayment';
import { useAnalytics } from '../../hooks/useAnalytics';

const PLAN_LABEL: Record<string, string> = {
  FREE: '免费用户',
  MONTHLY: '月卡会员',
  QUARTERLY: '季卡会员',
  YEARLY: '年卡会员',
};

const PRODUCT_ID_BY_PLAN: Record<string, string> = {
  MONTHLY: 'MEMBERSHIP_MONTHLY',
  QUARTERLY: 'MEMBERSHIP_QUARTERLY',
  YEARLY: 'MEMBERSHIP_YEARLY',
};

function PlanCardWrapper({ children, index, shimmer }: { children: React.ReactNode; index: number; shimmer?: boolean }) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);
  const shimmerX = useSharedValue(-100);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }, { skewX: '-20deg' }],
  }));

  useEffect(() => {
    const delay = 200 + index * 80;
    opacity.value = withDelay(delay, withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) }));
    scale.value = withDelay(delay, withSpring(1, { damping: 14, stiffness: 200 }));
  }, [index, opacity, scale]);

  useEffect(() => {
    if (shimmer) {
      shimmerX.value = -100;
      shimmerX.value = withRepeat(
        withTiming(250, { duration: 1400, easing: Easing.inOut(Easing.cubic) }),
        -1,
        false,
      );
    } else {
      shimmerX.value = -100;
    }
  }, [shimmer, shimmerX]);

  return (
    <Animated.View style={[{ flex: 1, borderRadius: 16, overflow: 'hidden' }, animStyle]}>
      {children}
      {shimmer && (
        <Animated.View
          pointerEvents="none"
          style={[{
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: 50,
            backgroundColor: 'rgba(255, 255, 255, 0.38)',
          }, shimmerStyle]}
        />
      )}
    </Animated.View>
  );
}

const FEATURE_COMPARISON = [
  { feature: '每日喜欢次数', free: '10次', paid: '无限' },
  { feature: '查看谁喜欢了我', free: '不可用', paid: '可用' },
  { feature: '高级筛选', free: '基础', paid: '全部' },
  { feature: '超级喜欢', free: '1次/天', paid: '5次/天' },
  { feature: '隐身浏览', free: '不可用', paid: '季卡+' },
  { feature: '已读回执', free: '不可用', paid: '季卡+' },
  { feature: '优选推荐', free: '不可用', paid: '年卡' },
  { feature: '专属客服', free: '不可用', paid: '年卡' },
];

/** Membership screen */
export default function MembershipScreen() {
  const [selectedPlan, setSelectedPlan] = useState('QUARTERLY');
  const { pay, processing } = usePayment();
  const { track } = useAnalytics();
  const membershipQuery = api.payment.membershipStatus.useQuery();
  const ordersQuery = api.payment.getOrders.useQuery();
  const utils = api.useUtils();
  const currentPlan = (membershipQuery.data as any)?.plan ?? 'FREE';
  const expiresAt = (membershipQuery.data as any)?.expiry;

  const heroScale = useSharedValue(0.88);
  const heroOpacity = useSharedValue(0);
  const heroStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heroScale.value }],
    opacity: heroOpacity.value,
  }));

  useEffect(() => {
    const e = Easing.out(Easing.cubic);
    track('membership_view', {});
    heroScale.value = withSpring(1, { damping: 14, stiffness: 160 });
    heroOpacity.value = withTiming(1, { duration: 350, easing: e });
  }, [track, heroScale, heroOpacity]);

  const handleSubscribe = () => {
    const productId = PRODUCT_ID_BY_PLAN[selectedPlan];
    if (!productId) return;

    const plan = MEMBERSHIP_PLAN_DETAILS.find((p) => p.plan === selectedPlan);
    const amount = plan?.price ?? 0;

    const channels: Array<{ text: 'default' | 'cancel'; label: string; channel: 'wechat' | 'alipay' | 'apple_iap' }> = [
      { text: 'default', label: '微信支付', channel: 'wechat' },
      { text: 'default', label: '支付宝', channel: 'alipay' },
    ];
    if (Platform.OS === 'ios') {
      channels.push({ text: 'default', label: 'Apple 内购', channel: 'apple_iap' });
    }

    Alert.alert(
      '选择支付方式',
      `开通${plan?.label}`,
      [
        ...channels.map((c) => ({
          text: c.label,
          onPress: async () => {
            track('payment_start', { product_type: 'MEMBERSHIP', amount });
            const result = await pay('MEMBERSHIP', productId, c.channel);
            if (result) {
              track('payment_success', {
                product_type: 'MEMBERSHIP',
                amount,
                channel: c.channel,
              });
              setTimeout(() => {
                utils.payment.membershipStatus.invalidate();
              }, 1000);
            } else {
              track('payment_fail', {
                product_type: 'MEMBERSHIP',
                reason: 'pay_returned_null',
              });
            }
          },
        })),
        { text: '取消', style: 'cancel' as const },
      ],
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fdfcfa' }}>
      <ScreenHeader title="会员中心" noBorder />

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Current plan hero */}
        <Animated.View
          style={[
            heroStyle,
            {
              marginHorizontal: 24,
              marginTop: 8,
              backgroundColor: '#0b0b0f',
              borderRadius: 24,
              paddingHorizontal: 22,
              paddingVertical: 26,
              overflow: 'hidden',
            },
          ]}
        >
          <View
            style={{
              position: 'absolute',
              right: -40,
              top: -40,
              width: 180,
              height: 180,
              borderRadius: 90,
              backgroundColor: 'rgba(228, 29, 72, 0.18)',
            }}
          />
          <View
            style={{
              position: 'absolute',
              right: 30,
              top: 30,
              width: 90,
              height: 90,
              borderRadius: 45,
              backgroundColor: 'rgba(251, 191, 36, 0.10)',
            }}
          />
          <Text
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: '#fbbf24',
              letterSpacing: 1.6,
              marginBottom: 8,
            }}
          >
            会员 · MEMBERSHIP
          </Text>
          <Text style={{ fontSize: 26, fontWeight: '700', color: '#ffffff', letterSpacing: -0.4, lineHeight: 32 }}>
            {PLAN_LABEL[currentPlan] ?? currentPlan}
          </Text>
          <Text style={{ fontSize: 13, color: '#a1a1aa', marginTop: 6 }}>
            {currentPlan !== 'FREE' && expiresAt
              ? `到期 · ${new Date(expiresAt).toLocaleDateString('zh-CN')}`
              : '解锁更多匹配权益与高级筛选'}
          </Text>
        </Animated.View>

        {/* Plan cards */}
        <View style={{ paddingHorizontal: 24, marginTop: 24 }}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: '#9ca3af',
              letterSpacing: 1.6,
              marginBottom: 12,
            }}
          >
            选择套餐
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {MEMBERSHIP_PLAN_DETAILS.map((plan, i) => {
              const isSelected = selectedPlan === plan.plan;
              return (
                <PlanCardWrapper key={plan.plan} index={i} shimmer={isSelected}>
                  <ScalePressable
                    containerStyle={{ flex: 1 }}
                    style={{
                      flex: 1,
                      borderRadius: 18,
                      borderWidth: 1.5,
                      borderColor: isSelected ? '#e11d48' : '#eef0f3',
                      backgroundColor: isSelected ? '#fff1f2' : '#ffffff',
                      paddingVertical: 16,
                      paddingHorizontal: 8,
                      alignItems: 'center',
                    }}
                    onPress={() => setSelectedPlan(plan.plan)}
                  >
                    {'badge' in plan && plan.badge ? (
                      <View
                        style={{
                          position: 'absolute',
                          top: -8,
                          backgroundColor: '#e11d48',
                          borderRadius: 999,
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                        }}
                      >
                        <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: '700', letterSpacing: 0.4 }}>
                          {plan.badge}
                        </Text>
                      </View>
                    ) : null}
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '600',
                        color: isSelected ? '#9f1239' : '#374151',
                        marginBottom: 4,
                        marginTop: 'badge' in plan && plan.badge ? 4 : 0,
                      }}
                    >
                      {plan.label}
                    </Text>
                    <Text style={{ fontSize: 22, fontWeight: '700', color: '#e11d48', letterSpacing: -0.5 }}>
                      ¥{plan.price}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#9ca3af', textDecorationLine: 'line-through', marginTop: 2 }}>
                      ¥{plan.originalPrice}
                    </Text>
                  </ScalePressable>
                </PlanCardWrapper>
              );
            })}
          </View>
        </View>

        {/* Features of selected plan */}
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
              marginBottom: 14,
            }}
          >
            会员特权
          </Text>
          {MEMBERSHIP_PLAN_DETAILS.find((p) => p.plan === selectedPlan)?.features.map(
            (feature, i) => (
              <View
                key={i}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}
              >
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: '#fff1f2',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="checkmark" size={12} color="#e11d48" />
                </View>
                <Text style={{ fontSize: 14, color: '#374151', flex: 1 }}>{feature}</Text>
              </View>
            ),
          )}
        </View>

        {/* Comparison table */}
        <View
          style={{
            marginHorizontal: 24,
            marginTop: 16,
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
            功能对比
          </Text>
          <View
            style={{
              flexDirection: 'row',
              borderBottomWidth: 1,
              borderBottomColor: '#f1ece3',
              paddingBottom: 8,
              marginBottom: 4,
            }}
          >
            <Text style={{ flex: 1, fontSize: 11, color: '#9ca3af', fontWeight: '600', letterSpacing: 0.4 }}>
              功能
            </Text>
            <Text style={{ width: 60, fontSize: 11, color: '#9ca3af', fontWeight: '600', textAlign: 'center' }}>
              免费
            </Text>
            <Text style={{ width: 60, fontSize: 11, color: '#e11d48', fontWeight: '700', textAlign: 'center' }}>
              会员
            </Text>
          </View>
          {FEATURE_COMPARISON.map((row, idx) => (
            <View
              key={row.feature}
              style={{
                flexDirection: 'row',
                paddingVertical: 10,
                borderBottomWidth: idx === FEATURE_COMPARISON.length - 1 ? 0 : 1,
                borderBottomColor: '#fbf7f0',
              }}
            >
              <Text style={{ flex: 1, fontSize: 13, color: '#374151' }}>{row.feature}</Text>
              <Text style={{ width: 60, fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
                {row.free}
              </Text>
              <Text style={{ width: 60, fontSize: 12, color: '#e11d48', textAlign: 'center', fontWeight: '600' }}>
                {row.paid}
              </Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        <View style={{ paddingHorizontal: 24, marginTop: 22 }}>
          <Button
            title={processing ? '支付中...' : '立即开通'}
            variant="primary"
            size="lg"
            fullWidth
            disabled={processing}
            onPress={handleSubscribe}
          />
        </View>

        {/* Order history */}
        {(ordersQuery.data?.length ?? 0) > 0 && (
          <View className="bg-white mx-4 mt-4 mb-8 rounded-2xl p-4">
            <Text className="text-base font-semibold text-gray-900 mb-3">购买记录</Text>
            {ordersQuery.data!.map((order: any) => (
              <View key={order.id} className="flex-row items-center justify-between py-2 border-b border-gray-50">
                <View>
                  <Text className="text-sm text-gray-800">{order.productType}</Text>
                  <Text className="text-xs text-gray-400 mt-0.5">
                    {new Date(order.createdAt).toLocaleDateString('zh-CN')} · {order.channel}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-sm font-semibold text-gray-900">¥{Number(order.amount).toFixed(2)}</Text>
                  <Text className={`text-xs mt-0.5 ${order.status === 'PAID' ? 'text-green-500' : order.status === 'PENDING' ? 'text-amber-500' : 'text-gray-400'}`}>
                    {order.status === 'PAID' ? '已支付' : order.status === 'PENDING' ? '待支付' : order.status}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {(ordersQuery.data?.length ?? 0) === 0 && !ordersQuery.isLoading && (
          <View className="mb-8" />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
