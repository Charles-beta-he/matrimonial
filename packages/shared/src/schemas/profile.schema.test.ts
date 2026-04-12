import { describe, it, expect } from 'vitest';
import { updateProfileSchema } from './profile.schema';

describe('updateProfileSchema', () => {
  it('accepts valid profile', () => {
    const res = updateProfileSchema.safeParse({
      nickname: '小明',
      bio: 'hello',
      height: 175,
      tags: ['a', 'b', 'c'],
    });
    expect(res.success).toBe(true);
  });

  it('accepts all optional fields omitted', () => {
    const res = updateProfileSchema.safeParse({});
    expect(res.success).toBe(true);
  });

  it('rejects nickname < 2 chars', () => {
    const res = updateProfileSchema.safeParse({ nickname: 'a' });
    expect(res.success).toBe(false);
  });

  it('rejects nickname > 20 chars', () => {
    const res = updateProfileSchema.safeParse({ nickname: 'a'.repeat(21) });
    expect(res.success).toBe(false);
  });

  it('rejects bio > 500 chars', () => {
    const res = updateProfileSchema.safeParse({ bio: 'x'.repeat(501) });
    expect(res.success).toBe(false);
  });

  it('rejects height < 140', () => {
    const res = updateProfileSchema.safeParse({ height: 139 });
    expect(res.success).toBe(false);
  });

  it('rejects height > 220', () => {
    const res = updateProfileSchema.safeParse({ height: 221 });
    expect(res.success).toBe(false);
  });

  it('rejects tags count < 3', () => {
    const res = updateProfileSchema.safeParse({ tags: ['a', 'b'] });
    expect(res.success).toBe(false);
  });

  it('rejects tags count > 5', () => {
    const res = updateProfileSchema.safeParse({
      tags: ['a', 'b', 'c', 'd', 'e', 'f'],
    });
    expect(res.success).toBe(false);
  });

  it('accepts valid mbti', () => {
    const res = updateProfileSchema.safeParse({ mbti: 'INTJ' });
    expect(res.success).toBe(true);
  });

  it('rejects invalid mbti', () => {
    const res = updateProfileSchema.safeParse({ mbti: 'ZZZZ' });
    expect(res.success).toBe(false);
  });
});
