export type InvitationMode = 'PUBLIC' | 'PERSONAL' | 'PERSONALIZED';

export function resolveSereneEffectiveMode(mode?: InvitationMode): 'PUBLIC' | 'PERSONALIZED' {
  if (mode === 'PERSONAL' || mode === 'PERSONALIZED') {
    return 'PERSONALIZED';
  }
  return 'PUBLIC';
}

export function shouldRenderSereneGuest(
  mode?: InvitationMode,
  guest?: { name?: string } | null,
): boolean {
  return resolveSereneEffectiveMode(mode) === 'PERSONALIZED' && Boolean(guest && guest.name);
}

export function shouldRenderSereneRsvp(
  mode?: InvitationMode,
  guest?: unknown,
  rsvp?: unknown,
): boolean {
  return resolveSereneEffectiveMode(mode) === 'PERSONALIZED' && Boolean(guest) && Boolean(rsvp);
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
 * Feature is deferred per IRVITE.ID MVP specification ? always suppressed in production.
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
