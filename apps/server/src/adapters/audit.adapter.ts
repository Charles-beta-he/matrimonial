import { isConfigured } from '../lib/env';
import { logger } from '../lib/logger';

export type AuditStatus = 'APPROVED' | 'REJECTED' | 'REVIEW';

export interface AuditAdapter {
  auditText(text: string, context?: string): Promise<{ status: AuditStatus; reasons: string[] }>;
  auditImage(url: string): Promise<{ status: AuditStatus; reasons: string[] }>;
}

// Reuse the logic from services/audit-service/app/text_audit.py
const SENSITIVE_WORDS = [
  // Contact leaking
  '微信号', 'wx', 'QQ号', 'qq号', '加我', '加一下', '加个好友', '私聊', '私信我',
  'telegram', 'tg号', 'whatsapp', '联系方式', '怎么联系', '转账', '借钱', '投资',
  '私下', '线下见', '出来见面', '约出来',
  // Scam signals
  '兼职', '日结', '高薪', '轻松赚钱', '月入过万', '网赚', '提现', '佣金',
  '理财', '基金', '股票推荐', '带你赚钱', '合法', '正规',
  // Adult content
  '一夜情', '约炮', '炮友', '援交', '包养', '养小三', '出台',
  // Gambling
  '赌博', '赌场', '百家乐', '德州', '彩票', '六合彩',
];
const CONTACT_PATTERNS = [
  /\d{5,}/,          // 5+ digit numbers (phone fragments)
  /[a-zA-Z]{2,}\d{3,}/, // handle-like patterns
  /\d{3}[-\s]\d{4}/, // phone number fragments
  /[①②③④⑤⑥⑦⑧⑨⑩]+/, // obfuscated digits
];
const HARASSMENT_PATTERNS = [/约吗/, /开房/, /什么价/, /多少钱/, /来一炮/, /搞一次/];
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
