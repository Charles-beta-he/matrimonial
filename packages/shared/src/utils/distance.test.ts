import { describe, it, expect } from 'vitest';
import { haversineKm } from './distance';

describe('haversineKm', () => {
  it('returns 0 for same point', () => {
    expect(haversineKm(39.9, 116.4, 39.9, 116.4)).toBe(0);
  });

  it('calculates Beijing to Shanghai approximately correctly', () => {
    const km = haversineKm(39.9042, 116.4074, 31.2304, 121.4737);
    expect(km).toBeGreaterThan(1000);
    expect(km).toBeLessThan(1200);
  });
});
