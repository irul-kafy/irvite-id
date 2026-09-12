import test from 'node:test';
import assert from 'node:assert';
import { getPublicAvailabilityState } from './event-availability';

test('getPublicAvailabilityState matching backend expiry contract', async (t) => {
  const baseNow = new Date('2026-09-12T10:00:00.000Z').getTime();

  await t.test('returns DRAFT when status is DRAFT regardless of eventDate', () => {
    const futureDate = '2026-10-01T10:00:00.000Z';
    assert.strictEqual(getPublicAvailabilityState('DRAFT', futureDate, baseNow), 'DRAFT');

    const pastDate = '2026-08-01T10:00:00.000Z';
    assert.strictEqual(getPublicAvailabilityState('DRAFT', pastDate, baseNow), 'DRAFT');
  });

  await t.test('returns ACTIVE when PUBLISHED and within 30-day window', () => {
    // Event is 7 days in future
    const futureDate = '2026-09-19T10:00:00.000Z';
    assert.strictEqual(getPublicAvailabilityState('PUBLISHED', futureDate, baseNow), 'ACTIVE');

    // Event was 10 days ago (within 30 days window)
    const recentDate = '2026-09-02T10:00:00.000Z';
    assert.strictEqual(getPublicAvailabilityState('PUBLISHED', recentDate, baseNow), 'ACTIVE');

    // Event was 29 days ago (still within 30 days window)
    const edgeDate = new Date(baseNow - 29 * 24 * 60 * 60 * 1000).toISOString();
    assert.strictEqual(getPublicAvailabilityState('PUBLISHED', edgeDate, baseNow), 'ACTIVE');
  });

  await t.test('returns EXPIRED when PUBLISHED and >= 30 days past eventDate', () => {
    // Event was 31 days ago
    const expiredDate = new Date(baseNow - 31 * 24 * 60 * 60 * 1000).toISOString();
    assert.strictEqual(getPublicAvailabilityState('PUBLISHED', expiredDate, baseNow), 'EXPIRED');

    // Event was exactly 30 days ago
    const exact30Days = new Date(baseNow - 30 * 24 * 60 * 60 * 1000).toISOString();
    assert.strictEqual(getPublicAvailabilityState('PUBLISHED', exact30Days, baseNow), 'EXPIRED');
  });

  await t.test('returns DRAFT for invalid date input', () => {
    assert.strictEqual(getPublicAvailabilityState('PUBLISHED', 'invalid-date', baseNow), 'DRAFT');
  });
});
