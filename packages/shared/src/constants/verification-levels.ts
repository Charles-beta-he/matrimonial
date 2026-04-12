export const VERIFICATION_LEVELS = ['L1', 'L2', 'L3', 'L4'] as const;

export const VERIFICATION_LEVEL_LABELS: Record<string, string> = {
  L1: '手机认证',
  L2: '身份认证',
  L3: '真人认证',
  L4: '学历认证',
};

export const VERIFICATION_LEVEL_COLORS: Record<string, string> = {
  L1: '#9CA3AF',
  L2: '#3B82F6',
  L3: '#F59E0B',
  L4: '#8B5CF6',
};
