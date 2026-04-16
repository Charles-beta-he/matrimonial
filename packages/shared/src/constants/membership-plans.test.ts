import { describe, it, expect } from 'vitest';
import { MEMBERSHIP_PLANS, DAILY_SWIPE_LIMITS, MEMBERSHIP_PLAN_DETAILS } from './membership-plans';

describe('MEMBERSHIP_PLANS', () => {
  it('contains exactly FREE MONTHLY QUARTERLY YEARLY', () => {
    expect(MEMBERSHIP_PLANS).toEqual(['FREE', 'MONTHLY', 'QUARTERLY', 'YEARLY']);
  });
});

describe('DAILY_SWIPE_LIMITS', () => {
  it('FREE plan has 30 swipes', () => {
    expect(DAILY_SWIPE_LIMITS.FREE).toBe(30);
  });

  it('MONTHLY and QUARTERLY share 100 swipes', () => {
    expect(DAILY_SWIPE_LIMITS.MONTHLY).toBe(100);
    expect(DAILY_SWIPE_LIMITS.QUARTERLY).toBe(100);
  });

  it('YEARLY has Infinity swipes', () => {
    expect(DAILY_SWIPE_LIMITS.YEARLY).toBe(Infinity);
  });

  it('covers all plans in MEMBERSHIP_PLANS', () => {
    for (const plan of MEMBERSHIP_PLANS) {
      expect(DAILY_SWIPE_LIMITS[plan]).toBeDefined();
    }
  });
});

describe('MEMBERSHIP_PLAN_DETAILS', () => {
  it('contains 3 paid plans (no FREE)', () => {
    expect(MEMBERSHIP_PLAN_DETAILS).toHaveLength(3);
    expect(MEMBERSHIP_PLAN_DETAILS.map((p) => p.plan)).toEqual(['MONTHLY', 'QUARTERLY', 'YEARLY']);
  });

  it('each plan has price and originalPrice with originalPrice >= price', () => {
    for (const plan of MEMBERSHIP_PLAN_DETAILS) {
      expect(plan.price).toBeGreaterThan(0);
      expect(plan.originalPrice).toBeGreaterThanOrEqual(plan.price);
    }
  });

  it('each plan has non-empty features array', () => {
    for (const plan of MEMBERSHIP_PLAN_DETAILS) {
      expect(plan.features.length).toBeGreaterThan(0);
    }
  });

  it('MONTHLY plan label is 月卡', () => {
    const monthly = MEMBERSHIP_PLAN_DETAILS.find((p) => p.plan === 'MONTHLY');
    expect(monthly?.label).toBe('月卡');
  });

  it('YEARLY plan has Infinity daily swipe limit', () => {
    const yearly = MEMBERSHIP_PLAN_DETAILS.find((p) => p.plan === 'YEARLY');
    expect(yearly?.dailySwipeLimit).toBe(Infinity);
  });
});
