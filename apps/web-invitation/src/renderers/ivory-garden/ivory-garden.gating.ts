import type { InvitationMode } from './ivory-garden.types';

export function resolveIvoryEffectiveMode(mode?: InvitationMode): 'PUBLIC' | 'PERSONALIZED' {
  if (mode === 'PERSONAL' || mode === 'PERSONALIZED') {
    return 'PERSONALIZED';
  }
  return 'PUBLIC';
}

export function shouldRenderIvoryGuest(
  mode?: InvitationMode,
  guest?: { name?: string } | null,
): boolean {
  return resolveIvoryEffectiveMode(mode) === 'PERSONALIZED' && Boolean(guest && guest.name);
}

export function shouldRenderIvoryQr(
  mode?: InvitationMode,
  canonicalUrl?: string | null,
): boolean {
  return resolveIvoryEffectiveMode(mode) === 'PERSONALIZED' && Boolean(canonicalUrl);
}

export function shouldRenderIvoryRsvp(
  mode?: InvitationMode,
  guest?: unknown,
  rsvp?: unknown,
): boolean {
  return resolveIvoryEffectiveMode(mode) === 'PERSONALIZED' && Boolean(guest) && Boolean(rsvp);
}

export function countIvoryPersonalQr(
  mode?: InvitationMode,
  canonicalUrl?: string | null,
): number {
  return shouldRenderIvoryQr(mode, canonicalUrl) ? 1 : 0;
}
