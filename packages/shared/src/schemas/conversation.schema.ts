import { z } from 'zod';

export const sendMessageSchema = z.object({
  conversationId: z.string().min(1, '会话ID不能为空'),
  type: z.enum(['TEXT', 'VOICE', 'IMAGE', 'VIDEO', 'EPHEMERAL_IMAGE'], {
    required_error: '请选择消息类型',
  }),
  content: z.string().trim().max(2000, '消息内容最多2000个字符').optional(),
  mediaUrl: z.string().url('请提供有效的媒体链接').optional(),
  isEphemeral: z.boolean().default(false),
}).refine(
  (data) => data.type !== 'TEXT' || (!!data.content && data.content.length > 0),
  { message: '文字消息内容不能为空', path: ['content'] },
);
