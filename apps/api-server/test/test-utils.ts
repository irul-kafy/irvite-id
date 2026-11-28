import { loadMasterPricingConfigFromPrisma } from '../src/orders/packages';

/**
 * Test utility to reset in-memory master pricing cache.
 * Excluded from production build/code.
 */
export function resetMasterPricingCacheForTests(): void {
  void loadMasterPricingConfigFromPrisma(undefined, {
    bypassCache: true,
    resetCache: true,
  });
}
