import { z } from 'zod';

export const createOrderSchema = z.object({
  productType: z.enum(
    ['MEMBERSHIP', 'SUPER_LIKE', 'BOOST', 'LOVE_LETTER', 'VIDEO_TICKET'],
    { required_error: '请选择商品类型' },
  ),
  productId: z.string().min(1, '请选择商品'),
  channel: z.enum(['wechat', 'alipay', 'apple_iap'], {
    required_error: '请选择支付方式',
  }),
});

export const paymentCallbackSchema = z.object({
  orderId: z.string(),
  tradeNo: z.string(),
  status: z.enum(['success', 'failed']),
});
