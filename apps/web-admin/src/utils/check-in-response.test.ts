import test from 'node:test';
import assert from 'node:assert';

interface ResolveData {
  guest: { name: string; maxPax: number };
  rsvp?: { response: string; pax?: number };
  attendance?: { scannedPax: number; scannedAt: string };
}

interface CheckInResponse {
  result: 'CHECKED_IN' | 'ALREADY_CHECKED_IN';
  attendance: {
    scannedPax: number;
    scannedAt: string;
  };
}

/**
 * Pure state updater simulating ScannerClient handleCheckIn response assignment
 */
function applyCheckInResponse(
  prev: ResolveData | null,
  data: CheckInResponse
): ResolveData | null {
  return prev ? { ...prev, attendance: data.attendance } : null;
}

test('ScannerClient Check-in Response Data Contract', async (t) => {
  const initialResolveState: ResolveData = {
    guest: { name: 'Siti Rahma', maxPax: 3 },
    rsvp: { response: 'YES', pax: 2 },
    attendance: undefined,
  };

  const mockApiResponse: CheckInResponse = {
    result: 'CHECKED_IN',
    attendance: {
      scannedPax: 2,
      scannedAt: '2026-09-12T14:30:00.000Z',
    },
  };

  await t.test('updates attendance directly without double-nesting', () => {
    const updatedState = applyCheckInResponse(initialResolveState, mockApiResponse);
    assert.ok(updatedState);
    assert.ok(updatedState.attendance);

    // Verify fields are directly accessible at attendance.* (not attendance.attendance.*)
    assert.strictEqual(updatedState.attendance.scannedPax, 2);
    assert.strictEqual(updatedState.attendance.scannedAt, '2026-09-12T14:30:00.000Z');
    // @ts-expect-error verifying no accidental nesting
    assert.strictEqual(updatedState.attendance.attendance, undefined);
  });

  await t.test('scannedAt parses to valid Date without Invalid Date error', () => {
    const updatedState = applyCheckInResponse(initialResolveState, mockApiResponse);
    assert.ok(updatedState?.attendance);
    const date = new Date(updatedState.attendance.scannedAt);
    assert.strictEqual(isNaN(date.getTime()), false);
    assert.strictEqual(typeof date.toLocaleTimeString('id-ID'), 'string');
  });

  await t.test('handles ALREADY_CHECKED_IN duplicate response correctly', () => {
    const duplicateApiResponse: CheckInResponse = {
      result: 'ALREADY_CHECKED_IN',
      attendance: {
        scannedPax: 1,
        scannedAt: '2026-09-12T10:15:00.000Z',
      },
    };
    const updatedState = applyCheckInResponse(initialResolveState, duplicateApiResponse);
    assert.ok(updatedState?.attendance);
    assert.strictEqual(updatedState.attendance.scannedPax, 1);
    assert.strictEqual(updatedState.attendance.scannedAt, '2026-09-12T10:15:00.000Z');
  });
});
