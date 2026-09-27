// database/pricing.ts
import type { Product } from '../types';

/**
 * Reference size for each pack-unit type:
 *  - item -> per 1
 *  - grams / ml -> per 100
 *  - kg / liters -> per 1
 */
function referenceSize(unitType: NonNullable<Product['packUnitType']>): number {
  switch (unitType) {
    case 'item':
      return 1;
    case 'g':
    case 'ml':
      return 100;
    case 'kg':
    case 'l':
      return 1;
  }
}

const UNIT_LABEL: Record<NonNullable<Product['packUnitType']>, string> = {
  item: 'item',
  g: '100g',
  ml: '100ml',
  kg: 'kg',
  l: 'liter',
};

/**
 * Returns something like "1.20 € per 100g", or null if there isn't enough
 * data yet (price, units per pack, and a chosen pack unit type are all
 * required).
 */
export function getPricePerReference(product: {
  price: number | null;
  unitsPerPack: number | null;
  packUnitType: Product['packUnitType'];
}): string | null {
  const { price, unitsPerPack, packUnitType } = product;
  if (price == null || unitsPerPack == null || unitsPerPack <= 0 || packUnitType == null) {
    return null;
  }
  const ref = referenceSize(packUnitType);
  const chunks = unitsPerPack / ref;
  if (chunks <= 0) return null;
  const pricePerRef = price / chunks;
  return `${pricePerRef.toFixed(2)} € per ${UNIT_LABEL[packUnitType]}`;
}
