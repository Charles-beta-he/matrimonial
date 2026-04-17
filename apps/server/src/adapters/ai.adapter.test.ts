import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/env', () => ({
  env: { ANTHROPIC_API_KEY: undefined, ANTHROPIC_MODEL: 'claude-test' },
  isConfigured: (s: string) => s === 'claude' ? false : false,
}));

vi.mock('../lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('AIAdapter (mock — not configured)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('generate returns mock icebreaker text when prompt includes 破冰开场白', async () => {
    const { AIAdapter } = await import('./ai.adapter');
    const result = await AIAdapter.generate('请给我推荐 3 条破冰开场白');
    expect(result).toContain('你好');
  });

  it('generate returns generic mock text for unknown prompt', async () => {
    const { AIAdapter } = await import('./ai.adapter');
    const result = await AIAdapter.generate('hello');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('generateIcebreakers returns up to 3 strings', async () => {
    const { AIAdapter } = await import('./ai.adapter');
    const self = { age: 25, gender: 'MALE', bio: '喜欢旅行', tags: ['旅行', '音乐'] };
    const target = { age: 24, gender: 'FEMALE', bio: '热爱生活', tags: ['美食'] };
    const lines = await AIAdapter.generateIcebreakers(self, target);
    expect(Array.isArray(lines)).toBe(true);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.length).toBeLessThanOrEqual(3);
    lines.forEach((l) => expect(typeof l).toBe('string'));
  });

  it('evaluatePromptAnswer returns a score object', async () => {
    const { AIAdapter } = await import('./ai.adapter');
    const result = await AIAdapter.evaluatePromptAnswer('你最喜欢做什么？', '我喜欢读书');
    expect(typeof result.score).toBe('number');
    expect(result.score).toBeGreaterThanOrEqual(1);
  });

  it('generate falls back to mock when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));
    const { AIAdapter } = await import('./ai.adapter');
    const result = await AIAdapter.generate('hello');
    expect(typeof result).toBe('string');
    vi.unstubAllGlobals();
  });
});
