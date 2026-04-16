import { describe, it, expect } from 'vitest';
import { REPORT_REASONS, REPORT_REASON_LABELS } from './report-reasons';

describe('REPORT_REASONS', () => {
  it('contains 5 reasons', () => {
    expect(REPORT_REASONS).toHaveLength(5);
  });

  it('includes all expected reasons', () => {
    expect(REPORT_REASONS).toContain('FAKE_PROFILE');
    expect(REPORT_REASONS).toContain('HARASSMENT');
    expect(REPORT_REASONS).toContain('SCAM');
    expect(REPORT_REASONS).toContain('INAPPROPRIATE_CONTENT');
    expect(REPORT_REASONS).toContain('OTHER');
  });
});

describe('REPORT_REASON_LABELS', () => {
  it('has a label for each reason', () => {
    for (const reason of REPORT_REASONS) {
      expect(REPORT_REASON_LABELS[reason]).toBeTruthy();
    }
  });

  it('HARASSMENT label is 骚扰', () => {
    expect(REPORT_REASON_LABELS.HARASSMENT).toBe('骚扰');
  });
});
