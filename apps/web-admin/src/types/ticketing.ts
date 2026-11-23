export interface PublicTicketTier {
  id: string;
  name: string;
  description: string;
  price: number;
  quota: number;
  soldCount: number;
  remainingQuota: number;
  statusLabel: 'TERSEDIA' | 'HAMPIR HABIS' | 'HABIS' | 'BELUM DIBUKA' | 'DITUTUP';
  benefits: string[];
}

export interface PublicTicketingEvent {
  id: string;
  slug: string;
  title: string;
  category: string;
  organizerName: string;
  eventDate: string;
  dateLabel?: string;
  eventTime: string;
  timeLabel?: string;
  venueName: string;
  city: string;
  locationDetails?: string;
  description?: string;
  bannerGradient: string;
  bannerTag: string;
  startingPrice: number;
  startingPriceLabel: string;
  isFeaturedBanner?: boolean;
  bannerHeadline?: string;
  bannerSubheadline?: string;
  tiers: PublicTicketTier[];
}

export interface IssuedTicketRecord {
  id: string;
  ticketCode: string;
  qrPayload: string;
  qrToken?: string;
  orderCode: string;
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  venueName: string;
  tierId: string;
  tierName: string;
  holderName: string;
  holderEmail: string;
  status: 'ISSUED' | 'CHECKED_IN' | 'VOID';
  checkedInAt: string | null;
  checkedInGate: string | null;
}

export interface TicketOrderRecord {
  id: string;
  orderCode: string;
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  tierId?: string;
  tierName?: string;
  buyerName: string;
  buyerEmail: string;
  buyerWhatsapp: string;
  paymentMethod: string;
  quantity: number;
  unitPrice?: number;
  subtotalAmount: number;
  serviceFee?: number;
  serviceFeeAmount: number;
  totalAmount: number;
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED' | 'REFUNDED';
  paidAt?: string | null;
  createdAt: string;
  tickets: IssuedTicketRecord[];
}
