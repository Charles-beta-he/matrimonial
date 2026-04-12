import { describe, it, expect } from 'vitest';
import { PRODUCT_CATALOG, findProduct } from './products';

describe('findProduct', () => {
  it('returns correct product by ID', () => {
    const p = findProduct('MEMBERSHIP_MONTHLY');
    expect(p).toBeDefined();
    expect(p?.name).toBe('月卡会员');
    expect(p?.type).toBe('MEMBERSHIP');
  });

  it('returns undefined for unknown ID', () => {
    expect(findProduct('UNKNOWN_ID')).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    expect(findProduct('')).toBeUndefined();
  });
});

describe('PRODUCT_CATALOG', () => {
  it('all products have required fields', () => {
    for (const p of PRODUCT_CATALOG) {
      expect(p.productId).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.description).toBeTruthy();
      expect(p.type).toBeTruthy();
      expect(typeof p.price).toBe('number');
    }
  });

  it('all prices are positive integers (fen)', () => {
    for (const p of PRODUCT_CATALOG) {
      expect(p.price).toBeGreaterThan(0);
      expect(Number.isInteger(p.price)).toBe(true);
    }
  });

  it('all productIds are unique', () => {
    const ids = PRODUCT_CATALOG.map((p) => p.productId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all product types are valid', () => {
    const validTypes = ['MEMBERSHIP', 'SUPER_LIKE', 'BOOST', 'LOVE_LETTER', 'VIDEO_TICKET'];
    for (const p of PRODUCT_CATALOG) {
      expect(validTypes).toContain(p.type);
    }
  });

  it('contains at least one of each product type', () => {
    const types = new Set(PRODUCT_CATALOG.map((p) => p.type));
    expect(types.has('MEMBERSHIP')).toBe(true);
    expect(types.has('SUPER_LIKE')).toBe(true);
    expect(types.has('BOOST')).toBe(true);
    expect(types.has('LOVE_LETTER')).toBe(true);
    expect(types.has('VIDEO_TICKET')).toBe(true);
  });
});
