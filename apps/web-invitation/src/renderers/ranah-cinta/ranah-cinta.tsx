'use client';

import React from 'react';
import type { RendererProps } from '../registry';
import InvitationTemplate from './InvitationTemplate';
import { adaptRanahCintaData } from './ranah-cinta.adapter';
import type { Guest } from './types';
import { shouldRenderSereneGuest, shouldRenderRsvpAndQr } from '../mode-gating';
import { useEffectiveDisplayGuest } from '../use-effective-guest';
import { RsvpForm } from '../../components/rsvp-form';
import QRDisplay from '../../components/QRDisplay';
import { WishesSection } from '../../components/wishes/WishesSection';
import { getCanonicalInvitationUrl } from '../../utils/url';

export default function RanahCintaRenderer({
  data,
  uniqueCode,
  canonicalUrl,
  mode = 'PUBLIC',
  isPreview = false,
}: RendererProps) {
  const invitationData = adaptRanahCintaData(data, isPreview);
  const effectiveGuest = useEffectiveDisplayGuest(mode, data.guest);
  const guestVisible = shouldRenderSereneGuest(mode, effectiveGuest);
  const showRsvpAndQr = shouldRenderRsvpAndQr(mode, uniqueCode, isPreview);

  const guest: Guest = guestVisible && effectiveGuest
    ? {
        kind: 'personal',
        name: effectiveGuest.name,
        maxPax: effectiveGuest.maxPax,
        invitationLabel: effectiveGuest.customGreeting || 'Tamu Undangan',
      }
    : {
        kind: 'general',
      };

  const features = {
    ...invitationData.features,
    rsvp: showRsvpAndQr,
  };

  const rsvpSlot = showRsvpAndQr ? (
    <RsvpForm
      key={uniqueCode || 'preview-rsvp'}
      uniqueCode={uniqueCode || 'simulasi-tamu'}
      maxPax={data.guest?.maxPax || 2}
      initialRsvp={data.rsvp || { canRespond: true, response: 'PENDING', pax: 1 }}
      variant="ranah-cinta"
    />
  ) : null;

  const effectiveCanonicalUrl =
    canonicalUrl ||
    (uniqueCode ? getCanonicalInvitationUrl(uniqueCode) : null) ||
    'https://irvite.id/i/SIMULASI-TAMU';

  const qrSlot = showRsvpAndQr ? (
    <QRDisplay
      canonicalUrl={effectiveCanonicalUrl}
      guestName={guestVisible && data.guest?.name ? data.guest.name : 'Bapak / Ibu / Saudara/i'}
      maxPax={data.guest?.maxPax || 2}
      tableNumber={data.guest?.tableNumber}
      eventTitle={data.event?.title}
      variant="ranah-cinta"
    />
  ) : null;

  const wishesSlot = (
    <WishesSection
      uniqueCode={uniqueCode}
      eventSlug={data.event?.slug}
      defaultName={guestVisible && data.guest?.name ? data.guest.name : ''}
      initialWishes={data.wishes?.items}
      title={data.wishes?.title}
      description={data.wishes?.description}
      variant="ranah-cinta"
      hideHeader
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
      wishesSlot={wishesSlot}
    />
  );
}
