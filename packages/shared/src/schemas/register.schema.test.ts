import { describe, it, expect } from 'vitest';
import {
  registerPhoneSchema,
  registerBasicInfoSchema,
  registerPhotosSchema,
  registerPreferencesSchema,
  registerTagsSchema,
} from './register.schema';

describe('registerPhoneSchema', () => {
  it('accepts valid phone and code', () => {
    const result = registerPhoneSchema.safeParse({ phone: '13812345678', code: '123456' });
    expect(result.success).toBe(true);
  });

  it('rejects short phone', () => {
    const result = registerPhoneSchema.safeParse({ phone: '138', code: '123456' });
    expect(result.success).toBe(false);
  });

  it('rejects wrong length code', () => {
    const result = registerPhoneSchema.safeParse({ phone: '13812345678', code: '1234' });
    expect(result.success).toBe(false);
  });
});

describe('registerBasicInfoSchema', () => {
  const valid = { gender: 'MALE' as const, birthday: '1995-06-15', city: '北京', nickname: '小明' };

  it('accepts valid input', () => {
    expect(registerBasicInfoSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts FEMALE gender', () => {
    expect(registerBasicInfoSchema.safeParse({ ...valid, gender: 'FEMALE' }).success).toBe(true);
  });

  it('rejects invalid gender', () => {
    expect(registerBasicInfoSchema.safeParse({ ...valid, gender: 'OTHER' as any }).success).toBe(false);
  });

  it('rejects invalid birthday format', () => {
    expect(registerBasicInfoSchema.safeParse({ ...valid, birthday: '15/06/1995' }).success).toBe(false);
  });

  it('rejects nickname shorter than 2 chars', () => {
    expect(registerBasicInfoSchema.safeParse({ ...valid, nickname: 'A' }).success).toBe(false);
  });

  it('rejects nickname longer than 20 chars', () => {
    expect(registerBasicInfoSchema.safeParse({ ...valid, nickname: 'A'.repeat(21) }).success).toBe(false);
  });

  it('rejects empty city', () => {
    expect(registerBasicInfoSchema.safeParse({ ...valid, city: '' }).success).toBe(false);
  });
});

describe('registerPhotosSchema', () => {
  const validUrl = 'https://example.com/photo.jpg';

  it('accepts 2 valid photo URLs', () => {
    expect(registerPhotosSchema.safeParse({ photos: [validUrl, validUrl] }).success).toBe(true);
  });

  it('rejects fewer than 2 photos', () => {
    expect(registerPhotosSchema.safeParse({ photos: [validUrl] }).success).toBe(false);
  });

  it('rejects more than 9 photos', () => {
    expect(registerPhotosSchema.safeParse({ photos: Array(10).fill(validUrl) }).success).toBe(false);
  });

  it('rejects invalid URL in array', () => {
    expect(registerPhotosSchema.safeParse({ photos: [validUrl, 'not-a-url'] }).success).toBe(false);
  });
});

describe('registerPreferencesSchema', () => {
  const valid = { ageMin: 22, ageMax: 35, cities: ['北京'], acceptLongDistance: false };

  it('accepts valid preferences', () => {
    expect(registerPreferencesSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects ageMin below 18', () => {
    expect(registerPreferencesSchema.safeParse({ ...valid, ageMin: 17 }).success).toBe(false);
  });

  it('rejects empty cities array', () => {
    expect(registerPreferencesSchema.safeParse({ ...valid, cities: [] }).success).toBe(false);
  });

  it('accepts optional heightMin/heightMax', () => {
    expect(
      registerPreferencesSchema.safeParse({ ...valid, heightMin: 160, heightMax: 180 }).success,
    ).toBe(true);
  });

  it('accepts valid educationMin enum values', () => {
    for (const val of ['HIGH_SCHOOL', 'ASSOCIATE', 'BACHELOR', 'MASTER', 'PHD'] as const) {
      expect(
        registerPreferencesSchema.safeParse({ ...valid, educationMin: val }).success,
      ).toBe(true);
    }
  });

  it('rejects invalid educationMin', () => {
    expect(
      registerPreferencesSchema.safeParse({ ...valid, educationMin: 'KINDERGARTEN' as any }).success,
    ).toBe(false);
  });
});

describe('registerTagsSchema', () => {
  it('accepts 3-5 tags', () => {
    expect(registerTagsSchema.safeParse({ tags: ['读书', '运动', '旅行'] }).success).toBe(true);
    expect(registerTagsSchema.safeParse({ tags: ['a', 'b', 'c', 'd', 'e'] }).success).toBe(true);
  });

  it('rejects fewer than 3 tags', () => {
    expect(registerTagsSchema.safeParse({ tags: ['读书', '运动'] }).success).toBe(false);
  });

  it('rejects more than 5 tags', () => {
    expect(registerTagsSchema.safeParse({ tags: ['a', 'b', 'c', 'd', 'e', 'f'] }).success).toBe(false);
  });
});
