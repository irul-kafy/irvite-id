'use client';

import React from 'react';

export interface RsvpSectionProps {
  title?: string;
  description?: string;
  rsvpSlot?: React.ReactNode;
  qrSlot?: React.ReactNode;
  className?: string;
  gridClassName?: string;
  rsvpSlotClassName?: string;
  qrSlotClassName?: string;
  customHeading?: React.ReactNode;
  customTicketHeader?: React.ReactNode;
}

export function RsvpSection({
  title = 'Konfirmasi Kehadiran & Check-in',
  description,
  rsvpSlot,
  qrSlot,
  className,
  gridClassName,
  rsvpSlotClassName,
  qrSlotClassName,
  customHeading,
  customTicketHeader,
}: RsvpSectionProps) {
  if (!rsvpSlot && !qrSlot) return null;

  return (
    <section className={className} id="rsvp">
      {customHeading ? (
        customHeading
      ) : (
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: '0 0 0.5rem 0' }}>{title}</h2>
          {description && <p style={{ margin: 0, opacity: 0.85 }}>{description}</p>}
        </div>
      )}

      {customTicketHeader}

      <div className={gridClassName}>
        {rsvpSlot && <div className={rsvpSlotClassName}>{rsvpSlot}</div>}
        {qrSlot && <div className={qrSlotClassName}>{qrSlot}</div>}
      </div>
    </section>
  );
}

