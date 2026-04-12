import type { ProductCatalog } from '../types/payment-extra';

export const PRODUCT_CATALOG: ProductCatalog[] = [
  // Membership (prices in fen)
  { productId: 'MEMBERSHIP_MONTHLY', name: '月卡会员', price: 6800, description: '30天会员特权', type: 'MEMBERSHIP' },
  { productId: 'MEMBERSHIP_QUARTERLY', name: '季卡会员', price: 16800, description: '90天会员特权（热门）', type: 'MEMBERSHIP' },
  { productId: 'MEMBERSHIP_YEARLY', name: '年卡会员', price: 49800, description: '365天会员特权（最划算）', type: 'MEMBERSHIP' },
  // Super Like packs
  { productId: 'SUPER_LIKE_5', name: '超级喜欢 x5', price: 1800, description: '5次超级喜欢', type: 'SUPER_LIKE' },
  { productId: 'SUPER_LIKE_20', name: '超级喜欢 x20', price: 6800, description: '20次超级喜欢', type: 'SUPER_LIKE' },
  // Boost
  { productId: 'BOOST_30MIN', name: '曝光加速 30 分钟', price: 2800, description: '30分钟优先曝光', type: 'BOOST' },
  // Love letter
  { productId: 'LOVE_LETTER', name: '月老信', price: 3800, description: '发送匿名走心长信', type: 'LOVE_LETTER' },
  // Video ticket
  { productId: 'VIDEO_TICKET', name: '视频相亲券', price: 1800, description: '参与红娘主持视频房间', type: 'VIDEO_TICKET' },
];

export function findProduct(productId: string): ProductCatalog | undefined {
  return PRODUCT_CATALOG.find((p) => p.productId === productId);
}
