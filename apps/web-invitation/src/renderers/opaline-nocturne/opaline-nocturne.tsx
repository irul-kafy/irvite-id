'use client';

import React from 'react';
import type { RendererProps } from '../registry';
import InvitationTemplate from './InvitationTemplate';
import { adaptOpalineNocturneData } from './opaline-nocturne.adapter';
import type { Guest, RsvpSubmission } from './types';
import { shouldRenderSereneGuest, shouldRenderRsvpAndQr } from '../mode-gating';
import { useEffectiveDisplayGuest } from '../use-effective-guest';
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
  const effectiveGuest = useEffectiveDisplayGuest(mode, data.guest);
  const guestVisible = shouldRenderSereneGuest(mode, effectiveGuest);
  const showRsvpAndQr = shouldRenderRsvpAndQr(mode, uniqueCode, isPreview);

  const guest: Guest | undefined = guestVisible && effectiveGuest
    ? {
        kind: 'personal',
        name: effectiveGuest.name,
        maxPax: effectiveGuest.maxPax,
        invitationLabel: effectiveGuest.customGreeting || 'Tamu Undangan',
      }
    : undefined;

  const [localWishes, setLocalWishes] = React.useState(
    invitationData.wishes.items,
  );

  React.useEffect(() => {
    setLocalWishes(invitationData.wishes.items);
  }, [invitationData.wishes.items]);

  const handleWishSubmit = async (value: { name: string; message: string }) => {
    let res: Response | null = null;
    if (uniqueCode) {
      res = await fetch(
        `/api-proxy/invitations/public/${encodeURIComponent(uniqueCode)}/wishes`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(value),
        },
      );
    } else if (data.event?.slug) {
      res = await fetch(
        `/api-proxy/events/public/${encodeURIComponent(data.event.slug)}/wishes`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(value),
        },
      );
    }

    if (res && !res.ok) {
      throw new Error('Gagal mengirimkan ucapan');
    }

    const created = res ? await res.json().catch(() => null) : null;
    const newWish = {
      id: created?.id || `local-${Date.now()}`,
      name: value.name,
      message: value.message,
      dateLabel: 'Baru saja',
    };

    setLocalWishes((prev) => [newWish, ...prev]);
  };

  const features = {
    rsvp: showRsvpAndQr,
    guestQr: showRsvpAndQr,
    wishes: true,
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

  const rsvpSlot = showRsvpAndQr ? (
    <RsvpForm
      key={uniqueCode || 'preview-rsvp'}
      uniqueCode={uniqueCode || 'simulasi-tamu'}
      maxPax={data.guest?.maxPax || 2}
      initialRsvp={data.rsvp || { canRespond: true, response: 'PENDING', pax: 1 }}
      variant="opaline-nocturne"
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
      variant="opaline-nocturne"
    />
  ) : null;

  return (
    <InvitationTemplate
      data={{
        ...invitationData,
        wishes: {
          ...invitationData.wishes,
          items: localWishes,
        },
        features,
      }}
      guest={guest}
      rsvpSlot={rsvpSlot}
      qrSlot={qrSlot}
      onRsvpSubmit={handleRsvpSubmit}
      onWishSubmit={handleWishSubmit}
    />
  );
}
