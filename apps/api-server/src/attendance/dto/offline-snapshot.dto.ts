export interface OfflineGuestSnapshotItem {
  guestId: string;
  name: string;
  category: string;
  isVip: boolean;
  tableNumber: string | null;
  maxPax: number;
  invitationId: string | null;
  uniqueCode: string | null;
  status: 'CHECKED_IN' | 'PARTIAL' | 'NOT_CHECKED_IN';
  scannedPax: number;
  lastScannedAt: string | null;
}

export interface OfflineSnapshotResponse {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  generatedAt: string;
  expiresAt: string;
  totalGuests: number;
  totalCheckedInGuests: number;
  totalCheckedInPax: number;
  guests: OfflineGuestSnapshotItem[];
}

