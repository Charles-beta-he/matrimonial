import { describe, it, expect } from 'vitest';
import { registerPhoneSchema } from './register.schema';

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
