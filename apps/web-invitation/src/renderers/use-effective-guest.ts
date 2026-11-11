'use client';

import { useEffect, useState } from 'react';
import {
  InvitationMode,
  extractPublicRecipientFromSearchParams,
  resolveEffectiveDisplayGuest,
} from './mode-gating';
import type { PublicInvitationResponse } from '../types/public-invitation';

export function useEffectiveDisplayGuest(
  mode?: InvitationMode,
  guest?: PublicInvitationResponse['guest'] | null,
) {
  const [urlRecipient, setUrlRecipient] = useState<string | undefined>(() => {
    if (typeof window !== 'undefined') {
      return extractPublicRecipientFromSearchParams(
        new URLSearchParams(window.location.search),
      );
    }
    return undefined;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const parsed = extractPublicRecipientFromSearchParams(
        new URLSearchParams(window.location.search),
      );
      setUrlRecipient(parsed);
    }
  }, []);

  return resolveEffectiveDisplayGuest(mode, guest, urlRecipient);
}

