// database/consumption.ts
import type { Product } from '../types';

/**
 * Projects how much of a product is left right now, based on:
 *  - the quantity as of `quantityUpdatedAt` (last time it was explicitly set)
 *  - a consumption rate: `consumptionRateAmount` units consumed every
 *    `consumptionRateDays` days
 *
 * Uses whole elapsed days and floors the result, so consumption happens in
 * discrete steps rather than fractionally -- e.g. a 1L milk carton with a
 * rate of "1 unit / 3 days" stays at its current count for two days, then
 * drops by exactly 1 on the third, rather than showing 0.66 of a carton.
 *
 * Returns the raw quantity unchanged if there's no rate configured, or if
 * quantity itself is null.
 */
export function getEffectiveQuantity(
  product: Pick<
    Product,
    'quantity' | 'quantityUpdatedAt' | 'consumptionRateAmount' | 'consumptionRateDays'
  >,
  now: Date = new Date()
): number | null {
  if (product.quantity == null) return null;

  if (!product.consumptionRateAmount || !product.consumptionRateDays) {
    return product.quantity;
  }

  const updatedAt = new Date(product.quantityUpdatedAt);
  const elapsedMs = now.getTime() - updatedAt.getTime();
  const elapsedDays = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));

  if (elapsedDays <= 0) return product.quantity;

  const ratePerDay = product.consumptionRateAmount / product.consumptionRateDays;
  const consumed = Math.floor(elapsedDays * ratePerDay);

  return Math.max(0, product.quantity - consumed);
}
