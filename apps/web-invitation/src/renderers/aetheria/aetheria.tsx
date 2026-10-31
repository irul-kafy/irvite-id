'use client';

import React from 'react';
import type { RendererProps } from '../registry';
import InvitationTemplate from './InvitationTemplate';
import { adaptAetheriaData } from './aetheria.adapter';
import type { Guest } from './types';
import { shouldRenderSereneGuest } from '../mode-gating';
import { RsvpForm } from '../../components/rsvp-form';
import QRDisplay from '../../components/QRDisplay';
import { getCanonicalInvitationUrl } from '../../utils/url';

export default function AetheriaRenderer({
  data,
  uniqueCode,
  canonicalUrl,
  mode = 'PUBLIC',
  isPreview = false,
}: RendererProps) {
  const invitationData = adaptAetheriaData(data, isPreview);
  const guestVisible = shouldRenderSereneGuest(mode, data.guest);

  const guest: Guest = guestVisible && data.guest
    ? {
        kind: 'personal',
        name: data.guest.name,
        maxPax: data.guest.maxPax,
        invitationLabel: (data.guest as any).customGreeting || 'Tamu Undangan',
      }
    : {
        kind: 'general',
      };

  const features = {
    rsvp: true,
    countdown: true,
    couple: true,
    story: true,
    events: true,
    gallery: true,
    wishes: false,
    gift: true,
    music: true,
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
    />
  );
}
