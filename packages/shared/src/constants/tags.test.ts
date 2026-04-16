import { describe, it, expect } from 'vitest';
import { TAG_CATEGORIES, ALL_TAGS, DEFAULT_TAG_SUGGESTIONS } from './tags';

describe('TAG_CATEGORIES', () => {
  it('has 4 categories', () => {
    expect(Object.keys(TAG_CATEGORIES)).toHaveLength(4);
  });

  it('each category has at least 5 tags', () => {
    for (const tags of Object.values(TAG_CATEGORIES)) {
      expect(tags.length).toBeGreaterThanOrEqual(5);
    }
  });
});

describe('ALL_TAGS', () => {
  it('is a flat array of all tags across categories', () => {
    const expected = Object.values(TAG_CATEGORIES).flat();
    expect(ALL_TAGS).toEqual(expected);
  });

  it('has no duplicate tags', () => {
    expect(new Set(ALL_TAGS).size).toBe(ALL_TAGS.length);
  });
});

describe('DEFAULT_TAG_SUGGESTIONS', () => {
  it('contains common lifestyle tags', () => {
    expect(DEFAULT_TAG_SUGGESTIONS).toContain('读书');
    expect(DEFAULT_TAG_SUGGESTIONS).toContain('运动');
  });

  it('all suggestions are in ALL_TAGS', () => {
    for (const tag of DEFAULT_TAG_SUGGESTIONS) {
      expect(ALL_TAGS).toContain(tag);
    }
  });
});
