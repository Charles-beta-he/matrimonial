import React, { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
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
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState('QUARTERLY');
  const { pay, processing } = usePayment();
  const { track } = useAnalytics();
  const membershipQuery = api.payment.membershipStatus.useQuery();
  const ordersQuery = api.payment.getOrders.useQuery();
  const utils = api.useUtils();
  const currentPlan = (membershipQuery.data as any)?.plan ?? 'FREE';
  const expiresAt = (membershipQuery.data as any)?.expiry;

  const headerOpacity = useSharedValue(0);
  const headerY = useSharedValue(-14);
  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerY.value }],
  }));

  const heroScale = useSharedValue(0.88);
  const heroOpacity = useSharedValue(0);
  const heroStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heroScale.value }],
    opacity: heroOpacity.value,
  }));

  useEffect(() => {
    const e = Easing.out(Easing.cubic);
    headerOpacity.value = withTiming(1, { duration: 320, easing: e });
    headerY.value = withTiming(0, { duration: 320, easing: e });
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
    <SafeAreaView className="flex-1 bg-gray-50">
      <Animated.View className="px-4 py-3 bg-white border-b border-gray-100" style={[{ flexDirection: 'row', alignItems: 'center' }, headerStyle]}>
        <ScalePressable onPress={() => router.back()} className="mr-3">
          <Ionicons name="chevron-back" size={24} color="#374151" />
        </ScalePressable>
        <Text className="text-lg font-semibold text-gray-900">会员中心</Text>
      </Animated.View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Current plan */}
        <Animated.View style={[heroStyle, { backgroundColor: '#fff' }]} className="px-4 py-6 items-center">
          <View className="w-16 h-16 rounded-full bg-amber-50 items-center justify-center mb-2">
            <Ionicons name="diamond" size={32} color="#f59e0b" />
          </View>
          <Text className="text-base text-gray-500">
            当前: {PLAN_LABEL[currentPlan] ?? currentPlan}
          </Text>
          {currentPlan !== 'FREE' && expiresAt ? (
            <Text className="text-sm text-gray-400 mt-1">
              到期时间: {new Date(expiresAt).toLocaleDateString('zh-CN')}
            </Text>
          ) : (
            <Text className="text-sm text-gray-400 mt-1">开通会员，解锁全部功能</Text>
          )}
        </Animated.View>

        {/* Plan cards */}
        <View className="flex-row px-4 mt-4" style={{ gap: 10 }}>
          {MEMBERSHIP_PLAN_DETAILS.map((plan, i) => {
            const isSelected = selectedPlan === plan.plan;
            return (
              <PlanCardWrapper key={plan.plan} index={i} shimmer={isSelected}>
              <ScalePressable
                containerStyle={{ flex: 1 }}
                className={`rounded-2xl border-2 p-3 items-center ${
                  isSelected ? 'border-rose-500 bg-rose-50' : 'border-gray-200 bg-white'
                }`}
                style={{ flex: 1 }}
                onPress={() => setSelectedPlan(plan.plan)}
              >
                {'badge' in plan && plan.badge && (
                  <View className="bg-rose-500 rounded-full px-2 py-0.5 mb-2">
                    <Text className="text-white text-xs font-medium">{plan.badge}</Text>
                  </View>
                )}
                <Text className="text-sm font-semibold text-gray-900 mb-1">{plan.label}</Text>
                <Text className="text-2xl font-bold text-rose-500">
                  ¥{plan.price}
                </Text>
                <Text className="text-xs text-gray-400 line-through">
                  ¥{plan.originalPrice}
                </Text>
              </ScalePressable>
              </PlanCardWrapper>
            );
          })}
        </View>

        {/* Features of selected plan */}
        <View className="bg-white mx-4 mt-4 rounded-2xl p-4">
          <Text className="text-base font-semibold text-gray-900 mb-3">会员特权</Text>
          {MEMBERSHIP_PLAN_DETAILS.find((p) => p.plan === selectedPlan)?.features.map(
            (feature, i) => (
              <View key={i} className="flex-row items-center mb-2" style={{ gap: 8 }}>
                <Ionicons name="checkmark-circle" size={16} color="#f43f5e" />
                <Text className="text-sm text-gray-700">{feature}</Text>
              </View>
            ),
          )}
        </View>

        {/* Comparison table */}
        <View className="bg-white mx-4 mt-4 rounded-2xl p-4">
          <Text className="text-base font-semibold text-gray-900 mb-3">功能对比</Text>
          {/* Header */}
          <View className="flex-row border-b border-gray-100 pb-2 mb-2">
            <Text className="flex-1 text-xs text-gray-400 font-medium">功能</Text>
            <Text className="w-16 text-xs text-gray-400 font-medium text-center">免费</Text>
            <Text className="w-16 text-xs text-rose-500 font-medium text-center">会员</Text>
          </View>
          {FEATURE_COMPARISON.map((row) => (
            <View key={row.feature} className="flex-row py-2 border-b border-gray-50">
              <Text className="flex-1 text-sm text-gray-700">{row.feature}</Text>
              <Text className="w-16 text-xs text-gray-400 text-center">{row.free}</Text>
              <Text className="w-16 text-xs text-rose-500 text-center font-medium">
                {row.paid}
              </Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        <View className="px-4 mt-6">
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
