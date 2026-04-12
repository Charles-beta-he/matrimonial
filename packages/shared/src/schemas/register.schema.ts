import { z } from 'zod';

export const registerPhoneSchema = z.object({
  phone: z.string().min(10, '手机号格式不正确').max(20),
  code: z.string().length(6, '验证码为6位数字'),
});

export const registerBasicInfoSchema = z.object({
  gender: z.enum(['MALE', 'FEMALE'], { required_error: '请选择性别' }),
  birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD'),
  city: z.string().min(1, '请选择城市').max(50),
  nickname: z.string().min(2, '昵称至少2个字符').max(20, '昵称最多20个字符'),
});

export const registerPhotosSchema = z.object({
  photos: z
    .array(z.string().url('请提供有效的图片链接'))
    .min(2, '至少上传2张照片')
    .max(9, '最多上传9张照片'),
});

export const registerPreferencesSchema = z.object({
  ageMin: z.number().int().min(18, '最小年龄不能低于18').max(99),
  ageMax: z.number().int().min(18).max(99, '最大年龄不能超过99'),
  cities: z.array(z.string()).min(1, '请至少选择一个城市'),
  heightMin: z.number().int().min(140).max(220).optional(),
  heightMax: z.number().int().min(140).max(220).optional(),
  educationMin: z
    .enum(['HIGH_SCHOOL', 'ASSOCIATE', 'BACHELOR', 'MASTER', 'PHD'])
    .optional(),
  acceptLongDistance: z.boolean(),
});

export const registerTagsSchema = z.object({
  tags: z
    .array(z.string())
    .min(3, '请至少选择3个标签')
    .max(5, '最多选择5个标签'),
});
