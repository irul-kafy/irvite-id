import { ServiceUnavailableException } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  getPaymentWebhookSecret,
  safeCompareSecret,
} from './ticketing-secrets';

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
  provider?: string;
}

export interface PaymentWebhookVerifier {
  readonly provider: string;
  computeWebhookSignature(payload: WebhookSignaturePayload): string;
  verifyWebhookSignature(
    payload: WebhookSignaturePayload,
    signatureHeader: string | undefined,
  ): boolean;
}

export interface PaymentService extends PaymentWebhookVerifier {
  readonly mode: 'mock' | 'gateway';
  createPaymentIntent(input: PaymentIntentInput): Promise<PaymentIntentResult>;
  registerWebhookVerifier(verifier: PaymentWebhookVerifier): void;
}

/**
 * Resolves PAYMENT_WEBHOOK_SECRET strictly from its own environment variable
 * via requireSecret without falling back to TICKET_PAYMENT_WEBHOOK_SECRET or TICKET_QR_SECRET.
 */
export function resolvePaymentWebhookSecret(): string {
  return getPaymentWebhookSecret();
}

export class HmacPaymentWebhookVerifier implements PaymentWebhookVerifier {
  constructor(readonly provider: string) {}

  computeWebhookSignature(payload: WebhookSignaturePayload): string {
    const secret = resolvePaymentWebhookSecret();
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
    return safeCompareSecret(signatureHeader.trim(), expectedHex);
  }
}

abstract class BaseProviderPaymentService implements PaymentService {
  abstract readonly mode: 'mock' | 'gateway';
  abstract readonly provider: string;
  private readonly verifiers = new Map<string, PaymentWebhookVerifier>();
  private readonly defaultVerifier: PaymentWebhookVerifier;

  protected constructor(defaultVerifier: PaymentWebhookVerifier) {
    this.defaultVerifier = defaultVerifier;
    this.registerWebhookVerifier(defaultVerifier);
    this.verifiers.set('default', defaultVerifier);
  }

  abstract createPaymentIntent(
    input: PaymentIntentInput,
  ): Promise<PaymentIntentResult>;

  registerWebhookVerifier(verifier: PaymentWebhookVerifier): void {
    this.verifiers.set(verifier.provider.trim().toLowerCase(), verifier);
  }

  protected resolveVerifier(
    providerName?: string,
  ): PaymentWebhookVerifier | null {
    if (!providerName || !providerName.trim()) {
      return this.defaultVerifier;
    }
    const key = providerName.trim().toLowerCase();
    return this.verifiers.get(key) ?? null;
  }

  computeWebhookSignature(payload: WebhookSignaturePayload): string {
    const verifier =
      this.resolveVerifier(payload.provider) ?? this.defaultVerifier;
    return verifier.computeWebhookSignature(payload);
  }

  verifyWebhookSignature(
    payload: WebhookSignaturePayload,
    signatureHeader: string | undefined,
  ): boolean {
    const verifier = this.resolveVerifier(payload.provider);
    if (!verifier) {
      return false;
    }
    return verifier.verifyWebhookSignature(payload, signatureHeader);
  }
}

export class MockPaymentService extends BaseProviderPaymentService {
  readonly mode = 'mock' as const;
  readonly provider = 'mock';

  constructor(
    verifier: PaymentWebhookVerifier = new HmacPaymentWebhookVerifier('mock'),
  ) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'MockPaymentService dilarang aktif di lingkungan production.',
      );
    }
    super(verifier);
    this.registerWebhookVerifier(new HmacPaymentWebhookVerifier('gateway'));
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

export class GatewayPaymentService extends BaseProviderPaymentService {
  readonly mode = 'gateway' as const;
  readonly provider = 'gateway';

  constructor(
    verifier: PaymentWebhookVerifier = new HmacPaymentWebhookVerifier(
      'gateway',
    ),
  ) {
    super(verifier);
  }

  createPaymentIntent(
    _input: PaymentIntentInput,
  ): Promise<PaymentIntentResult> {
    void _input;
    return Promise.reject(
      new ServiceUnavailableException('Pembayaran belum tersedia'),
    );
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
