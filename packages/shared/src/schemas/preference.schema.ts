import { z } from 'zod';

export const updatePreferenceSchema = z.object({
  ageMin: z.number().int().min(18, '最小年龄不能低于18').max(99).optional(),
  ageMax: z.number().int().min(18).max(99, '最大年龄不能超过99').optional(),
  cities: z.array(z.string()).optional(),
  heightMin: z.number().int().min(140).max(220).optional(),
  heightMax: z.number().int().min(140).max(220).optional(),
  educationMin: z
    .enum(['HIGH_SCHOOL', 'ASSOCIATE', 'BACHELOR', 'MASTER', 'PHD'])
    .optional(),
  acceptLongDistance: z.boolean().optional(),
});
