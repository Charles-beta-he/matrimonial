import { describe, it, expect } from 'vitest';
import { createReportSchema } from './report.schema';

const validBase = {
  reportedId: 'u1',
  reason: 'FAKE_PROFILE' as const,
  description: 'a'.repeat(20),
};

describe('createReportSchema', () => {
  it('accepts valid FAKE_PROFILE report', () => {
    expect(createReportSchema.safeParse(validBase).success).toBe(true);
  });

  it('accepts all valid reason enums', () => {
    const reasons = ['FAKE_PROFILE', 'HARASSMENT', 'SCAM', 'INAPPROPRIATE_CONTENT', 'OTHER'] as const;
    for (const reason of reasons) {
      expect(createReportSchema.safeParse({ ...validBase, reason }).success).toBe(true);
    }
  });

  it('rejects invalid reason', () => {
    expect(
      createReportSchema.safeParse({ ...validBase, reason: 'BAD_VIBE' as any }).success,
    ).toBe(false);
  });

  it('evidence array is optional', () => {
    const res = createReportSchema.safeParse({ ...validBase });
    expect(res.success).toBe(true);
  });

  it('accepts valid evidence URLs', () => {
    const res = createReportSchema.safeParse({
      ...validBase,
      evidence: ['https://example.com/1.jpg'],
    });
    expect(res.success).toBe(true);
  });

  it('rejects evidence > 5', () => {
    const res = createReportSchema.safeParse({
      ...validBase,
      evidence: Array(6).fill('https://example.com/1.jpg'),
    });
    expect(res.success).toBe(false);
  });

  it('rejects invalid evidence URL', () => {
    const res = createReportSchema.safeParse({
      ...validBase,
      evidence: ['not-a-url'],
    });
    expect(res.success).toBe(false);
  });

  it('rejects description < 10 chars', () => {
    expect(createReportSchema.safeParse({ ...validBase, description: 'short' }).success).toBe(false);
  });

  it('rejects description > 1000 chars', () => {
    expect(
      createReportSchema.safeParse({ ...validBase, description: 'a'.repeat(1001) }).success,
    ).toBe(false);
  });

  it('rejects missing reportedId', () => {
    const { reportedId: _omit, ...rest } = validBase;
    expect(createReportSchema.safeParse(rest).success).toBe(false);
  });
});
