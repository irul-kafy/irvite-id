import { isPublicInvitationExpired } from './public-invitation-expiry';

describe('isPublicInvitationExpired', () => {
  it('should return false if exact expiry - 1ms (not expired)', () => {
    const eventDate = new Date('2026-08-01T00:00:00.000Z');
    // 30 days later exactly is 2026-08-31T00:00:00.000Z
    const now = new Date('2026-08-30T23:59:59.999Z');

    expect(isPublicInvitationExpired(eventDate, now)).toBe(false);
  });

  it('should return true if exact expiry (expired)', () => {
    const eventDate = new Date('2026-08-01T00:00:00.000Z');
    const now = new Date('2026-08-31T00:00:00.000Z');

    expect(isPublicInvitationExpired(eventDate, now)).toBe(true);
  });

  it('should return true if exact expiry + 1ms (expired)', () => {
    const eventDate = new Date('2026-08-01T00:00:00.000Z');
    const now = new Date('2026-08-31T00:00:00.001Z');

    expect(isPublicInvitationExpired(eventDate, now)).toBe(true);
  });

  describe('with explicit activeUntil', () => {
    it('uses activeUntil instead of eventDate + 30 days', () => {
      const eventDate = new Date('2026-08-01T00:00:00.000Z');
      // activeUntil extended to 6 months later
      const activeUntil = new Date('2027-02-01T00:00:00.000Z');

      // 60 days after eventDate would be expired by default, but activeUntil gives 6 months
      const testNow = new Date('2026-10-01T00:00:00.000Z');
      expect(isPublicInvitationExpired(eventDate, testNow, activeUntil)).toBe(false);

      // After activeUntil, it is expired
      const afterExpiry = new Date('2027-02-01T00:00:00.001Z');
      expect(isPublicInvitationExpired(eventDate, afterExpiry, activeUntil)).toBe(true);
    });
  });
});
