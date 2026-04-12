import * as crypto from 'node:crypto';
import { env, isConfigured } from '../lib/env';
import { logger } from '../lib/logger';

const configured = isConfigured('alipay');

export interface AlipayPrepayResult {
  orderString: string; // Signed order string for Alipay App SDK
}

export const AlipayAdapter = {
  async createPrepay(params: {
    orderId: string;
    amount: number; // in fen
    subject: string;
    body: string;
  }): Promise<AlipayPrepayResult> {
    if (!configured) {
      logger.info('alipay mock (not configured)', { orderId: params.orderId });
      return {
        orderString: `mock_alipay_order_${params.orderId}&amount=${params.amount}`,
      };
    }

    // Production: build alipay.trade.app.pay request
    const bizContent = JSON.stringify({
      out_trade_no: params.orderId,
      total_amount: (params.amount / 100).toFixed(2),
      subject: params.subject,
      body: params.body,
      product_code: 'QUICK_MSECURITY_PAY',
      timeout_express: '30m',
    });

    const commonParams: Record<string, string> = {
      app_id: env.ALIPAY_APP_ID!,
      method: 'alipay.trade.app.pay',
      format: 'JSON',
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      version: '1.0',
      notify_url: env.ALIPAY_NOTIFY_URL ?? '',
      biz_content: bizContent,
    };

    const sortedKeys = Object.keys(commonParams).sort();
    const signString = sortedKeys.map((k) => `${k}=${commonParams[k]}`).join('&');

    try {
      const signer = crypto.createSign('RSA-SHA256');
      signer.update(signString, 'utf8');
      const sign = signer.sign(env.ALIPAY_PRIVATE_KEY!, 'base64');

      // Build final order string (URL-encoded, with signature)
      const finalParams = { ...commonParams, sign };
      const orderString = Object.keys(finalParams)
        .sort()
        .map((k) => `${k}=${encodeURIComponent((finalParams as any)[k])}`)
        .join('&');

      return { orderString };
    } catch (err) {
      logger.error('alipay sign error', { error: (err as Error).message });
      throw new Error('Alipay 签名失败');
    }
  },

  /** Verify callback signature */
  verifyCallback(params: Record<string, string>): boolean {
    if (!configured) return true;
    try {
      const sign = params.sign;
      const signType = params.sign_type ?? 'RSA2';
      const filtered = Object.keys(params)
        .filter((k) => k !== 'sign' && k !== 'sign_type' && params[k])
        .sort()
        .map((k) => `${k}=${params[k]}`)
        .join('&');
      const verifier = crypto.createVerify(
        signType === 'RSA2' ? 'RSA-SHA256' : 'RSA-SHA1',
      );
      verifier.update(filtered, 'utf8');
      return verifier.verify(env.ALIPAY_PUBLIC_KEY!, sign, 'base64');
    } catch (err) {
      logger.error('alipay verify error', { error: (err as Error).message });
      return false;
    }
  },
};
