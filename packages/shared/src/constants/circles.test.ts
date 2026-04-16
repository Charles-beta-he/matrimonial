import { describe, it, expect } from 'vitest';
import { CIRCLE_CATEGORIES } from './circles';

describe('CIRCLE_CATEGORIES', () => {
  it('contains 8 categories', () => {
    expect(CIRCLE_CATEGORIES).toHaveLength(8);
  });

  it('each category has id, label, and icon', () => {
    for (const c of CIRCLE_CATEGORIES) {
      expect(c.id).toBeTruthy();
      expect(c.label).toBeTruthy();
      expect(c.icon).toBeTruthy();
    }
  });

  it('ids are unique', () => {
    const ids = CIRCLE_CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
