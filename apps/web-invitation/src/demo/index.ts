import type { RendererData } from '../renderers/registry';
import { IVORY_GARDEN_DEMO_FIXTURE } from './fixtures/ivory-garden.fixture';
import { SERENE_GARDEN_DEMO_FIXTURE } from './fixtures/serene-garden.fixture';
import { SUNDA_PUSPA_DEMO_FIXTURE } from './fixtures/sunda-puspa.fixture';

export {
  IVORY_GARDEN_DEMO_FIXTURE,
  SERENE_GARDEN_DEMO_FIXTURE,
  SUNDA_PUSPA_DEMO_FIXTURE,
};

const FIXTURES_BY_THEME_CODE: Record<string, RendererData> = {
  IVORY_GARDEN: IVORY_GARDEN_DEMO_FIXTURE,
  SERENE_GARDEN: SERENE_GARDEN_DEMO_FIXTURE,
  SUNDA_PUSPA: SUNDA_PUSPA_DEMO_FIXTURE,
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
