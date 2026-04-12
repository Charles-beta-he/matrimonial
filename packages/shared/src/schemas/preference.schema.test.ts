import { describe, it, expect } from 'vitest';
import { updatePreferenceSchema } from './preference.schema';

describe('updatePreferenceSchema', () => {
  it('accepts valid age range 18-99', () => {
    const res = updatePreferenceSchema.safeParse({ ageMin: 18, ageMax: 99 });
    expect(res.success).toBe(true);
  });

  it('rejects ageMin < 18', () => {
    expect(updatePreferenceSchema.safeParse({ ageMin: 17 }).success).toBe(false);
  });

  it('rejects ageMax > 99', () => {
    expect(updatePreferenceSchema.safeParse({ ageMax: 100 }).success).toBe(false);
  });

  it('accepts cities array', () => {
    const res = updatePreferenceSchema.safeParse({ cities: ['北京', '上海'] });
    expect(res.success).toBe(true);
  });

  it('accepts boolean for acceptLongDistance', () => {
    expect(updatePreferenceSchema.safeParse({ acceptLongDistance: true }).success).toBe(true);
    expect(updatePreferenceSchema.safeParse({ acceptLongDistance: false }).success).toBe(true);
  });

  it('rejects non-boolean acceptLongDistance', () => {
    expect(updatePreferenceSchema.safeParse({ acceptLongDistance: 'yes' }).success).toBe(false);
  });

  it('accepts empty object (all optional)', () => {
    expect(updatePreferenceSchema.safeParse({}).success).toBe(true);
  });

  it('rejects heightMin out of range', () => {
    expect(updatePreferenceSchema.safeParse({ heightMin: 100 }).success).toBe(false);
  });

  it('accepts valid educationMin enum', () => {
    expect(updatePreferenceSchema.safeParse({ educationMin: 'BACHELOR' }).success).toBe(true);
  });

  it('rejects invalid educationMin enum', () => {
    expect(updatePreferenceSchema.safeParse({ educationMin: 'KINDERGARTEN' }).success).toBe(false);
  });
});
