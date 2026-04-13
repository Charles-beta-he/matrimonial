import { z } from 'zod';

export const updateProfileSchema = z.object({
  nickname: z.string().min(2, '昵称至少2个字符').max(20, '昵称最多20个字符').optional(),
  gender: z.enum(['MALE', 'FEMALE']).optional(),
  birthday: z.coerce.date().optional(),
  city: z.string().min(1).max(50, '城市名最多50个字符').optional(),
  bio: z.string().max(500, '简介最多500个字符').optional(),
  height: z.number().int().min(140).max(220).optional(),
  education: z
    .enum(['HIGH_SCHOOL', 'ASSOCIATE', 'BACHELOR', 'MASTER', 'PHD'])
    .optional(),
  occupation: z.string().max(50, '职业名称最多50个字符').optional(),
  incomeRange: z
    .enum(['BELOW_5K', 'K5_10', 'K10_20', 'K20_50', 'ABOVE_50K'])
    .optional(),
  hometown: z.string().max(50).optional(),
  zodiac: z.string().max(10).optional(),
  mbti: z
    .string()
    .regex(/^[EI][NS][TF][JP]$/i, 'MBTI格式不正确')
    .optional(),
  tags: z.array(z.string()).min(3, '请至少选择3个标签').max(5, '最多选择5个标签').optional(),
});

export const updatePhotoSchema = z.object({
  photos: z
    .array(
      z.object({
        url: z.string().url('请提供有效的图片链接'),
        order: z.number().int().min(0),
        isAvatar: z.boolean(),
      }),
    )
    .min(2, '至少保留2张照片')
    .max(9, '最多上传9张照片'),
});

export const updatePromptSchema = z.object({
  questionId: z.string().min(1, '请选择问题'),
  answerText: z.string().max(500, '回答最多500个字符').optional(),
  answerAudioUrl: z.string().url().optional(),
  answerVideoUrl: z.string().url().optional(),
  order: z.number().int().min(0),
});
