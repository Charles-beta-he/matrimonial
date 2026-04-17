import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('AppleIapAdapter (mock — not configured)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock('../lib/env', () => ({
      env: { APPLE_SHARED_SECRET: undefined },
      isConfigured: () => false,
    }));
  });

  it('verifyReceipt returns mock result when not configured', async () => {
    const { AppleIapAdapter } = await import('./apple-iap.adapter');
    const result = await AppleIapAdapter.verifyReceipt('base64receipt==');
    expect(result.valid).toBe(true);
    expect(result.status).toBe(0);
    expect(result.environment).toBe('Sandbox');
    expect(result.transactionId).toMatch(/^mock_txn_/);
    expect(result.productId).toBe('mock_product');
  });

  it('verifyReceipt calls Apple production URL when configured and receipt is valid', async () => {
    vi.resetModules();
    vi.doMock('../lib/env', () => ({
      env: { APPLE_SHARED_SECRET: 'shared_secret_123' },
      isConfigured: () => true,
    }));
    const mockFetch = vi.fn().mockResolvedValue({
      json: async () => ({
        status: 0,
        environment: 'Production',
        latest_receipt_info: [{ transaction_id: 'txn_001', product_id: 'vip_monthly' }],
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { AppleIapAdapter } = await import('./apple-iap.adapter');
    const result = await AppleIapAdapter.verifyReceipt('base64receipt==', false);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://buy.itunes.apple.com/verifyReceipt',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(result.valid).toBe(true);
    expect(result.transactionId).toBe('txn_001');
    expect(result.productId).toBe('vip_monthly');
    vi.unstubAllGlobals();
  });

  it('verifyReceipt retries with sandbox URL on status 21007', async () => {
    vi.resetModules();
    vi.doMock('../lib/env', () => ({
      env: { APPLE_SHARED_SECRET: 'shared_secret_123' },
      isConfigured: () => true,
    }));
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        json: async () => ({ status: 21007, environment: 'Sandbox' }),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          status: 0,
          environment: 'Sandbox',
          latest_receipt_info: [{ transaction_id: 'sandbox_txn', product_id: 'vip_monthly' }],
        }),
      });
    vi.stubGlobal('fetch', mockFetch);

    const { AppleIapAdapter } = await import('./apple-iap.adapter');
    const result = await AppleIapAdapter.verifyReceipt('base64receipt==', false);

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      'https://sandbox.itunes.apple.com/verifyReceipt',
      expect.anything(),
    );
    expect(result.valid).toBe(true);
    vi.unstubAllGlobals();
  });
});
