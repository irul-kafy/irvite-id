export type ThemeRendererKey = 'IVORY_GARDEN' | 'SERENE_GARDEN' | 'SUNDA_PUSPA' | 'GENERIC';

/**
 * Registry of template production activation states.
 *
 * GUARD INVARIANT:
 * Approved visual template source not supplied / unreviewed -> temporary scaffold or pending template MUST NOT be publicly served.
 * IVORY_GARDEN: true (Phase #8 completed and stable)
 * SERENE_GARDEN: true (Phase #9 completed and stable)
 * SUNDA_PUSPA: true (Phase #10C: Production activation enabled after review)
 * Public / personalized production routes preserve the safe existing pre-Phase-10 GenericTheme fallback.
 */
export const TEMPLATE_PRODUCTION_ACTIVATION: Record<string, boolean> = {
  SUNDA_PUSPA: true, // Phase #10C: Production activation enabled after Phase #10B-R2 review
  SERENE_GARDEN: true,
  IVORY_GARDEN: true,
  GENERIC: true,
  VERDANT: true,
  MIDNIGHT: true,
  BOTANICAL: true,
  CLASSIC: true,
  MINIMAL: true,
  ROMANTIC: true,
};

export function isTemplateProductionActivated(themeCode: string | null | undefined): boolean {
  if (!themeCode || typeof themeCode !== 'string') return false;
  const upper = themeCode.trim().toUpperCase();
  return Boolean(TEMPLATE_PRODUCTION_ACTIVATION[upper]);
}

/**
 * Resolves theme key for PRODUCTION route rendering.
 * Only returns a theme's dedicated key if that theme is verified and production-activated.
 * Unactivated themes (such as SUNDA_PUSPA in Phase #10B) fall back safely to 'GENERIC'.
 */
export function resolveProductionThemeKey(themeCode: string | null | undefined): ThemeRendererKey {
  if (!themeCode || typeof themeCode !== 'string') return 'GENERIC';
  const upper = themeCode.trim().toUpperCase();
  if (upper === 'SUNDA_PUSPA' && isTemplateProductionActivated('SUNDA_PUSPA')) {
    return 'SUNDA_PUSPA';
  }
  if (upper === 'SERENE_GARDEN' && isTemplateProductionActivated('SERENE_GARDEN')) {
    return 'SERENE_GARDEN';
  }
  if (upper === 'IVORY_GARDEN' && isTemplateProductionActivated('IVORY_GARDEN')) {
    return 'IVORY_GARDEN';
  }
  return 'GENERIC';
}

/**
 * Resolves theme key for INTERNAL foundation testing / development.
 * Maps known theme codes to their foundation component keys without production activation gating.
 */
export function resolveFoundationThemeKey(themeCode: string | null | undefined): ThemeRendererKey {
  if (!themeCode || typeof themeCode !== 'string') return 'GENERIC';
  const upper = themeCode.trim().toUpperCase();
  if (upper === 'SUNDA_PUSPA') return 'SUNDA_PUSPA';
  if (upper === 'SERENE_GARDEN') return 'SERENE_GARDEN';
  if (upper === 'IVORY_GARDEN') return 'IVORY_GARDEN';
  return 'GENERIC';
}
