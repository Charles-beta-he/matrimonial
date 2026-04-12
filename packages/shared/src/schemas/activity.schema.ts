import { z } from 'zod';

export const createActivitySchema = z.object({
  title: z.string().min(2, '标题至少2个字符').max(50, '标题最多50个字符'),
  description: z.string().min(10, '描述至少10个字符').max(2000, '描述最多2000个字符'),
  coverUrl: z.string().url('请提供有效的封面图链接'),
  category: z.string().min(1, '请选择活动分类'),
  location: z.string().min(1, '请填写活动地点').max(200),
  startTime: z.string().datetime({ message: '请提供有效的开始时间' }),
  maxMale: z.number().int().min(1, '男性名额至少1人').max(500),
  maxFemale: z.number().int().min(1, '女性名额至少1人').max(500),
  fee: z.number().min(0, '费用不能为负数'),
});

export const signupActivitySchema = z.object({
  activityId: z.string().min(1, '活动ID不能为空'),
});
