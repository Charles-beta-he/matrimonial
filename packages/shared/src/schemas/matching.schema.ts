import { z } from 'zod';

export const likeSchema = z.object({
  toUserId: z.string().min(1, '目标用户ID不能为空'),
  type: z.enum(['NORMAL', 'SUPER'], { required_error: '请选择喜欢类型' }),
  promptId: z.string().optional(),
  comment: z.string().max(200, '评论最多200个字符').optional(),
});

export const skipSchema = z.object({
  toUserId: z.string().min(1, '目标用户ID不能为空'),
});
