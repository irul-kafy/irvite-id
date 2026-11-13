/**
 * Determines if a public invitation or event is expired.
 * If activeUntil is explicitly provided, it takes precedence.
 * Otherwise, expiry falls back to 30 elapsed days from the event date timestamp.
 *
 * @param eventDate The date of the event
 * @param now The current time (default: new Date())
 * @param activeUntil Optional explicit activeUntil deadline
 * @returns boolean True if the invitation has expired, false if it is still accessible
 */
export function isPublicInvitationExpired(
  eventDate: Date,
  now: Date = new Date(),
  activeUntil?: Date | null,
): boolean {
  if (activeUntil instanceof Date && !isNaN(activeUntil.getTime())) {
    return now.getTime() >= activeUntil.getTime();
  }
  const expiryAtMs = eventDate.getTime() + 30 * 24 * 60 * 60 * 1000;
  return now.getTime() >= expiryAtMs;
}
