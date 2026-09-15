import type { InvitationMode } from './serene-garden.types';

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
