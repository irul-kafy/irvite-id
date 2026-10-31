'use client';

import React from 'react';
import type { RendererProps } from '../registry';
import InvitationTemplate from './InvitationTemplate';
import { adaptOpalineNocturneData } from './opaline-nocturne.adapter';
import type { Guest, RsvpSubmission } from './types';
import { shouldRenderSereneGuest } from '../mode-gating';
import { RsvpForm } from '../../components/rsvp-form';
import QRDisplay from '../../components/QRDisplay';
import { getCanonicalInvitationUrl } from '../../utils/url';

export default function OpalineNocturneRenderer({
  data,
  uniqueCode,
  canonicalUrl,
  mode = 'PUBLIC',
  isPreview = false,
}: RendererProps) {
  const invitationData = adaptOpalineNocturneData(data, isPreview);
  const guestVisible = shouldRenderSereneGuest(mode, data.guest);

  const guest: Guest | undefined = guestVisible && data.guest
    ? {
        kind: 'personal',
        name: data.guest.name,
        maxPax: data.guest.maxPax,
        invitationLabel: (data.guest as any).customGreeting || 'Tamu Undangan',
      }
    : undefined;

  const features = {
    rsvp: true,
    guestQr: true,
    wishes: false,
    livestream: false,
  };

  const handleRsvpSubmit = async (value: RsvpSubmission) => {
    if (!uniqueCode) return;
    const response = value.attendance === 'attending' ? 'YES' : 'NO';
    await fetch(`/api-proxy/invitations/public/${encodeURIComponent(uniqueCode)}/rsvp`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        response,
        ...(response === 'YES' ? { pax: value.pax } : {}),
      }),
    });
  };

  const rsvpSlot = (
    <RsvpForm
      key={uniqueCode || 'preview-rsvp'}
      uniqueCode={uniqueCode || 'simulasi-tamu'}
      maxPax={data.guest?.maxPax || 2}
      initialRsvp={data.rsvp || { canRespond: true, response: 'PENDING', pax: 1 }}
    />
  );

  const effectiveCanonicalUrl =
    canonicalUrl ||
    (uniqueCode ? getCanonicalInvitationUrl(uniqueCode) : null) ||
    'https://irvite.id/i/SIMULASI-TAMU';

  const qrSlot = (
    <QRDisplay
      canonicalUrl={effectiveCanonicalUrl}
      guestName={guestVisible && data.guest?.name ? data.guest.name : 'Bapak / Ibu / Saudara/i'}
      maxPax={data.guest?.maxPax || 2}
    />
  );

  return (
    <InvitationTemplate
      data={{
        ...invitationData,
        features,
      }}
      guest={guest}
      rsvpSlot={rsvpSlot}
      qrSlot={qrSlot}
      onRsvpSubmit={handleRsvpSubmit}
    />
  );
}
