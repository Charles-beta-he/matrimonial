export const TAG_CATEGORIES = {
  interests: ['读书', '旅行', '美食', '运动', '音乐', '电影', '摄影', '游戏', '动漫', '手工'],
  lifestyle: ['早睡早起', '夜猫子', '健身达人', '宅家派', '户外控', '社交达人'],
  personality: ['温柔体贴', '幽默搞笑', '理性冷静', '浪漫主义', '独立自主', '顾家'],
  food: ['火锅爱好者', '咖啡控', '甜品星人', '素食主义', '厨艺达人', '探店达人'],
} as const;

export const ALL_TAGS = Object.values(TAG_CATEGORIES).flat();

export const DEFAULT_TAG_SUGGESTIONS = ['读书', '旅行', '美食', '运动', '音乐'] as const;
