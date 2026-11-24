import { BadRequestException } from '@nestjs/common';

export type TicketFeePayerType = 'BUYER' | 'ORGANIZER';

export const DEFAULT_SERVICE_FEE_BPS_FALLBACK = 350;
export const DEFAULT_VA_MIN_TOTAL_IDR_FALLBACK = 150000;
export const DEFAULT_ORDER_EXPIRY_MINUTES_FALLBACK = 30;

export const SUPPORTED_VA_PAYMENT_METHODS = [
  'VA_BCA',
  'VA_BNI',
  'VA_BRI',
  'VA_MANDIRI',
  'VA_PERMATA',
] as const;

export const ALWAYS_ALLOWED_PAID_METHODS = ['QRIS', 'EWALLET'] as const;

export interface ComputedOrderAmounts {
  subtotal: number;
  serviceFee: number;
  serviceFeeBps: number;
  feePayer: TicketFeePayerType;
  taxRatePercent: number;
  taxIncluded: boolean;
  taxAmount: number;
  total: number;
  totalAmount: number;
  organizerNet: number;
}

export function getDefaultServiceFeeBps(): number {
  const raw = process.env.DEFAULT_SERVICE_FEE_BPS;
  if (raw !== undefined && raw.trim() !== '') {
    const parsed = Number(raw.trim());
    if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 1000) {
      return parsed;
    }
  }
  return DEFAULT_SERVICE_FEE_BPS_FALLBACK;
}

export function getVaMinTotalIdr(): number {
  const raw = process.env.VA_MIN_TOTAL_IDR;
  if (raw !== undefined && raw.trim() !== '') {
    const parsed = Number(raw.trim());
    if (Number.isInteger(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return DEFAULT_VA_MIN_TOTAL_IDR_FALLBACK;
}

export function getOrderExpiryMinutes(): number {
  const raw = process.env.ORDER_EXPIRY_MINUTES;
  if (raw !== undefined && raw.trim() !== '') {
    const parsed = Number(raw.trim());
    if (Number.isInteger(parsed) && parsed >= 1) {
      return parsed;
    }
  }
  return DEFAULT_ORDER_EXPIRY_MINUTES_FALLBACK;
}

export function resolveEffectiveServiceFeeBps(
  event: {
    serviceFeeBps?: number | null;
    promoFeeBps?: number | null;
    promoEndsAt?: Date | string | null;
  },
  now: Date = new Date(),
  defaultBps: number = getDefaultServiceFeeBps(),
): { effectiveBps: number; isPromoActive: boolean } {
  const baseBps =
    typeof event.serviceFeeBps === 'number' &&
    Number.isInteger(event.serviceFeeBps) &&
    event.serviceFeeBps >= 0 &&
    event.serviceFeeBps <= 1000
      ? event.serviceFeeBps
      : defaultBps;

  if (
    typeof event.promoFeeBps === 'number' &&
    Number.isInteger(event.promoFeeBps) &&
    event.promoFeeBps >= 0 &&
    event.promoFeeBps <= 1000 &&
    event.promoEndsAt !== null &&
    event.promoEndsAt !== undefined
  ) {
    const promoEnd =
      event.promoEndsAt instanceof Date
        ? event.promoEndsAt
        : new Date(event.promoEndsAt);
    if (!isNaN(promoEnd.getTime()) && promoEnd.getTime() > now.getTime()) {
      return {
        effectiveBps: event.promoFeeBps,
        isPromoActive: true,
      };
    }
  }

  return {
    effectiveBps: baseBps,
    isPromoActive: false,
  };
}

/**
 * Pure money calculation function for a ticket order.
 * - All numbers are integer Rupiah.
 * - serviceFee = Math.round(subtotal * bps / 10000) for the whole order (no minimum). Free order -> 0.
 * - BUYER: total = subtotal + serviceFee + taxAmount; organizerNet = subtotal.
 * - ORGANIZER: total = subtotal + taxAmount; organizerNet = subtotal - serviceFee.
 * - Tax (taxAmount) is displayed separately and is never part of organizerNet.
 */
export function computeOrderAmounts(
  subtotal: number,
  bps: number,
  feePayer: TicketFeePayerType,
  taxRatePercent: number,
  taxIncluded: boolean,
): ComputedOrderAmounts {
  const safeSubtotal = Math.max(0, Math.round(subtotal));
  const safeBps = Math.max(0, Math.min(1000, Math.round(bps)));
  const safeTaxRate = Math.max(0, Math.min(100, Math.round(taxRatePercent)));

  if (safeSubtotal === 0) {
    return {
      subtotal: 0,
      serviceFee: 0,
      serviceFeeBps: 0,
      feePayer,
      taxRatePercent: safeTaxRate,
      taxIncluded,
      taxAmount: 0,
      total: 0,
      totalAmount: 0,
      organizerNet: 0,
    };
  }

  const serviceFee = Math.round((safeSubtotal * safeBps) / 10000);
  const taxAmount =
    taxIncluded || safeTaxRate === 0
      ? 0
      : Math.round((safeSubtotal * safeTaxRate) / 100);

  const total =
    feePayer === 'BUYER'
      ? safeSubtotal + serviceFee + taxAmount
      : safeSubtotal + taxAmount;

  const organizerNet =
    feePayer === 'ORGANIZER'
      ? Math.max(0, safeSubtotal - serviceFee)
      : safeSubtotal;

  return {
    subtotal: safeSubtotal,
    serviceFee,
    serviceFeeBps: safeBps,
    feePayer,
    taxRatePercent: safeTaxRate,
    taxIncluded,
    taxAmount,
    total,
    totalAmount: total,
    organizerNet,
  };
}

export function getAllowedPaymentMethods(
  totalAmount: number,
  vaMinTotalIdr: number = getVaMinTotalIdr(),
): string[] {
  const safeTotal = Math.max(0, Math.round(totalAmount));
  if (safeTotal === 0) {
    return ['FREE'];
  }

  const methods: string[] = [...ALWAYS_ALLOWED_PAID_METHODS];
  if (safeTotal >= vaMinTotalIdr) {
    methods.push(...SUPPORTED_VA_PAYMENT_METHODS);
  }
  return methods;
}

export function isPaymentMethodAllowed(
  paymentMethod: string,
  totalAmount: number,
  vaMinTotalIdr: number = getVaMinTotalIdr(),
): boolean {
  if (!paymentMethod || typeof paymentMethod !== 'string') {
    return false;
  }
  const normalized = paymentMethod.trim().toUpperCase();
  const safeTotal = Math.max(0, Math.round(totalAmount));

  if (safeTotal === 0) {
    return normalized === 'FREE';
  }

  if (normalized === 'FREE') {
    return false;
  }

  if (normalized === 'CARD' || normalized.startsWith('CARD_')) {
    return false;
  }

  if (normalized === 'QRIS' || normalized === 'EWALLET') {
    return true;
  }

  if (/^VA_[A-Z0-9_]+$/.test(normalized)) {
    return safeTotal >= vaMinTotalIdr;
  }

  return false;
}

export function assertPaymentMethodAllowed(
  paymentMethod: string,
  totalAmount: number,
  vaMinTotalIdr: number = getVaMinTotalIdr(),
): string {
  const normalized = (paymentMethod || '').trim().toUpperCase();
  const safeTotal = Math.max(0, Math.round(totalAmount));

  if (!normalized) {
    throw new BadRequestException('Metode pembayaran wajib dipilih.');
  }

  if (safeTotal === 0 && normalized !== 'FREE') {
    throw new BadRequestException(
      'Pesanan gratis hanya dapat menggunakan metode pembayaran FREE.',
    );
  }

  if (safeTotal > 0 && normalized === 'FREE') {
    throw new BadRequestException(
      'Metode pembayaran FREE hanya berlaku untuk pesanan gratis (Rp 0).',
    );
  }

  if (normalized === 'CARD' || normalized.startsWith('CARD_')) {
    throw new BadRequestException(
      'Metode pembayaran kartu (CARD) tidak diizinkan.',
    );
  }

  if (/^VA_[A-Z0-9_]+$/.test(normalized) && safeTotal < vaMinTotalIdr) {
    throw new BadRequestException(
      `Metode pembayaran Virtual Account (${normalized}) hanya tersedia untuk total tagihan minimal Rp ${vaMinTotalIdr.toLocaleString('id-ID')}.`,
    );
  }

  if (!isPaymentMethodAllowed(normalized, safeTotal, vaMinTotalIdr)) {
    throw new BadRequestException(
      `Metode pembayaran "${paymentMethod}" tidak diizinkan untuk pesanan ini.`,
    );
  }

  return normalized;
}
