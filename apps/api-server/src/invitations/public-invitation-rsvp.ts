import { InvitationStatus } from 'database';

export function mapRsvpStatus(
  internalStatus: InvitationStatus,
): 'PENDING' | 'YES' | 'NO' {
  if (internalStatus === InvitationStatus.RSVP_YES) return 'YES';
  if (internalStatus === InvitationStatus.RSVP_NO) return 'NO';
  return 'PENDING'; // Covers PENDING, SENT, OPENED
}
