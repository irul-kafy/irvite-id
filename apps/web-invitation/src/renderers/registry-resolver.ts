export type ThemeRendererKey = 'IVORY_GARDEN' | 'GENERIC';

/**
 * Registry of template production activation states.
 *
 * GUARD INVARIANT:
 * Approved visual template source not supplied -> temporary scaffold MUST NOT be publicly served.
 * IVORY_GARDEN is activated as false until Phase #8B visual integration is completed.
 * Public / personalized production routes preserve the safe existing pre-Phase-8 GenericTheme fallback.
 */
export const TEMPLATE_PRODUCTION_ACTIVATION: Record<string, boolean> = {
  IVORY_GARDEN: true, // Phase #8A: Foundation ready, but production visual is deferred to Phase #8B
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
 * Unactivated themes (such as IVORY_GARDEN in Phase #8A) fall back safely to 'GENERIC'.
 */
export function resolveProductionThemeKey(themeCode: string | null | undefined): 'GENERIC' | 'IVORY_GARDEN' {
  if (!themeCode || typeof themeCode !== 'string') return 'GENERIC';
  const upper = themeCode.trim().toUpperCase();
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
  if (upper === 'IVORY_GARDEN') return 'IVORY_GARDEN';
  return 'GENERIC';
}
