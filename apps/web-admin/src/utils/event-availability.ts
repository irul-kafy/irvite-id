export type PublicAvailabilityState = 'DRAFT' | 'ACTIVE' | 'EXPIRED';

/**
 * Derives the factual public invitation availability state matching the backend contract:
 * - DRAFT: status !== 'PUBLISHED'
 * - ACTIVE: status === 'PUBLISHED' && now < eventDate + 30 days
 * - EXPIRED: status === 'PUBLISHED' && now >= eventDate + 30 days
 */
export function getPublicAvailabilityState(
  status: string,
  eventDateStr: string,
  nowMs: number = Date.now(),
): PublicAvailabilityState {
  if (status !== 'PUBLISHED') {
    return 'DRAFT';
  }

  const eventDate = new Date(eventDateStr);
  if (isNaN(eventDate.getTime())) {
    return 'DRAFT';
  }

  const expiryAtMs = eventDate.getTime() + 30 * 24 * 60 * 60 * 1000;
  if (nowMs >= expiryAtMs) {
    return 'EXPIRED';
  }

  return 'ACTIVE';
}
