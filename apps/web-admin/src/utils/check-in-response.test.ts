import test from 'node:test';
import assert from 'node:assert';

interface ResolveData {
  guest: { name: string; maxPax: number };
  rsvp?: { response: string; pax?: number };
  attendance?: { scannedPax: number; scannedAt: string };
  status?: 'NOT_CHECKED_IN' | 'PARTIAL' | 'COMPLETE';
  scannedPax?: number;
  remainingPax?: number;
}

interface CheckInResponse {
  result: 'CHECKED_IN' | 'ALREADY_CHECKED_IN';
  status?: 'PARTIAL' | 'COMPLETE';
  scannedPax?: number;
  remainingPax?: number;
  deltaPax?: number;
  attendance?: {
    scannedPax: number;
    scannedAt: string;
  };
}

/**
 * Pure state updater simulating ScannerClient handleCheckIn response assignment
 */
function applyCheckInResponse(
  prev: ResolveData | null,
  data: CheckInResponse,
  selectedPax: number = 1
): ResolveData | null {
  if (!prev) return null;
  if (data.result === 'ALREADY_CHECKED_IN') {
    return {
      ...prev,
      status: 'COMPLETE',
      scannedPax: data.scannedPax ?? prev.guest.maxPax,
      remainingPax: 0,
      attendance: data.attendance ?? prev.attendance,
    };
  }

  const maxPax = prev.guest.maxPax;
  const currentTotal = data.scannedPax ?? ((prev.scannedPax ?? 0) + selectedPax);
  const remaining = typeof data.remainingPax === 'number' ? data.remainingPax : Math.max(0, maxPax - currentTotal);
  const status: 'PARTIAL' | 'COMPLETE' =
    data.status === 'COMPLETE' || remaining === 0 ? 'COMPLETE' : 'PARTIAL';

  return {
    ...prev,
    status,
    scannedPax: currentTotal,
    remainingPax: remaining,
    attendance: data.attendance ?? {
      scannedPax: currentTotal,
      scannedAt: new Date().toISOString(),
    },
  };
}

test('ScannerClient Check-in Response Data Contract', async (t) => {
  const initialResolveState: ResolveData = {
    guest: { name: 'Siti Rahma', maxPax: 4 },
    rsvp: { response: 'YES', pax: 4 },
    attendance: undefined,
    status: 'NOT_CHECKED_IN',
    scannedPax: 0,
    remainingPax: 4,
  };

  const mockPartialResponse: CheckInResponse = {
    result: 'CHECKED_IN',
    status: 'PARTIAL',
    scannedPax: 2,
    remainingPax: 2,
    deltaPax: 2,
    attendance: {
      scannedPax: 2,
      scannedAt: '2026-09-12T14:30:00.000Z',
    },
  };

  await t.test('updates attendance directly without double-nesting on partial check-in', () => {
    const updatedState = applyCheckInResponse(initialResolveState, mockPartialResponse, 2);
    assert.ok(updatedState);
    assert.ok(updatedState.attendance);

    // Verify fields are directly accessible at attendance.* (not attendance.attendance.*)
    assert.strictEqual(updatedState.attendance.scannedPax, 2);
    assert.strictEqual(updatedState.attendance.scannedAt, '2026-09-12T14:30:00.000Z');
    assert.strictEqual(updatedState.status, 'PARTIAL');
    assert.strictEqual(updatedState.scannedPax, 2);
    assert.strictEqual(updatedState.remainingPax, 2);
    // Verifying no accidental nesting
    assert.strictEqual((updatedState.attendance as Record<string, unknown>).attendance, undefined);
  });

  await t.test('updates state to COMPLETE when all pax checked in', () => {
    const partialState: ResolveData = {
      guest: { name: 'Siti Rahma', maxPax: 4 },
      status: 'PARTIAL',
      scannedPax: 2,
      remainingPax: 2,
      attendance: {
        scannedPax: 2,
        scannedAt: '2026-09-12T14:30:00.000Z',
      },
    };

    const mockCompleteResponse: CheckInResponse = {
      result: 'CHECKED_IN',
      status: 'COMPLETE',
      scannedPax: 4,
      remainingPax: 0,
      deltaPax: 2,
      attendance: {
        scannedPax: 4,
        scannedAt: '2026-09-12T15:00:00.000Z',
      },
    };

    const updatedState = applyCheckInResponse(partialState, mockCompleteResponse, 2);
    assert.ok(updatedState);
    assert.strictEqual(updatedState.status, 'COMPLETE');
    assert.strictEqual(updatedState.scannedPax, 4);
    assert.strictEqual(updatedState.remainingPax, 0);
  });

  await t.test('scannedAt parses to valid Date without Invalid Date error', () => {
    const updatedState = applyCheckInResponse(initialResolveState, mockPartialResponse, 2);
    assert.ok(updatedState?.attendance);
    const date = new Date(updatedState.attendance.scannedAt);
    assert.strictEqual(isNaN(date.getTime()), false);
    assert.strictEqual(typeof date.toLocaleTimeString('id-ID'), 'string');
  });

  await t.test('handles ALREADY_CHECKED_IN duplicate response correctly', () => {
    const duplicateApiResponse: CheckInResponse = {
      result: 'ALREADY_CHECKED_IN',
      status: 'COMPLETE',
      scannedPax: 4,
      remainingPax: 0,
      attendance: {
        scannedPax: 4,
        scannedAt: '2026-09-12T10:15:00.000Z',
      },
    };
    const updatedState = applyCheckInResponse(initialResolveState, duplicateApiResponse);
    assert.ok(updatedState?.attendance);
    assert.strictEqual(updatedState.status, 'COMPLETE');
    assert.strictEqual(updatedState.scannedPax, 4);
    assert.strictEqual(updatedState.remainingPax, 0);
    assert.strictEqual(updatedState.attendance.scannedPax, 4);
    assert.strictEqual(updatedState.attendance.scannedAt, '2026-09-12T10:15:00.000Z');
  });
});
