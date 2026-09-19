import type { InvitationMode } from './classic-letter.types';

export function resolveClassicEffectiveMode(mode?: InvitationMode): 'PUBLIC' | 'PERSONALIZED' {
  if (mode === 'PERSONAL' || mode === 'PERSONALIZED') {
    return 'PERSONALIZED';
  }
  return 'PUBLIC';
}

export function shouldRenderClassicGuest(
  mode?: InvitationMode,
  guest?: { name?: string } | null,
): boolean {
  return resolveClassicEffectiveMode(mode) === 'PERSONALIZED' && Boolean(guest && guest.name);
}

export function shouldRenderClassicRsvp(
  mode?: InvitationMode,
  guest?: unknown,
  rsvp?: unknown,
): boolean {
  return resolveClassicEffectiveMode(mode) === 'PERSONALIZED' && Boolean(guest) && Boolean(rsvp);
}

export function countClassicRendererQr(): number {
  return 0;
}
