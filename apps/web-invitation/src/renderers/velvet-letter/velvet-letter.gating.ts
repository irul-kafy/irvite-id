import type { InvitationMode } from './velvet-letter.types';

export function resolveVelvetEffectiveMode(
  mode?: InvitationMode,
): 'PUBLIC' | 'PERSONALIZED' {
  if (mode === 'PERSONAL' || mode === 'PERSONALIZED') {
    return 'PERSONALIZED';
  }
  return 'PUBLIC';
}

export function shouldRenderVelvetGuest(
  mode?: InvitationMode,
  guest?: { name?: string } | null,
): boolean {
  return (
    resolveVelvetEffectiveMode(mode) === 'PERSONALIZED' &&
    Boolean(guest && guest.name)
  );
}

export function shouldRenderVelvetRsvp(
  mode?: InvitationMode,
  guest?: unknown,
  rsvp?: unknown,
): boolean {
  return (
    resolveVelvetEffectiveMode(mode) === 'PERSONALIZED' &&
    Boolean(guest) &&
    Boolean(rsvp)
  );
}

export function countVelvetRendererQr(): number {
  return 0;
}
