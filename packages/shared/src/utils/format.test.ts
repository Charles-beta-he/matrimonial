import { describe, it, expect } from 'vitest';
import { maskPhone, formatDistance } from './format';

describe('maskPhone', () => {
  it('masks middle digits of phone number', () => {
    expect(maskPhone('13812345678')).toBe('138****5678');
  });

  it('returns short phone as-is', () => {
    expect(maskPhone('12345')).toBe('12345');
  });
});

describe('formatDistance', () => {
  it('formats meters for < 1km', () => {
    expect(formatDistance(0.5)).toBe('500m');
  });

  it('formats km with decimal for < 100km', () => {
    expect(formatDistance(5.3)).toBe('5.3km');
  });

  it('formats km rounded for >= 100km', () => {
    expect(formatDistance(150.7)).toBe('151km');
  });
});
