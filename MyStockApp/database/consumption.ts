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

/**
 * How many more whole days until the current quantity is projected to hit
 * zero, counting down smoothly from the day it was last set -- e.g. 1 milk
 * carton at "1 every 3 days" shows 3, then 2, then 1, then "out", rather
 * than staying at 3 until the quantity itself drops.
 *
 * This is intentionally independent of getEffectiveQuantity's stepwise
 * (floored) display value -- it projects forward from the *original*
 * quantity and elapsed real time, so it ticks down daily even on days
 * where the displayed quantity number hasn't changed yet.
 *
 * Returns null if there's no rate configured, or no quantity to project from.
 */
export function getDaysRemaining(
  product: Pick<
    Product,
    'quantity' | 'quantityUpdatedAt' | 'consumptionRateAmount' | 'consumptionRateDays'
  >,
  now: Date = new Date()
): number | null {
  if (product.quantity == null) return null;
  if (!product.consumptionRateAmount || !product.consumptionRateDays) return null;

  const ratePerDay = product.consumptionRateAmount / product.consumptionRateDays;
  const totalDurationDays = product.quantity / ratePerDay;

  const updatedAt = new Date(product.quantityUpdatedAt);
  const elapsedMs = now.getTime() - updatedAt.getTime();
  const elapsedDays = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));

  return Math.max(0, Math.ceil(totalDurationDays - elapsedDays));
}
