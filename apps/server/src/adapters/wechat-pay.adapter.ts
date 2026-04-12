import * as crypto from 'node:crypto';
import { env, isConfigured } from '../lib/env';
import { logger } from '../lib/logger';

const configured = isConfigured('wechatpay') && !!env.WECHAT_PRIVATE_KEY;

export interface WechatPrepayResult {
  prepayId: string;
  payParams: {
    appId: string;
    timeStamp: string;
    nonceStr: string;
    package: string;
    signType: 'RSA';
    paySign: string;
  };
}

export const WechatPayAdapter = {
  /** Create a prepay order, returns params for client SDK */
  async createPrepay(params: {
    orderId: string;
    amount: number; // in fen
    description: string;
    openid?: string; // for JSAPI; not needed for APP pay
  }): Promise<WechatPrepayResult> {
    if (!configured) {
      // Dev mock: return fake prepay data
      logger.info('wechat pay mock (not configured)', { orderId: params.orderId });
      return {
        prepayId: `mock_prepay_${params.orderId}`,
        payParams: {
          appId: 'mock_appid',
          timeStamp: String(Math.floor(Date.now() / 1000)),
          nonceStr: crypto.randomBytes(16).toString('hex'),
          package: `prepay_id=mock_prepay_${params.orderId}`,
          signType: 'RSA',
          paySign: 'mock_sign',
        },
      };
    }

    // Production: call WeChat Pay v3 API
    // POST https://api.mch.weixin.qq.com/v3/pay/transactions/app
    const body = {
      appid: env.WECHAT_APP_ID,
      mchid: env.WECHAT_MCH_ID,
      description: params.description,
      out_trade_no: params.orderId,
      notify_url: env.WECHAT_NOTIFY_URL,
      amount: { total: params.amount, currency: 'CNY' },
    };

    // TODO: Generate WeChat Pay v3 signature
    // Requires: Token generation with RSA private key signing
    // See: https://pay.weixin.qq.com/wiki/doc/apiv3/wechatpay/wechatpay3_0.shtml
    logger.info('wechat pay v3 stub — real signing needs SDK', {
      orderId: params.orderId,
      bodyPreview: body.out_trade_no,
    });

    // For now, return a valid-shaped response so client flow can be tested
    const timeStamp = String(Math.floor(Date.now() / 1000));
    const nonceStr = crypto.randomBytes(16).toString('hex');
    const prepayId = `wx_${Date.now()}`;

    return {
      prepayId,
      payParams: {
        appId: env.WECHAT_APP_ID!,
        timeStamp,
        nonceStr,
        package: `prepay_id=${prepayId}`,
        signType: 'RSA',
        paySign: 'TODO_sign_with_private_key',
      },
    };
  },

  /** Verify webhook callback signature */
  verifyCallback(headers: Record<string, string>, body: string): boolean {
    if (!configured) return true; // Dev: accept all
    // TODO: Verify WeChat Pay v3 signature with platform certificate
    // Serial: headers['wechatpay-serial']
    // Signature: headers['wechatpay-signature']
    // Timestamp: headers['wechatpay-timestamp']
    // Nonce: headers['wechatpay-nonce']
    logger.info('wechat pay callback verify stub', {
      serial: headers['wechatpay-serial'],
      bytes: body.length,
    });
    return true;
  },

  /** Decrypt callback body (AES-256-GCM) */
  decryptCallback(encrypted: {
    ciphertext: string;
    nonce: string;
    associated_data: string;
  }): any {
    if (!configured) {
      // Dev: try to treat ciphertext as JSON for mock testing
      try {
        return JSON.parse(encrypted.ciphertext);
      } catch {
        return null;
      }
    }
    try {
      const key = env.WECHAT_API_V3_KEY!;
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, encrypted.nonce);
      decipher.setAAD(Buffer.from(encrypted.associated_data));
      const cipherBuf = Buffer.from(encrypted.ciphertext, 'base64');
      const authTag = cipherBuf.subarray(cipherBuf.length - 16);
      const data = cipherBuf.subarray(0, cipherBuf.length - 16);
      decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
      return JSON.parse(decrypted.toString('utf8'));
    } catch (err) {
      logger.error('wechat pay decrypt error', { error: (err as Error).message });
      return null;
    }
  },
};
