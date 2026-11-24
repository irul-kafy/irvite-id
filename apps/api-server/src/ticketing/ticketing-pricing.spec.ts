import { BadRequestException } from '@nestjs/common';
import {
  assertPaymentMethodAllowed,
  computeOrderAmounts,
  getAllowedPaymentMethods,
  isPaymentMethodAllowed,
  resolveEffectiveServiceFeeBps,
} from './ticketing-pricing';

describe('ticketing-pricing (computeOrderAmounts, promo resolution & payment methods)', () => {
  describe('computeOrderAmounts', () => {
    it('computes 3.5% (350 bps) vs 3% promo (300 bps) for BUYER without any minimum fee', () => {
      // 3.5% on Rp 100.000 -> serviceFee = 3.500; tax 10% = 10.000 -> total = 113.500, organizerNet = 100.000
      const std = computeOrderAmounts(100000, 350, 'BUYER', 10, false);
      expect(std).toEqual({
        subtotal: 100000,
        serviceFee: 3500,
        serviceFeeBps: 350,
        feePayer: 'BUYER',
        taxRatePercent: 10,
        taxIncluded: false,
        taxAmount: 10000,
        total: 113500,
        totalAmount: 113500,
        organizerNet: 100000,
      });

      // 3% promo on Rp 100.000 -> serviceFee = 3.000; tax 10% = 10.000 -> total = 113.000, organizerNet = 100.000
      const promo = computeOrderAmounts(100000, 300, 'BUYER', 10, false);
      expect(promo.serviceFee).toBe(3000);
      expect(promo.totalAmount).toBe(113000);
      expect(promo.organizerNet).toBe(100000);

      // Small order Rp 10.000 at 3.5% -> serviceFee = 350 (no minimum fee!)
      const small = computeOrderAmounts(10000, 350, 'BUYER', 0, false);
      expect(small.serviceFee).toBe(350);
      expect(small.totalAmount).toBe(10350);
    });

    it('computes ORGANIZER feePayer where buyer pays subtotal + tax and organizerNet = subtotal - serviceFee (tax is separate)', () => {
      const org = computeOrderAmounts(200000, 350, 'ORGANIZER', 10, false);
      expect(org).toEqual({
        subtotal: 200000,
        serviceFee: 7000,
        serviceFeeBps: 350,
        feePayer: 'ORGANIZER',
        taxRatePercent: 10,
        taxIncluded: false,
        taxAmount: 20000,
        total: 220000,
        totalAmount: 220000,
        organizerNet: 193000, // 200.000 - 7.000 (taxAmount 20.000 is separate and not part of organizerNet)
      });
    });

    it('rounds serviceFee on the whole order subtotal using Math.round(subtotal * bps / 10000)', () => {
      // subtotal = 33.333, bps = 350 -> 33333 * 350 / 10000 = 1166.655 -> Math.round = 1167
      const res1 = computeOrderAmounts(33333, 350, 'BUYER', 0, false);
      expect(res1.serviceFee).toBe(1167);
      expect(res1.totalAmount).toBe(34500);

      // subtotal = 15.001, bps = 300 -> 15001 * 300 / 10000 = 450.03 -> Math.round = 450
      const res2 = computeOrderAmounts(15001, 300, 'ORGANIZER', 0, false);
      expect(res2.serviceFee).toBe(450);
      expect(res2.organizerNet).toBe(14551);
    });

    it('returns 0 serviceFee, 0 tax, and 0 total for free orders (subtotal = 0)', () => {
      const free = computeOrderAmounts(0, 350, 'BUYER', 11, false);
      expect(free).toEqual({
        subtotal: 0,
        serviceFee: 0,
        serviceFeeBps: 0,
        feePayer: 'BUYER',
        taxRatePercent: 11,
        taxIncluded: false,
        taxAmount: 0,
        total: 0,
        totalAmount: 0,
        organizerNet: 0,
      });
    });
  });

  describe('resolveEffectiveServiceFeeBps (promo active, promo expired, no promo)', () => {
    const now = new Date('2026-11-24T12:00:00.000Z');

    it('uses promoFeeBps when promoEndsAt is in the future (active promo)', () => {
      const res = resolveEffectiveServiceFeeBps(
        {
          serviceFeeBps: 350,
          promoFeeBps: 300,
          promoEndsAt: new Date('2026-12-01T00:00:00.000Z'),
        },
        now,
      );
      expect(res).toEqual({ effectiveBps: 300, isPromoActive: true });
    });

    it('falls back to serviceFeeBps when promoEndsAt is in the past or equal to now (expired promo)', () => {
      const expired = resolveEffectiveServiceFeeBps(
        {
          serviceFeeBps: 350,
          promoFeeBps: 300,
          promoEndsAt: new Date('2026-11-24T11:59:59.000Z'),
        },
        now,
      );
      expect(expired).toEqual({ effectiveBps: 350, isPromoActive: false });
    });

    it('uses serviceFeeBps (or default 350) when no promo is configured', () => {
      const noPromo = resolveEffectiveServiceFeeBps(
        {
          serviceFeeBps: 350,
          promoFeeBps: null,
          promoEndsAt: null,
        },
        now,
      );
      expect(noPromo).toEqual({ effectiveBps: 350, isPromoActive: false });
    });
  });

  describe('Payment method rules (QRIS, EWALLET, VA_*, CARD, FREE)', () => {
    it('allows only FREE when totalAmount === 0 and rejects FREE when totalAmount > 0', () => {
      expect(getAllowedPaymentMethods(0, 150000)).toEqual(['FREE']);
      expect(assertPaymentMethodAllowed('FREE', 0, 150000)).toBe('FREE');
      expect(() => assertPaymentMethodAllowed('QRIS', 0, 150000)).toThrow(
        BadRequestException,
      );
      expect(() => assertPaymentMethodAllowed('FREE', 50000, 150000)).toThrow(
        BadRequestException,
      );
    });

    it('allows QRIS and EWALLET for any paid total, and VA_* only when total >= VA_MIN_TOTAL_IDR (150000)', () => {
      // Below 150.000 (e.g. 149.999)
      const methodsBelow = getAllowedPaymentMethods(149999, 150000);
      expect(methodsBelow).toEqual(['QRIS', 'EWALLET']);
      expect(isPaymentMethodAllowed('QRIS', 149999, 150000)).toBe(true);
      expect(isPaymentMethodAllowed('EWALLET', 149999, 150000)).toBe(true);
      expect(isPaymentMethodAllowed('VA_BCA', 149999, 150000)).toBe(false);
      expect(() =>
        assertPaymentMethodAllowed('VA_BCA', 149999, 150000),
      ).toThrow(BadRequestException);

      // At or above 150.000
      const methodsAbove = getAllowedPaymentMethods(150000, 150000);
      expect(methodsAbove).toContain('QRIS');
      expect(methodsAbove).toContain('EWALLET');
      expect(methodsAbove).toContain('VA_BCA');
      expect(methodsAbove).toContain('VA_MANDIRI');
      expect(assertPaymentMethodAllowed('VA_BCA', 150000, 150000)).toBe(
        'VA_BCA',
      );
      expect(assertPaymentMethodAllowed('VA_BNI', 250000, 150000)).toBe(
        'VA_BNI',
      );
    });

    it('always rejects CARD and unknown payment methods', () => {
      expect(isPaymentMethodAllowed('CARD', 500000, 150000)).toBe(false);
      expect(() => assertPaymentMethodAllowed('CARD', 500000, 150000)).toThrow(
        BadRequestException,
      );
      expect(() =>
        assertPaymentMethodAllowed('CREDIT_CARD', 500000, 150000),
      ).toThrow(BadRequestException);
      expect(() => assertPaymentMethodAllowed('CASH', 500000, 150000)).toThrow(
        BadRequestException,
      );
    });
  });
});
