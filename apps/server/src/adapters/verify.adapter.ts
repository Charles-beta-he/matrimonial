import { env, isConfigured } from '../lib/env';
import { logger } from '../lib/logger';

export interface VerifyAdapter {
  verifyIdCard(realName: string, idCard: string): Promise<{ passed: boolean; reason?: string }>;
  verifyFace(
    faceImageUrl: string,
    idCard: string,
  ): Promise<{ passed: boolean; score?: number; reason?: string }>;
}

const mockAdapter: VerifyAdapter = {
  async verifyIdCard(realName, idCard) {
    if (realName.length < 2 || idCard.length !== 18) {
      return { passed: false, reason: 'invalid_format' };
    }
    return { passed: true };
  },
  async verifyFace(_faceImageUrl, _idCard) {
    return { passed: true, score: 0.95 };
  },
};

const aliyunAdapter: VerifyAdapter = {
  async verifyIdCard(realName, idCard) {
    try {
      const url = `https://eid.shumaidata.com/eid/check?name=${encodeURIComponent(realName)}&idcard=${idCard}`;
      const res = await fetch(url, {
        headers: { Authorization: `APPCODE ${env.ALIYUN_VERIFY_APP_CODE}` },
      });
      const data: any = await res.json();
      return { passed: data?.data?.result === '1' };
    } catch (err: any) {
      logger.error('verify error', { error: err?.message });
      return { passed: false, reason: 'api_error' };
    }
  },
  async verifyFace(_faceImageUrl, _idCard) {
    // TODO: Aliyun financial-grade real-person authentication
    return { passed: true, score: 0.9 };
  },
};

if (!isConfigured('verify')) {
  logger.warn('verify adapter falling back to mock — ALIYUN_VERIFY_APP_CODE not set');
}

export const verify: VerifyAdapter = isConfigured('verify') ? aliyunAdapter : mockAdapter;
