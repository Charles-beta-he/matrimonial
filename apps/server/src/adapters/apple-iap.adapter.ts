import { env, isConfigured } from '../lib/env';
import { logger } from '../lib/logger';

const configured = isConfigured('apple_iap');

export interface AppleVerifyResult {
  valid: boolean;
  status: number;
  environment: string | null;
  transactionId: string | null;
  productId: string | null;
}

export const AppleIapAdapter = {
  /**
   * Verify an Apple IAP receipt against the App Store verifyReceipt endpoint.
   * Automatically retries with sandbox URL if a sandbox receipt is sent to production.
   */
  async verifyReceipt(
    receiptData: string,
    isSandbox: boolean = false,
  ): Promise<AppleVerifyResult> {
    if (!configured) {
      logger.info('apple iap mock (APPLE_SHARED_SECRET not configured)', {
        receiptLen: receiptData.length,
      });
      return {
        valid: true,
        status: 0,
        environment: 'Sandbox',
        transactionId: `mock_txn_${Date.now()}`,
        productId: 'mock_product',
      };
    }

    const url = isSandbox
      ? 'https://sandbox.itunes.apple.com/verifyReceipt'
      : 'https://buy.itunes.apple.com/verifyReceipt';

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        'receipt-data': receiptData,
        password: env.APPLE_SHARED_SECRET ?? '',
        'exclude-old-transactions': true,
      }),
    });

    const result = (await response.json()) as any;

    logger.info('apple verifyReceipt response', {
      status: result.status,
      environment: result.environment,
      isSandbox,
    });

    // Status 21007 means sandbox receipt was sent to production — retry with sandbox
    if (result.status === 21007 && !isSandbox) {
      return this.verifyReceipt(receiptData, true);
    }

    const latestTxn = result.latest_receipt_info?.[0] ?? null;

    return {
      valid: result.status === 0,
      status: result.status,
      environment: result.environment ?? null,
      transactionId: latestTxn?.transaction_id ?? null,
      productId: latestTxn?.product_id ?? null,
    };
  },
};
