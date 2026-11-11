export type InvitationMode = 'PUBLIC' | 'PERSONAL' | 'PERSONALIZED';

export const MAX_PUBLIC_RECIPIENT_LENGTH = 60;

/**
 * Sanitizes a custom public recipient / group name from URL query parameters (?to=, ?tamu=, ?kepada=, ?guest=).
 * Strips HTML tags and control characters, normalizes whitespace, and limits length to prevent layout overflow.
 */
export function sanitizePublicRecipientName(raw?: string | null): string | undefined {
  if (!raw || typeof raw !== 'string') return undefined;
  let cleaned = raw;
  try {
    // Handle literal '+' from query strings if not already decoded as space
    cleaned = cleaned.replace(/\+/g, ' ');
  } catch {
    // Ignore
  }
  cleaned = cleaned
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return undefined;
  if (cleaned.length > MAX_PUBLIC_RECIPIENT_LENGTH) {
    cleaned = cleaned.slice(0, MAX_PUBLIC_RECIPIENT_LENGTH).trim();
  }
  return cleaned || undefined;
}

/**
 * Extracts a sanitized custom recipient name from Next.js searchParams or URLSearchParams.
 * Supports ?to=, ?tamu=, ?kepada=, and ?guest=.
 */
export function extractPublicRecipientFromSearchParams(
  params?: Record<string, string | string[] | undefined> | URLSearchParams | null,
): string | undefined {
  if (!params) return undefined;
  const keys = ['to', 'tamu', 'kepada', 'guest'] as const;

  if (typeof URLSearchParams !== 'undefined' && params instanceof URLSearchParams) {
    for (const key of keys) {
      const val = params.get(key);
      const sanitized = sanitizePublicRecipientName(val);
      if (sanitized) return sanitized;
    }
    return undefined;
  }

  const record = params as Record<string, string | string[] | undefined>;
  for (const key of keys) {
    const raw = record[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    const sanitized = sanitizePublicRecipientName(value);
    if (sanitized) return sanitized;
  }
  return undefined;
}

export function resolveSereneEffectiveMode(mode?: InvitationMode): 'PUBLIC' | 'PERSONALIZED' {
  if (mode === 'PERSONAL' || mode === 'PERSONALIZED') {
    return 'PERSONALIZED';
  }
  return 'PUBLIC';
}

export function shouldRenderSereneGuest(
  mode?: InvitationMode,
  guest?: { name?: string; isPublicRecipient?: boolean } | null,
): boolean {
  if (!guest || !guest.name) return false;
  if (resolveSereneEffectiveMode(mode) === 'PERSONALIZED') return true;
  if (guest.isPublicRecipient && Boolean(sanitizePublicRecipientName(guest.name))) {
    return true;
  }
  return false;
}

/**
 * Resolves the effective guest object for cover/greeting display across both PERSONAL and PUBLIC (?to=...) modes.
 * Note: This ONLY affects the cover greeting display name. RSVP & QR remain strictly gated by shouldRenderRsvpAndQr.
 */
export function resolveEffectiveDisplayGuest(
  mode?: InvitationMode,
  guest?: {
    name: string;
    customGreeting?: string | null;
    maxPax: number;
    tableNumber?: string | null;
    isPublicRecipient?: boolean;
  } | null,
  urlRecipientParam?: string | null,
): {
  name: string;
  customGreeting: string | null;
  maxPax: number;
  tableNumber?: string | null;
  isPublicRecipient?: boolean;
} | null {
  if (resolveSereneEffectiveMode(mode) === 'PERSONALIZED' && guest && guest.name) {
    return {
      ...guest,
      customGreeting: guest.customGreeting ?? null,
    };
  }

  const fromGuest = guest?.isPublicRecipient ? sanitizePublicRecipientName(guest.name) : undefined;
  const fromUrl = sanitizePublicRecipientName(urlRecipientParam);
  const publicName = fromUrl || fromGuest;

  if (publicName) {
    return {
      name: publicName,
      customGreeting: guest?.customGreeting ?? null,
      maxPax: 0,
      isPublicRecipient: true,
    };
  }

  return null;
}

export function shouldRenderSereneRsvp(
  mode?: InvitationMode,
  guest?: unknown,
  rsvp?: unknown,
): boolean {
  return resolveSereneEffectiveMode(mode) === 'PERSONALIZED' && Boolean(guest) && Boolean(rsvp);
}

/**
 * Unified gate for both RSVP and Check-in QR ticket:
 * In PUBLIC mode (/e/:slug), strictly NEVER render RSVP or QR code.
 * Only in PERSONAL mode (/i/:uniqueCode) with a valid uniqueCode, or in Studio preview.
 */
export function shouldRenderRsvpAndQr(
  mode?: InvitationMode,
  uniqueCode?: string | null,
  isPreview?: boolean,
): boolean {
  if (isPreview) return true;
  const isPersonal = mode === 'PERSONAL' || mode === 'PERSONALIZED';
  return Boolean(isPersonal && uniqueCode && uniqueCode.trim().length > 0);
}

export function countSereneRendererQr(): number {
  return 0;
}

/**
 * Safely resolves the effective renderer mode.
 * Unannotated mode defaults safely to less-privileged 'PUBLIC'.
 */
export function resolveEffectiveMode(mode?: InvitationMode): InvitationMode {
  return mode ?? 'PUBLIC';
}

/**
 * Checks whether guest-specific personalization (guest name, custom greeting, quota)
 * should be rendered.
 */
export function shouldRenderGuestPersonalization(
  mode?: InvitationMode,
  hasGuest?: boolean,
): boolean {
  return resolveEffectiveMode(mode) === 'PERSONAL' && Boolean(hasGuest);
}

/**
 * Checks whether the RSVP section/form should be rendered.
 * Public invitations NEVER render RSVP.
 */
export function shouldRenderRsvp(
  mode?: InvitationMode,
  hasGuest?: boolean,
  hasRsvp?: boolean,
): boolean {
  return (
    resolveEffectiveMode(mode) === 'PERSONAL' &&
    Boolean(hasGuest) &&
    Boolean(hasRsvp)
  );
}

/**
 * Checks whether in-theme guest QR / ticket placeholder should be rendered.
 * In production, in-theme QR is ALWAYS suppressed to avoid duplicate QR displays
 * (personal QR is mounted at page-level via QRDisplay).
 * Only Template Studio preview with PERSONAL mode displays the placeholder.
 */
export function shouldRenderGuestQr(
  mode?: InvitationMode,
  isPreview?: boolean,
): boolean {
  return resolveEffectiveMode(mode) === 'PERSONAL' && Boolean(isPreview);
}

/**
 * Checks whether the digital gift / QRIS section should be rendered.
 * Feature is deferred per IRVITE MVP specification — always suppressed in production.
 */
export function shouldRenderGiftSection(): boolean {
  return false;
}

/**
 * Resolves guest name for CoverScreen. Returns undefined in PUBLIC mode.
 */
export function resolveCoverGuestName(
  mode?: InvitationMode,
  guestName?: string | null,
): string | undefined {
  if (resolveEffectiveMode(mode) === 'PERSONAL' && guestName) {
    return guestName;
  }
  return undefined;
}
