import { z } from 'zod';

export const uploadRequestSchema = z.object({
  category: z.enum(['avatar', 'photo', 'chat', 'activity', 'verify']),
  filename: z.string().min(1).max(255),
  contentType: z.string().regex(/^(image|video)\/.+/, '只支持图片和视频文件'),
  sizeBytes: z.number().int().positive().max(50 * 1024 * 1024, '文件不能超过 50MB'),
});

export const confirmUploadSchema = z.object({
  objectKey: z.string(),
  category: z.enum(['avatar', 'photo', 'chat', 'activity', 'verify']),
});
