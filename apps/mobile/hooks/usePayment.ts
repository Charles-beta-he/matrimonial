import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import { api } from '@matrimonial/api-client';
import { toast } from '@matrimonial/ui';

type Channel = 'wechat' | 'alipay' | 'apple_iap';

export function usePayment() {
  const [processing, setProcessing] = useState(false);
  const createOrder = api.payment.createOrder.useMutation();

  const pay = useCallback(
    async (productType: string, productId: string, channel: Channel) => {
      setProcessing(true);
      try {
        const order = await createOrder.mutateAsync({
          productType: productType as any,
          productId,
          channel,
        } as any);

        if (Platform.OS === 'web') {
          toast.info('H5 环境暂不支持 App 支付，请前往 App 内支付');
          return null;
        }

        // Production: call native payment SDK
        // Dev mock: simulate success
        if (channel === 'wechat' && 'wechatPayParams' in order) {
          // TODO: Call expo-wechat or react-native-wechat-lib to initiate payment
          toast.info('微信支付（模拟成功）');
        } else if (channel === 'alipay' && 'alipayParams' in order) {
          // TODO: Call react-native-alipay with orderString
          toast.info('支付宝支付（模拟成功）');
        } else if (channel === 'apple_iap') {
          // TODO: Trigger StoreKit purchase, then call verifyApplePay
          toast.info('Apple 内购（模拟成功）');
        }

        toast.success('支付成功');
        return order;
      } catch (err: any) {
        toast.error(err?.message ?? '支付失败');
        return null;
      } finally {
        setProcessing(false);
      }
    },
    [createOrder],
  );

  return { pay, processing };
}
