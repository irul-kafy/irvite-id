'use client';

import React from 'react';
import type { RendererProps } from '../registry';
import InvitationTemplate from './InvitationTemplate';
import { adaptOpalineNocturneData } from './opaline-nocturne.adapter';
import type { Guest, RsvpSubmission } from './types';
import { shouldRenderSereneGuest, shouldRenderSereneRsvp } from '../mode-gating';

export default function OpalineNocturneRenderer({
  data,
  uniqueCode,
  mode = 'PUBLIC',
  isPreview = false,
}: RendererProps) {
  const invitationData = adaptOpalineNocturneData(data, isPreview);
  const guestVisible = shouldRenderSereneGuest(mode, data.guest);
  const rsvpVisible = shouldRenderSereneRsvp(mode, data.guest, data.rsvp) && Boolean(uniqueCode);

  const guest: Guest | undefined = guestVisible && data.guest
    ? {
        kind: 'personal',
        name: data.guest.name,
        maxPax: data.guest.maxPax,
        invitationLabel: (data.guest as any).customGreeting || 'Tamu Undangan',
      }
    : undefined;

  const features = {
    rsvp: rsvpVisible,
    guestQr: guestVisible,
    wishes: false,
    livestream: false,
  };

  const handleRsvpSubmit = async (value: RsvpSubmission) => {
    if (!uniqueCode) return;
    const response = value.attendance === 'attending' ? 'YES' : 'NO';
    await fetch(`/api/invitations/${encodeURIComponent(uniqueCode)}/rsvp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        response,
        pax: response === 'YES' ? value.pax : null,
      }),
    });
  };

  return (
    <InvitationTemplate
      data={{
        ...invitationData,
        features,
      }}
      guest={guest}
      onRsvpSubmit={rsvpVisible ? handleRsvpSubmit : undefined}
    />
  );
}
