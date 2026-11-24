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
  bannerImageUrl?: string;
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
  serviceFeeAmount: number;
  totalAmount: number;
  status:
    | 'PENDING'
    | 'PAID'
    | 'EXPIRED'
    | 'CANCELLED'
    | 'REFUNDED'
    | 'REFUND_PENDING';
  paidAt?: string | null;
  createdAt: string;
  tickets: IssuedTicketRecord[];
}

export interface TicketOrderQuote {
  eventSlug: string;
  tierId: string;
  tierName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  serviceFee: number;
  serviceFeeBps: number;
  isPromoActive?: boolean;
  feePayer: 'BUYER' | 'ORGANIZER';
  taxRatePercent: number;
  taxIncluded: boolean;
  taxAmount: number;
  total: number;
  totalAmount: number;
  organizerNet?: number;
  allowedPaymentMethods: string[];
}

export interface PublicCheckoutConfirmation {
  orderCode: string;
  accessToken?: string;
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  tierId: string;
  tierName: string;
  quantity: number;
  unitPrice: number;
  subtotal?: number;
  subtotalAmount: number;
  taxAmount?: number;
  serviceFee: number;
  serviceFeeAmount: number;
  serviceFeeBps?: number;
  feePayer?: 'BUYER' | 'ORGANIZER';
  totalAmount: number;
  paymentMethod: string;
  status: 'PENDING' | 'PAID';
  expiresAt?: string;
  createdAt: string;
  message: string;
}

/** @deprecated Flat fee constant kept only for static partnership info page compatibility; checkout uses server quote */
export const PLATFORM_FEE_PER_TICKET = 3000;

export function formatRupiah(amount: number): string {
  if (amount <= 0) {
    return 'Gratis';
  }
  return `Rp ${Math.round(amount).toLocaleString('id-ID')}`;
}
