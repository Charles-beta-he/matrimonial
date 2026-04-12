import { describe, it, expect } from 'vitest';
import { likeSchema, skipSchema } from './matching.schema';

describe('likeSchema', () => {
  it('accepts valid NORMAL like', () => {
    expect(likeSchema.safeParse({ toUserId: 'u1', type: 'NORMAL' }).success).toBe(true);
  });

  it('accepts valid SUPER like with optional fields', () => {
    const res = likeSchema.safeParse({
      toUserId: 'u1',
      type: 'SUPER',
      promptId: 'p1',
      comment: 'hi',
    });
    expect(res.success).toBe(true);
  });

  it('rejects missing toUserId', () => {
    expect(likeSchema.safeParse({ type: 'NORMAL' }).success).toBe(false);
  });

  it('rejects empty toUserId', () => {
    expect(likeSchema.safeParse({ toUserId: '', type: 'NORMAL' }).success).toBe(false);
  });

  it('rejects missing type', () => {
    expect(likeSchema.safeParse({ toUserId: 'u1' }).success).toBe(false);
  });

  it('rejects invalid type enum', () => {
    expect(likeSchema.safeParse({ toUserId: 'u1', type: 'MEGA' }).success).toBe(false);
  });

  it('rejects comment > 200 chars', () => {
    const res = likeSchema.safeParse({
      toUserId: 'u1',
      type: 'NORMAL',
      comment: 'x'.repeat(201),
    });
    expect(res.success).toBe(false);
  });
});

describe('skipSchema', () => {
  it('accepts valid input', () => {
    expect(skipSchema.safeParse({ toUserId: 'u1' }).success).toBe(true);
  });

  it('rejects missing toUserId', () => {
    expect(skipSchema.safeParse({}).success).toBe(false);
  });

  it('rejects empty toUserId', () => {
    expect(skipSchema.safeParse({ toUserId: '' }).success).toBe(false);
  });
});
