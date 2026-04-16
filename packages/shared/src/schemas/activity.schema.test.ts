import { describe, it, expect } from 'vitest';
import { createActivitySchema, signupActivitySchema } from './activity.schema';

const validActivity = {
  title: '周末徒步活动',
  description: '一起去爬山，享受大自然的美景，交友联谊。',
  coverUrl: 'https://example.com/cover.jpg',
  category: 'outdoor',
  location: '北京香山公园',
  startTime: new Date(Date.now() + 86400000).toISOString(),
  maxMale: 10,
  maxFemale: 10,
  fee: 0,
};

describe('createActivitySchema', () => {
  it('accepts valid activity', () => {
    expect(createActivitySchema.safeParse(validActivity).success).toBe(true);
  });

  it('rejects title shorter than 2 chars', () => {
    expect(createActivitySchema.safeParse({ ...validActivity, title: 'A' }).success).toBe(false);
  });

  it('rejects title longer than 50 chars', () => {
    expect(createActivitySchema.safeParse({ ...validActivity, title: 'A'.repeat(51) }).success).toBe(false);
  });

  it('rejects description shorter than 10 chars', () => {
    expect(createActivitySchema.safeParse({ ...validActivity, description: '太短了' }).success).toBe(false);
  });

  it('rejects description longer than 2000 chars', () => {
    expect(createActivitySchema.safeParse({ ...validActivity, description: 'A'.repeat(2001) }).success).toBe(false);
  });

  it('rejects invalid coverUrl', () => {
    expect(createActivitySchema.safeParse({ ...validActivity, coverUrl: 'not-a-url' }).success).toBe(false);
  });

  it('rejects empty category', () => {
    expect(createActivitySchema.safeParse({ ...validActivity, category: '' }).success).toBe(false);
  });

  it('rejects empty location', () => {
    expect(createActivitySchema.safeParse({ ...validActivity, location: '' }).success).toBe(false);
  });

  it('rejects invalid startTime format', () => {
    expect(createActivitySchema.safeParse({ ...validActivity, startTime: '2026-01-01' }).success).toBe(false);
  });

  it('rejects maxMale < 1', () => {
    expect(createActivitySchema.safeParse({ ...validActivity, maxMale: 0 }).success).toBe(false);
  });

  it('rejects maxFemale > 500', () => {
    expect(createActivitySchema.safeParse({ ...validActivity, maxFemale: 501 }).success).toBe(false);
  });

  it('rejects negative fee', () => {
    expect(createActivitySchema.safeParse({ ...validActivity, fee: -1 }).success).toBe(false);
  });

  it('accepts fee of 0 (free activity)', () => {
    expect(createActivitySchema.safeParse({ ...validActivity, fee: 0 }).success).toBe(true);
  });
});

describe('signupActivitySchema', () => {
  it('accepts valid activityId', () => {
    expect(signupActivitySchema.safeParse({ activityId: 'act-123' }).success).toBe(true);
  });

  it('rejects empty activityId', () => {
    expect(signupActivitySchema.safeParse({ activityId: '' }).success).toBe(false);
  });

  it('rejects missing activityId', () => {
    expect(signupActivitySchema.safeParse({}).success).toBe(false);
  });
});
