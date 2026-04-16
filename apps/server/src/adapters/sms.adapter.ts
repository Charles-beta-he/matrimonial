import { env, isConfigured } from '../lib/env';
import { logger } from '../lib/logger';

export interface SmsAdapter {
  sendVerificationCode(phone: string, code: string): Promise<void>;
  sendMessage(phone: string, message: string): Promise<void>;
}

const maskPhone = (phone: string) =>
  phone.length >= 7 ? phone.slice(0, 3) + '****' + phone.slice(-4) : phone;

const mockAdapter: SmsAdapter = {
  async sendVerificationCode(phone, code) {
    logger.info('mock sms', { phone: maskPhone(phone), code });
  },
  async sendMessage(phone, message) {
    logger.info('mock sms message', { phone: maskPhone(phone), message });
  },
};

const aliyunAdapter: SmsAdapter = {
  async sendVerificationCode(phone, code) {
    // TODO: When @alicloud/dysmsapi20170525 is installed, use:
    // const client = new Dysmsapi20170525({
    //   accessKeyId: env.ALIYUN_SMS_ACCESS_KEY_ID,
    //   accessKeySecret: env.ALIYUN_SMS_ACCESS_KEY_SECRET,
    // });
    // await client.sendSms({
    //   phoneNumbers: phone,
    //   signName: env.ALIYUN_SMS_SIGN_NAME,
    //   templateCode: env.ALIYUN_SMS_TEMPLATE_CODE,
    //   templateParam: JSON.stringify({ code }),
    // });
    void env.ALIYUN_SMS_TEMPLATE_CODE;
    void code;
    logger.info('aliyun sms stub — SDK not installed', { phone: maskPhone(phone) });
  },
  async sendMessage(phone, message) {
    // TODO: implement via Aliyun SMS template for generic messages
    logger.info('aliyun sms message stub', { phone: maskPhone(phone), message });
  },
};

if (!isConfigured('sms')) {
  logger.warn('sms adapter falling back to mock — ALIYUN_SMS_* not set');
}

export const sms: SmsAdapter = isConfigured('sms') ? aliyunAdapter : mockAdapter;
