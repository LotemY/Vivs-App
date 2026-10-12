// database/consumption.ts
import type { Product } from '../types';

/**
 * The quantity on hand -- exactly what was last saved, nothing more.
 *
 * This used to subtract a projected amount based on the consumption rate and
 * elapsed time (the "decay"). That's gone on purpose: the rate is only a
 * guess, so the number shown is now only ever what the user actually told the
 * app. The rate still drives the *prediction* (getDaysRemaining, the
 * running-low notification, and isLikelyOut below) -- it just never edits
 * the count itself.
 *
 * Kept as a function (and keeps its old parameters) so every existing caller
 * keeps working unchanged.
 */
export function getEffectiveQuantity(
  product: Pick<
    Product,
    'quantity' | 'quantityUpdatedAt' | 'consumptionRateAmount' | 'consumptionRateDays'
  >,
  _now: Date = new Date()
): number | null {
  return product.quantity;
}

/**
 * True when the app's prediction says the product should have run out by now
 * but the saved count still says there's some. Drives the non-pressable
 * "Likely out" flag in Storage. Never changes the count.
 */
export function isLikelyOut(
  product: Pick<
    Product,
    'quantity' | 'quantityUpdatedAt' | 'consumptionRateAmount' | 'consumptionRateDays'
  >,
  now: Date = new Date()
): boolean {
  if (product.quantity == null || product.quantity <= 0) return false;
  const daysLeft = getDaysRemaining(product, now);
  return daysLeft != null && daysLeft <= 0;
}

/**
 * How many more whole days until the current quantity is projected to hit
 * zero, counting down smoothly from the day it was last set -- e.g. 1 milk
 * carton at "1 every 3 days" shows 3, then 2, then 1, then "out", rather
 * than staying at 3 until the quantity itself drops.
 *
 * This is a prediction only -- it projects forward from the last saved
 * quantity and elapsed real time, and never changes the displayed count.
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

/**
 * The raw consumption rate as units/day -- e.g. cookies at "3 every 1 day"
 * returns 3, milk at "1 every 3 days" returns 0.33. Useful for showing the
 * actual number driving the decay, not just its effects (days-left, etc).
 * Returns null if no rate is configured.
 */
export function getConsumptionRatePerDay(
  product: Pick<Product, 'consumptionRateAmount' | 'consumptionRateDays'>
): number | null {
  if (!product.consumptionRateAmount || !product.consumptionRateDays) return null;
  return product.consumptionRateAmount / product.consumptionRateDays;
}
