/**
 * Determines if a public invitation is expired.
 * Expiry is strictly 30 elapsed days (24 hours) from the event date timestamp.
 *
 * @param eventDate The date of the event
 * @param now The current time (default: new Date())
 * @returns boolean True if the invitation has expired, false if it is still accessible
 */
export function isPublicInvitationExpired(
  eventDate: Date,
  now: Date = new Date(),
): boolean {
  const expiryAtMs = eventDate.getTime() + 30 * 24 * 60 * 60 * 1000;
  return now.getTime() >= expiryAtMs;
}
