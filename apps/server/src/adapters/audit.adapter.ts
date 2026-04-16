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
const HARASSMENT_PATTERNS = [/约吗/, /开房/, /什么价/, /多少钱/];
const LANDSCAPE_PATTERNS = ['landscape', 'scenery', 'nature', 'sunset', 'mountain', 'beach', 'building'];

const mockAdapter: AuditAdapter = {
  async auditText(text, context?) {
    const reasons: string[] = [];
    const lower = text.toLowerCase();

    // Sensitive word checks
    for (const word of SENSITIVE_WORDS) {
      if (lower.includes(word.toLowerCase())) reasons.push(`sensitive:${word}`);
    }
    for (const p of CONTACT_PATTERNS) {
      if (p.test(text)) reasons.push('contact_pattern');
    }

    // Harassment check (any message)
    for (const p of HARASSMENT_PATTERNS) {
      if (p.test(text)) {
        reasons.push('harassment');
        break;
      }
    }

    // First message quality check — stricter rules
    if (context === 'FIRST_MESSAGE') {
      if (text.length < 5) reasons.push('too_short');
      if (/^(你好|hi|hello|hey|嗨|在吗|在不在|美女|帅哥)+[!！.。]?$/i.test(text.trim())) {
        reasons.push('generic_opener');
      }
    }

    const hasHardReject = reasons.some(
      (r) => r === 'contact_pattern' || r === 'harassment',
    );
    const hasSoftReject = reasons.some(
      (r) => r === 'too_short' || r === 'generic_opener',
    );

    const status: AuditStatus = hasHardReject
      ? 'REJECTED'
      : hasSoftReject
        ? 'REJECTED'
        : reasons.length > 0
          ? 'REVIEW'
          : 'APPROVED';

    return { status, reasons };
  },
  async auditImage(url) {
    if (!url.startsWith('http')) return { status: 'REJECTED', reasons: ['invalid_url'] };

    // Basic heuristic checks for development
    // In production, this calls Aliyun Green for real AI detection
    const lowerUrl = url.toLowerCase();
    const hasLandscapeHint = LANDSCAPE_PATTERNS.some((p) => lowerUrl.includes(p));
    if (hasLandscapeHint) {
      return { status: 'REJECTED', reasons: ['non_person_photo'] };
    }

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
