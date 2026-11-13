'use client';

import React from 'react';
import QRDisplay from '../../../components/QRDisplay';

export interface TicketDownloadProps {
  canonicalUrl: string;
  guestName?: string;
  maxPax?: number;
  tableNumber?: string | null;
  eventTitle?: string;
  className?: string;
  variant?:
    | 'light'
    | 'dark'
    | 'balinese'
    | 'aetheria'
    | 'ranah-cinta'
    | 'sekar-kedaton'
    | 'royal-velvet'
    | 'opaline-nocturne'
    | 'auto';
}

export function TicketDownload({
  canonicalUrl,
  guestName,
  maxPax,
  tableNumber,
  eventTitle,
  className,
  variant = 'auto',
}: TicketDownloadProps) {
  return (
    <QRDisplay
      canonicalUrl={canonicalUrl}
      guestName={guestName}
      maxPax={maxPax}
      tableNumber={tableNumber}
      eventTitle={eventTitle}
      className={className}
      variant={variant}
    />
  );
}

