export type ThemeRendererKey =
  | 'SEKAR_KEDATON'
  | 'OPALINE_NOCTURNE'
  | 'AETHERIA'
  | 'RANAH_CINTA'
  | 'GENERIC';

export const TEMPLATE_PRODUCTION_ACTIVATION: Record<string, boolean> = {
  SEKAR_KEDATON: true,
  AETHERIA: true,
  OPALINE_NOCTURNE: true,
  RANAH_CINTA: true,
  GENERIC: true,
};

export function isTemplateProductionActivated(themeCode: string | null | undefined): boolean {
  if (!themeCode || typeof themeCode !== 'string') return false;
  const upper = themeCode.trim().toUpperCase();
  return Boolean(TEMPLATE_PRODUCTION_ACTIVATION[upper]);
}

export function resolveProductionThemeKey(themeCode: string | null | undefined): ThemeRendererKey {
  if (!themeCode || typeof themeCode !== 'string') return 'GENERIC';
  const upper = themeCode.trim().toUpperCase();
  if (upper === 'SEKAR_KEDATON' && isTemplateProductionActivated('SEKAR_KEDATON')) return 'SEKAR_KEDATON';
  if (upper === 'AETHERIA' && isTemplateProductionActivated('AETHERIA')) return 'AETHERIA';
  if (upper === 'OPALINE_NOCTURNE' && isTemplateProductionActivated('OPALINE_NOCTURNE')) return 'OPALINE_NOCTURNE';
  if (upper === 'RANAH_CINTA' && isTemplateProductionActivated('RANAH_CINTA')) return 'RANAH_CINTA';
  return 'GENERIC';
}

export function resolveFoundationThemeKey(themeCode: string | null | undefined): ThemeRendererKey {
  if (!themeCode || typeof themeCode !== 'string') return 'GENERIC';
  const upper = themeCode.trim().toUpperCase();
  if (upper === 'SEKAR_KEDATON') return 'SEKAR_KEDATON';
  if (upper === 'AETHERIA') return 'AETHERIA';
  if (upper === 'OPALINE_NOCTURNE') return 'OPALINE_NOCTURNE';
  if (upper === 'RANAH_CINTA') return 'RANAH_CINTA';
  return 'GENERIC';
}
