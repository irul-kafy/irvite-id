/**
 * postMessage protocol for Template Studio ↔ Preview communication.
 *
 * Security contract:
 * - Only TEMPLATE_PREVIEW_UPDATE messages at version 1 are accepted.
 * - event.origin must match the exact trusted admin origin.
 * - event.source must be the iframe's contentWindow.
 * - The payload config is passed through normalizeConfig before rendering
 *   so any malformed config degrades gracefully to defaults.
 *
 * The message may NOT contain:
 * - Arbitrary HTML/CSS/JS strings
 * - Remote image/font URLs
 * - JWT tokens or credentials
 */

import type { TemplateConfigV1 } from './preview-types';

/** The only accepted message type. */
export const PREVIEW_MESSAGE_TYPE = 'TEMPLATE_PREVIEW_UPDATE' as const;

/** The only accepted protocol version. */
export const PREVIEW_PROTOCOL_VERSION = 1 as const;

export interface PreviewMessagePayload {
  /** Serialised TemplateConfigV1 — validated before use. */
  config: TemplateConfigV1;
  /** Display name for context only. */
  name: string;
}

export interface PreviewMessage {
  type: typeof PREVIEW_MESSAGE_TYPE;
  version: typeof PREVIEW_PROTOCOL_VERSION;
  payload: PreviewMessagePayload;
}

/**
 * Runtime type-guard for the incoming postMessage data.
 *
 * Returns the validated PreviewMessage or null if the shape is wrong.
 * No exceptions are thrown — callers should silently drop invalid messages.
 */
export function parsePreviewMessage(data: unknown): PreviewMessage | null {
  if (!data || typeof data !== 'object') return null;

  const msg = data as Record<string, unknown>;

  if (msg.type !== PREVIEW_MESSAGE_TYPE) return null;
  if (msg.version !== PREVIEW_PROTOCOL_VERSION) return null;

  const payload = msg.payload;
  if (!payload || typeof payload !== 'object') return null;

  const p = payload as Record<string, unknown>;

  // name: must be a non-empty string (or at least a string)
  if (typeof p.name !== 'string') return null;

  // config: structural check — must be an object with version:1
  const config = p.config;
  if (!config || typeof config !== 'object') return null;

  const c = config as Record<string, unknown>;
  if (c.version !== 1) return null;

  // theme: object with four string colour fields
  if (!c.theme || typeof c.theme !== 'object') return null;
  const theme = c.theme as Record<string, unknown>;
  if (
    typeof theme.primaryColor !== 'string' ||
    typeof theme.secondaryColor !== 'string' ||
    typeof theme.backgroundColor !== 'string' ||
    typeof theme.textColor !== 'string'
  ) {
    return null;
  }

  // typography: object with headingFont + bodyFont strings
  if (!c.typography || typeof c.typography !== 'object') return null;
  const typo = c.typography as Record<string, unknown>;
  if (typeof typo.headingFont !== 'string' || typeof typo.bodyFont !== 'string') {
    return null;
  }

  // sections: array
  if (!Array.isArray(c.sections)) return null;

  return {
    type: PREVIEW_MESSAGE_TYPE,
    version: PREVIEW_PROTOCOL_VERSION,
    payload: {
      name: p.name as string,
      config: config as TemplateConfigV1,
    },
  };
}

/**
 * Validate the event.origin against the configured trusted admin origin.
 *
 * The trustedOrigin MUST be supplied from a server-side environment variable
 * (NEXT_PUBLIC_TRUSTED_ADMIN_ORIGIN) baked in at build time.
 * It is never derived from request headers.
 */
export function isTrustedOrigin(
  eventOrigin: string,
  trustedOrigin: string,
): boolean {
  if (!trustedOrigin) return false;
  // Exact string match — no wildcard, no prefix
  return eventOrigin === trustedOrigin;
}
