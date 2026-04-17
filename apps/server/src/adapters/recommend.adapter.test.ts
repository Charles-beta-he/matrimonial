import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/env', () => ({
  env: { RECOMMEND_SERVICE_URL: 'http://localhost:8000' },
  isConfigured: () => false,
}));

vi.mock('../lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('RecommendAdapter', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('getRecommendations returns empty array on fetch failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('connection refused')));
    const { RecommendAdapter } = await import('./recommend.adapter');
    const result = await RecommendAdapter.getRecommendations('user_1', 10);
    expect(result).toEqual([]);
  });

  it('getRecommendations returns items from service when fetch succeeds', async () => {
    const items = [
      { userId: 'u2', score: 0.9 },
      { userId: 'u3', score: 0.7 },
    ];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items }) }),
    );
    const { RecommendAdapter } = await import('./recommend.adapter');
    const result = await RecommendAdapter.getRecommendations('user_1', 5);
    expect(result).toEqual(items);
  });

  it('getRecommendations returns empty array when service returns non-ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) }),
    );
    const { RecommendAdapter } = await import('./recommend.adapter');
    const result = await RecommendAdapter.getRecommendations('user_1', 10);
    expect(result).toEqual([]);
  });

  it('scorePair returns 0.5 on fetch failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));
    const { RecommendAdapter } = await import('./recommend.adapter');
    const score = await RecommendAdapter.scorePair({ id: 'a' }, { id: 'b' });
    expect(score).toBe(0.5);
  });

  it('scorePair returns parsed score from service', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ score: 0.82 }) }),
    );
    const { RecommendAdapter } = await import('./recommend.adapter');
    const score = await RecommendAdapter.scorePair({ id: 'a' }, { id: 'b' });
    expect(score).toBe(0.82);
  });
});
