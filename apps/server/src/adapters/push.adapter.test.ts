import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('push adapter (mock — not configured)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock('../lib/env', () => ({
      env: { JPUSH_APP_KEY: undefined, JPUSH_MASTER_SECRET: undefined },
      isConfigured: () => false,
    }));
  });

  it('sendToUser resolves without error using mock adapter', async () => {
    const { push } = await import('./push.adapter');
    await expect(
      push.sendToUser('user_1', null, { title: 'Test', body: 'Hello' }),
    ).resolves.toBeUndefined();
  });

  it('sendToUsers resolves without error using mock adapter', async () => {
    const { push } = await import('./push.adapter');
    await expect(
      push.sendToUsers(
        [{ userId: 'u1', registrationId: 'reg_1' }, { userId: 'u2', registrationId: null }],
        { title: 'Batch', body: 'Hi all' },
      ),
    ).resolves.toBeUndefined();
  });
});

describe('push adapter (jpush — configured)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock('../lib/env', () => ({
      env: { JPUSH_APP_KEY: 'app_key_123', JPUSH_MASTER_SECRET: 'master_secret_abc' },
      isConfigured: (s: string) => s === 'jpush',
    }));
  });

  it('sendToUser calls JPush API with correct registration_id', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', mockFetch);

    const { push } = await import('./push.adapter');
    await push.sendToUser('user_1', 'reg_id_xyz', { title: 'Hi', body: 'World' });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.jpush.cn/v3/push',
      expect.objectContaining({ method: 'POST' }),
    );
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.audience.registration_id).toContain('reg_id_xyz');
    vi.unstubAllGlobals();
  });

  it('sendToUser skips fetch when registrationId is null', async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    const { push } = await import('./push.adapter');
    await push.sendToUser('user_1', null, { title: 'Hi', body: 'World' });

    expect(mockFetch).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('sendToUser handles fetch error gracefully', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('network error'));
    vi.stubGlobal('fetch', mockFetch);

    const { push } = await import('./push.adapter');
    await expect(
      push.sendToUser('user_1', 'reg_123', { title: 'Hi', body: 'World' }),
    ).resolves.toBeUndefined();
    vi.unstubAllGlobals();
  });
});
