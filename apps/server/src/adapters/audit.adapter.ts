import { isConfigured } from '../lib/env';
import { logger } from '../lib/logger';

export type AuditStatus = 'APPROVED' | 'REJECTED' | 'REVIEW';

export interface AuditAdapter {
  auditText(text: string, context?: string): Promise<{ status: AuditStatus; reasons: string[] }>;
  auditImage(url: string): Promise<{ status: AuditStatus; reasons: string[] }>;
}

// Reuse the logic from services/audit-service/app/text_audit.py
const SENSITIVE_WORDS = ['微信号', 'wx', 'QQ号', '加我', '私聊', '转账', '借钱', '投资'];
const CONTACT_PATTERNS = [/\d{5,}/, /[a-zA-Z]{2,}\d{3,}/];

const mockAdapter: AuditAdapter = {
  async auditText(text) {
    const reasons: string[] = [];
    const lower = text.toLowerCase();
    for (const word of SENSITIVE_WORDS) {
      if (lower.includes(word.toLowerCase())) reasons.push(`sensitive:${word}`);
    }
    for (const p of CONTACT_PATTERNS) {
      if (p.test(text)) reasons.push(`contact_pattern`);
    }
    const status: AuditStatus = reasons.some((r) => r.startsWith('contact_pattern'))
      ? 'REJECTED'
      : reasons.length > 0
        ? 'REVIEW'
        : 'APPROVED';
    return { status, reasons };
  },
  async auditImage(url) {
    if (!url.startsWith('http')) return { status: 'REJECTED', reasons: ['invalid_url'] };
    return { status: 'APPROVED', reasons: [] };
  },
};

const aliyunGreenAdapter: AuditAdapter = {
  async auditText(text) {
    // TODO: integrate @alicloud/green20220302
    logger.info('aliyun green stub — using mock for now');
    return mockAdapter.auditText(text);
  },
  async auditImage(url) {
    logger.info('aliyun green stub — using mock for now');
    return mockAdapter.auditImage(url);
  },
};

if (!isConfigured('audit')) {
  logger.warn('audit adapter falling back to mock — ALIYUN_GREEN_* not set');
}

export const audit: AuditAdapter = isConfigured('audit') ? aliyunGreenAdapter : mockAdapter;
