import { describe, it, expect } from 'vitest';
import { BUDDY_TYPES, BUDDY_TYPE_COLORS } from './buddy-types';

describe('BUDDY_TYPES', () => {
  it('contains 6 buddy types', () => {
    expect(BUDDY_TYPES).toHaveLength(6);
  });

  it('each type has id, label, and icon', () => {
    for (const bt of BUDDY_TYPES) {
      expect(bt.id).toBeTruthy();
      expect(bt.label).toBeTruthy();
      expect(bt.icon).toBeTruthy();
    }
  });

  it('ids are unique', () => {
    const ids = BUDDY_TYPES.map((bt) => bt.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('BUDDY_TYPE_COLORS', () => {
  it('has a color for each BUDDY_TYPES id', () => {
    for (const bt of BUDDY_TYPES) {
      expect(BUDDY_TYPE_COLORS[bt.id]).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});
