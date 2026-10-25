'use client';

import React from 'react';
import type { RendererProps } from '../registry';
import InvitationTemplate from './InvitationTemplate';
import { adaptAetheriaData } from './aetheria.adapter';
import type { Guest } from './types';
import { shouldRenderSereneGuest, shouldRenderSereneRsvp } from '../mode-gating';
import { RsvpForm } from '../../components/rsvp-form';

export default function AetheriaRenderer({
  data,
  uniqueCode,
  mode = 'PUBLIC',
  isPreview = false,
}: RendererProps) {
  const invitationData = adaptAetheriaData(data, isPreview);
  const guestVisible = shouldRenderSereneGuest(mode, data.guest);
  const rsvpVisible = shouldRenderSereneRsvp(mode, data.guest, data.rsvp) && Boolean(uniqueCode);

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
    rsvp: rsvpVisible,
    countdown: true,
    couple: true,
    story: true,
    events: true,
    gallery: true,
    wishes: false,
    gift: true,
    music: true,
  };

  const rsvpSlot = rsvpVisible && uniqueCode ? (
    <RsvpForm
      uniqueCode={uniqueCode}
      maxPax={data.guest?.maxPax || 2}
      initialRsvp={data.rsvp || { canRespond: true, response: 'PENDING', pax: 1 }}
    />
  ) : undefined;

  return (
    <InvitationTemplate
      data={{
        ...invitationData,
        features,
      }}
      guest={guest}
      rsvpSlot={rsvpSlot}
    />
  );
}
