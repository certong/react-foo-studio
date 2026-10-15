import type { Credits } from '@/data/types';

/**
 * Splits the spendable balance into its two buckets. `free` counts both; monthly credits are spent first,
 * so top-up only shrinks once the monthly ones run out. Bars show the monthly bucket only, out of `monthly`.
 */
export function creditSplit(c: Credits) {
  const topUp = Math.min(c.topUp, c.free);
  return { total: c.free, monthlyFree: c.free - topUp, topUp };
}
