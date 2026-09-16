import type { InvitationMode } from './sunda-puspa.types';

export function resolveSundaEffectiveMode(mode?: InvitationMode): 'PUBLIC' | 'PERSONALIZED' {
  if (mode === 'PERSONAL' || mode === 'PERSONALIZED') {
    return 'PERSONALIZED';
  }
  return 'PUBLIC';
}

export function shouldRenderSundaGuest(
  mode?: InvitationMode,
  guest?: { name?: string } | null,
): boolean {
  return resolveSundaEffectiveMode(mode) === 'PERSONALIZED' && Boolean(guest && guest.name);
}

export function shouldRenderSundaRsvp(
  mode?: InvitationMode,
  guest?: unknown,
  rsvp?: unknown,
): boolean {
  return resolveSundaEffectiveMode(mode) === 'PERSONALIZED' && Boolean(guest) && Boolean(rsvp);
}

export function countSundaRendererQr(): number {
  return 0;
}
