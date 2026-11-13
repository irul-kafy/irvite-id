'use client';

import React from 'react';
import { AddToCalendarButton } from '../../../components/calendar';

export interface CalendarEventProps {
  title: string;
  startDateTime: string;
  endDateTime?: string;
  venue?: string;
  address?: string;
  description?: string;
  timeZone?: string;
}

export type CalendarThemeVariant =
  | 'royal-velvet'
  | 'sekar-kedaton'
  | 'swarga-dewata'
  | 'ranah-cinta'
  | 'opaline-nocturne'
  | 'aetheria'
  | 'default';

export interface CalendarButtonsProps {
  event: CalendarEventProps;
  theme?: CalendarThemeVariant;
  className?: string;
  label?: string;
}

export function CalendarButtons({
  event,
  theme,
  className,
  label,
}: CalendarButtonsProps) {
  return (
    <div className={className}>
      <AddToCalendarButton event={event} theme={theme} label={label} />
    </div>
  );
}
