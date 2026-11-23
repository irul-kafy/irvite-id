import * as crypto from 'crypto';

export const PAYMENT_SERVICE = 'PAYMENT_SERVICE';

export interface PaymentIntentInput {
  orderCode: string;
  totalAmount: number;
  paymentMethod: string;
  expiresAt: Date;
}

export interface PaymentIntentResult {
  paymentRef: string;
  mode: 'mock' | 'gateway';
  instructions: string;
}

export interface WebhookSignaturePayload {
  orderCode: string;
  transactionStatus: string;
  grossAmount?: number;
}

export interface PaymentService {
  readonly mode: 'mock' | 'gateway';
  createPaymentIntent(input: PaymentIntentInput): Promise<PaymentIntentResult>;
  computeWebhookSignature(payload: WebhookSignaturePayload): string;
  verifyWebhookSignature(
    payload: WebhookSignaturePayload,
    signatureHeader: string | undefined,
  ): boolean;
}

function resolveWebhookSecret(): string {
  const secret =
    process.env.PAYMENT_WEBHOOK_SECRET ||
    process.env.TICKET_PAYMENT_WEBHOOK_SECRET ||
    process.env.TICKET_QR_SECRET;

  if (secret && secret.trim().length >= 16) {
    return secret.trim();
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Konfigurasi PAYMENT_WEBHOOK_SECRET belum diatur di lingkungan produksi.',
    );
  }
  return 'dev-test-payment-webhook-hmac-secret-32-bytes';
}

abstract class BaseHmacPaymentService implements PaymentService {
  abstract readonly mode: 'mock' | 'gateway';
  abstract createPaymentIntent(
    input: PaymentIntentInput,
  ): Promise<PaymentIntentResult>;

  computeWebhookSignature(payload: WebhookSignaturePayload): string {
    const secret = resolveWebhookSecret();
    const canonical = `${payload.orderCode}:${payload.transactionStatus}:${payload.grossAmount ?? ''}`;
    return crypto.createHmac('sha256', secret).update(canonical).digest('hex');
  }

  verifyWebhookSignature(
    payload: WebhookSignaturePayload,
    signatureHeader: string | undefined,
  ): boolean {
    if (!signatureHeader || typeof signatureHeader !== 'string') {
      return false;
    }
    const expectedHex = this.computeWebhookSignature(payload);
    const providedBuf = Buffer.from(signatureHeader.trim(), 'utf8');
    const expectedBuf = Buffer.from(expectedHex, 'utf8');
    if (providedBuf.length !== expectedBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(providedBuf, expectedBuf);
  }
}

export class MockPaymentService extends BaseHmacPaymentService {
  readonly mode = 'mock' as const;

  constructor() {
    super();
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'MockPaymentService dilarang aktif di lingkungan production.',
      );
    }
  }

  createPaymentIntent(input: PaymentIntentInput): Promise<PaymentIntentResult> {
    const suffix = crypto.randomBytes(6).toString('hex').toUpperCase();
    return Promise.resolve({
      paymentRef: `MOCK-PAY-${suffix}`,
      mode: 'mock',
      instructions: `Simulasi pembayaran ${input.paymentMethod} sebesar Rp ${input.totalAmount.toLocaleString('id-ID')} untuk pesanan ${input.orderCode}.`,
    });
  }
}

export class GatewayPaymentService extends BaseHmacPaymentService {
  readonly mode = 'gateway' as const;

  createPaymentIntent(input: PaymentIntentInput): Promise<PaymentIntentResult> {
    const suffix = crypto.randomBytes(6).toString('hex').toUpperCase();
    return Promise.resolve({
      paymentRef: `GW-PAY-${suffix}`,
      mode: 'gateway',
      instructions: `Selesaikan pembayaran ${input.paymentMethod} sebesar Rp ${input.totalAmount.toLocaleString('id-ID')} sebelum waktu kedaluwarsa.`,
    });
  }
}

export function createPaymentService(): PaymentService {
  const isMockRequested =
    (process.env.PAYMENT_MODE || '').trim().toLowerCase() === 'mock';
  const isNotProduction = process.env.NODE_ENV !== 'production';

  if (isMockRequested && isNotProduction) {
    return new MockPaymentService();
  }
  return new GatewayPaymentService();
}
