export type PaymentChannel = 'wechat' | 'alipay' | 'apple_iap';
export type PaymentResultStatus = 'pending' | 'success' | 'failed' | 'refunded';

export interface PrepayOrder {
  orderId: string;
  amount: number; // in fen (cents)
  channel: PaymentChannel;
  // Channel-specific params for client SDK
  wechatPayParams?: {
    appId: string;
    timeStamp: string;
    nonceStr: string;
    package: string;
    signType: 'RSA';
    paySign: string;
  };
  alipayParams?: {
    orderString: string; // the signed order string for Alipay SDK
  };
}

export interface ProductCatalog {
  productId: string;
  name: string;
  price: number; // in fen
  description: string;
  type: 'MEMBERSHIP' | 'SUPER_LIKE' | 'BOOST' | 'LOVE_LETTER' | 'VIDEO_TICKET';
}
