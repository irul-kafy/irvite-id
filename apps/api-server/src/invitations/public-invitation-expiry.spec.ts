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
});
