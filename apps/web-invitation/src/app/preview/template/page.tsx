'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RenderTheme } from '../../../renderers/registry';
import { normalizeConfig } from '../../../utils/config-normalizer';
import { buildPreviewData, PREVIEW_UNIQUE_CODE } from '../../../preview/preview-sample-data';
import { buildIvoryGardenPreviewData } from '../../../preview/ivory-garden-preview-data';
import {
  parsePreviewMessage,
  isTrustedOrigin,
} from '../../../preview/preview-protocol';
import type { PublicInvitationResponse } from '../../../types/public-invitation';
import './preview.css';

// Trusted admin origin — resolved at build time from env, never from headers.
const TRUSTED_ADMIN_ORIGIN = process.env.NEXT_PUBLIC_TRUSTED_ADMIN_ORIGIN || '';

type Status = 'waiting' | 'ready' | 'error';

export default function PreviewTemplatePage() {
  const [status, setStatus] = useState<Status>('waiting');

  // The preview renders from sample data + injected config
  const sampleData = buildPreviewData();
  const [previewData, setPreviewData] = useState<PublicInvitationResponse>(sampleData);

  // Ref for source-window verification — iframe parent is window.parent
  const expectedSourceRef = useRef<WindowProxy | null>(null);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      // 1. Origin check — must be exact trusted admin origin
      if (!isTrustedOrigin(event.origin, TRUSTED_ADMIN_ORIGIN)) {
        // Silently ignore — don't log to avoid leaking info
        return;
      }

      // 2. Source check — must be the parent window captured for this iframe.
      // A standalone preview page has no trusted parent and accepts no updates.
      if (!expectedSourceRef.current || event.source !== expectedSourceRef.current) {
        return;
      }

      // 3. Parse and validate message structure
      const msg = parsePreviewMessage(event.data);
      if (!msg) {
        // Silently ignore malformed messages
        return;
      }

      // 4. normalizeConfig provides the safety layer — any malformed config
      //    degrades gracefully to defaults without throwing.
      const safeConfig = normalizeConfig(msg.payload.config);

      const nextSampleData =
        msg.payload.themeCode === 'IVORY_GARDEN'
          ? buildIvoryGardenPreviewData()
          : buildPreviewData();

      setPreviewData({
        ...nextSampleData,
        template: {
          themeCode: msg.payload.themeCode,
          config: safeConfig,
        },
      });

      setStatus('ready');
    },
    []
  );

  useEffect(() => {
    // Store expected source for verification
    expectedSourceRef.current = window.parent !== window ? window.parent : null;

    window.addEventListener('message', handleMessage);

    // Signal to parent that the preview is ready to receive messages
    if (window.parent && window.parent !== window && TRUSTED_ADMIN_ORIGIN) {
      try {
        window.parent.postMessage({ type: 'PREVIEW_READY', version: 1 }, TRUSTED_ADMIN_ORIGIN);
      } catch {
        // Best-effort; parent may not be listening yet
      }
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [handleMessage]);

  if (status === 'error') {
    return (
      <div className="preview-state preview-state--error" role="alert">
        <p className="preview-state__text">Preview error</p>
      </div>
    );
  }

  return (
    <div className="preview-host">
      {status === 'waiting' && (
        <div className="preview-state preview-state--waiting" aria-live="polite">
          <div className="preview-state__spinner" aria-hidden="true" />
          <p className="preview-state__text">Waiting for preview data…</p>
        </div>
      )}

      {/* RenderTheme keeps preview renderer selection aligned with public invitations. */}
      <div
        className="preview-renderer"
        style={{ opacity: status === 'ready' ? 1 : 0, transition: 'opacity 0.3s ease' }}
        aria-hidden={status !== 'ready'}
      >
        <RenderTheme
          themeCode={previewData.template?.themeCode}
          data={previewData}
          uniqueCode={PREVIEW_UNIQUE_CODE}
          isPreview={true}
          mode="PERSONAL"
        />
      </div>
    </div>
  );
}
