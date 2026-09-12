/**
 * Preview-only sample data.
 *
 * These values are NEVER persisted to the database, never derived from real
 * Event/Guest/Invitation records, and must never be used outside the
 * /preview/template route. They exist solely to give the GenericTheme renderer
 * believable content during Template Studio live preview.
 */

import type { PublicInvitationResponse } from '../types/public-invitation';

/** Stable preview unique code — clearly non-real */
export const PREVIEW_UNIQUE_CODE = '__PREVIEW__';

/**
 * Build deterministic sample invitation data for the preview renderer.
 * Returns a `PublicInvitationResponse`-shaped object with no real credentials.
 */
export function buildPreviewData(): PublicInvitationResponse {
  return {
    invitation: {
      customMessage:
        'Together with our families, we joyfully invite you to celebrate this special occasion with us.',
    },
    guest: {
      name: 'Invited Guest',
      customGreeting: 'We are delighted to have you join us.',
      maxPax: 2,
    },
    event: {
      title: 'Reza & Amira Wedding',
      description:
        'A celebration of love and new beginnings, surrounded by the people who matter most.',
      eventDate: '2026-10-18T08:00:00.000Z',
      locationDetails:
        'The Grand Ballroom\nHotel Mulia, Jakarta\nJl. Asia Afrika, Jakarta 10270',
    },
    template: null, // Config is injected via postMessage; template field unused in preview
    media: [],
    rsvp: {
      // Preview RSVP is always non-mutating — canRespond is false so no submission path is triggered
      response: 'PENDING',
      pax: null,
      canRespond: false,
    },
  };
}
