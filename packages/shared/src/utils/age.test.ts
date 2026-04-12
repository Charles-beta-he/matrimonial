import { describe, it, expect } from 'vitest';
import { calculateAge } from './age';

describe('calculateAge', () => {
  it('calculates age correctly for past birthday this year', () => {
    const birthday = new Date();
    birthday.setFullYear(birthday.getFullYear() - 25);
    birthday.setMonth(birthday.getMonth() - 1); // 1 month ago
    expect(calculateAge(birthday)).toBe(25);
  });

  it('handles birthday not yet occurred this year', () => {
    const birthday = new Date();
    birthday.setFullYear(birthday.getFullYear() - 25);
    birthday.setMonth(birthday.getMonth() + 1); // 1 month from now
    expect(calculateAge(birthday)).toBe(24);
  });

  it('handles same day birthday', () => {
    const birthday = new Date();
    birthday.setFullYear(birthday.getFullYear() - 30);
    expect(calculateAge(birthday)).toBe(30);
  });
});
