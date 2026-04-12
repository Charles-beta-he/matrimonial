export const MEMBERSHIP_PLANS = ['FREE', 'MONTHLY', 'QUARTERLY', 'YEARLY'] as const;

export const MEMBERSHIP_PLAN_DETAILS = [
  {
    plan: 'MONTHLY' as const,
    price: 68,
    originalPrice: 98,
    label: '月卡',
    features: ['无限喜欢', '查看谁喜欢了我', '高级筛选', '5次超级喜欢/天'],
  },
  {
    plan: 'QUARTERLY' as const,
    price: 168,
    originalPrice: 294,
    label: '季卡',
    badge: '热门',
    features: ['月卡全部特权', '隐身浏览', '已读回执'],
  },
  {
    plan: 'YEARLY' as const,
    price: 498,
    originalPrice: 1176,
    label: '年卡',
    badge: '最划算',
    features: ['季卡全部特权', '每月1次优选推荐', '专属客服'],
  },
] as const;
