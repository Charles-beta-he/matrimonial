import { describe, it, expect } from 'vitest';
import { maskPII, sanitizeUGC, normalizePhone, cleanAge, cleanCity } from './data-clean';

describe('maskPII', () => {
  it('masks phone numbers', () => {
    expect(maskPII('联系我 13812345678')).toBe('联系我 138****5678');
  });

  it('masks ID card numbers', () => {
    expect(maskPII('身份证 110101199001011234')).toBe('身份证 ****');
  });

  it('masks email addresses', () => {
    expect(maskPII('邮箱 test@example.com')).toBe('邮箱 ***@***');
  });
});

describe('sanitizeUGC', () => {
  it('strips HTML tags', () => {
    expect(sanitizeUGC('<b>hello</b>')).toBe('hello');
  });

  it('removes control characters', () => {
    expect(sanitizeUGC('hello\x00world')).toBe('helloworld');
  });

  it('trims whitespace', () => {
    expect(sanitizeUGC('  hello  ')).toBe('hello');
  });

  it('truncates to 5000 chars', () => {
    const long = 'a'.repeat(6000);
    expect(sanitizeUGC(long).length).toBe(5000);
  });
});

describe('normalizePhone', () => {
  it('strips country code 86', () => {
    expect(normalizePhone('8613812345678')).toBe('13812345678');
  });

  it('keeps 11-digit phone starting with 1', () => {
    expect(normalizePhone('13812345678')).toBe('13812345678');
  });

  it('strips non-digit characters', () => {
    expect(normalizePhone('138-1234-5678')).toBe('13812345678');
  });
});

describe('cleanAge', () => {
  it('returns valid age for adult', () => {
    const age = cleanAge('1995-01-01');
    expect(age).toBeGreaterThanOrEqual(18);
    expect(age).toBeLessThanOrEqual(100);
  });

  it('returns null for invalid date', () => {
    expect(cleanAge('not-a-date')).toBeNull();
  });

  it('returns null for underage', () => {
    const recent = new Date();
    recent.setFullYear(recent.getFullYear() - 10);
    expect(cleanAge(recent)).toBeNull();
  });
});

describe('cleanCity', () => {
  it('keeps valid Chinese city name', () => {
    expect(cleanCity('北京')).toBe('北京');
  });

  it('removes special characters', () => {
    expect(cleanCity('北京!@#$%')).toBe('北京');
  });

  it('returns 未知 for empty after cleaning', () => {
    expect(cleanCity('!@#$%')).toBe('未知');
  });
});
