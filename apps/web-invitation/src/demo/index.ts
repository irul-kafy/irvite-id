import type { RendererData } from '../renderers/registry';
import { SEKAR_KEDATON_DEMO_FIXTURE } from './fixtures/sekar-kedaton.fixture';
import { OPALINE_NOCTURNE_DEMO_FIXTURE } from './fixtures/opaline-nocturne.fixture';
import { AETHERIA_DEMO_FIXTURE } from './fixtures/aetheria.fixture';
import { RANAH_CINTA_DEMO_FIXTURE } from './fixtures/ranah-cinta.fixture';

export {
  SEKAR_KEDATON_DEMO_FIXTURE,
  OPALINE_NOCTURNE_DEMO_FIXTURE,
  AETHERIA_DEMO_FIXTURE,
  RANAH_CINTA_DEMO_FIXTURE,
};

const FIXTURES_BY_THEME_CODE: Record<string, RendererData> = {
  SEKAR_KEDATON: SEKAR_KEDATON_DEMO_FIXTURE,
  OPALINE_NOCTURNE: OPALINE_NOCTURNE_DEMO_FIXTURE,
  AETHERIA: AETHERIA_DEMO_FIXTURE,
  RANAH_CINTA: RANAH_CINTA_DEMO_FIXTURE,
};

/**
 * Returns static demo fixture data for a given themeCode.
 * Returns undefined if themeCode is not an approved demo theme.
 */
export function getDemoFixture(
  themeCode: string | null | undefined
): RendererData | undefined {
  if (!themeCode || typeof themeCode !== 'string') return undefined;
  const upper = themeCode.trim().toUpperCase();
  return FIXTURES_BY_THEME_CODE[upper];
}
