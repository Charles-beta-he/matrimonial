import { describe, it, expect } from 'vitest';
import { VERIFICATION_LEVELS, VERIFICATION_LEVEL_LABELS, VERIFICATION_LEVEL_COLORS } from './verification-levels';

describe('VERIFICATION_LEVELS', () => {
  it('contains L1 through L4 in order', () => {
    expect(VERIFICATION_LEVELS).toEqual(['L1', 'L2', 'L3', 'L4']);
  });
});

describe('VERIFICATION_LEVEL_LABELS', () => {
  it('has a label for each level', () => {
    for (const level of VERIFICATION_LEVELS) {
      expect(VERIFICATION_LEVEL_LABELS[level]).toBeTruthy();
    }
  });

  it('L1 is 手机认证', () => {
    expect(VERIFICATION_LEVEL_LABELS.L1).toBe('手机认证');
  });

  it('L4 is 学历认证', () => {
    expect(VERIFICATION_LEVEL_LABELS.L4).toBe('学历认证');
  });
});

describe('VERIFICATION_LEVEL_COLORS', () => {
  it('has a valid hex color for each level', () => {
    for (const level of VERIFICATION_LEVELS) {
      expect(VERIFICATION_LEVEL_COLORS[level]).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});
