export const REPORT_REASONS = [
  'FAKE_PROFILE',
  'HARASSMENT',
  'SCAM',
  'INAPPROPRIATE_CONTENT',
  'OTHER',
] as const;

export const REPORT_REASON_LABELS: Record<string, string> = {
  FAKE_PROFILE: '虚假资料',
  HARASSMENT: '骚扰',
  SCAM: '诈骗',
  INAPPROPRIATE_CONTENT: '不当内容',
  OTHER: '其他',
};
