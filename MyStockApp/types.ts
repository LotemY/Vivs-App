// types.ts

/**
 * A tracked household item.
 * `photoUrl` points to a file in the Supabase "product-photos" storage
 * bucket -- the database itself never holds image bytes.
 * `averageDaysBetweenRestocks` is a cached value, recomputed whenever a
 * new restock is logged.
 * `manualOverrideDays` lets the user set an expected restock interval
 * by hand before enough restock history exists to compute an average.
 */
export interface Product {
  id: number;
  name: string;
  company: string | null;       // brand/manufacturer, split from name
  price: number | null;
  unit: string | null;          // e.g. "kg", "pack", "bottle", "roll" -- free-text display label
  quantity: number | null;      // amount on hand as of quantityUpdatedAt
  quantityUpdatedAt: string;    // ISO 8601 -- when quantity was last explicitly set
  consumptionRateAmount: number | null; // e.g. 3 (units)
  consumptionRateDays: number | null;   // e.g. 1 (day) -- together: "3 units every 1 day"
  photoUrl: string | null;
  isEssential: boolean;         // pinned to the top of Products/Storage, marked with a star
  category: string | null;      // free-text, user-defined (e.g. "dairy", "cleaning")
  unitsPerPack: number | null;  // e.g. 500 grams total in the pack
  packUnitType: 'item' | 'g' | 'ml' | 'kg' | 'l' | null; // what unitsPerPack is measured in -- drives price-per-reference
  averageDaysBetweenRestocks: number | null;
  manualOverrideDays: number | null;
  createdAt: string;            // ISO 8601
  inStorage: boolean;           // false = archived out of Storage/shopping mode, still in Products
}

/**
 * Shape used when creating a product. Consumption rate is deliberately
 * NOT included -- every product now starts with no rate and picks one up
 * automatically after its first real shopping-mode usage correction.
 * `inStorage` is also excluded -- the repository always sets it itself
 * (true on create, true again on any edit-save/"un-archive"), the form
 * never needs to know about it.
 */
export type NewProduct = Omit<
  Product,
  | 'id'
  | 'createdAt'
  | 'averageDaysBetweenRestocks'
  | 'quantityUpdatedAt'
  | 'quantity'
  | 'consumptionRateAmount'
  | 'consumptionRateDays'
  | 'inStorage'
>;

/**
 * Shape used when editing an EXISTING product. Identical to NewProduct now
 * that consumption rate is never user-supplied at any point -- it's only
 * ever set by a real shopping-mode usage correction.
 */
export type ProductUpdate = NewProduct;

/**
 * A single purchase/restock event for a product.
 * The average-duration logic is derived entirely from the gaps between
 * consecutive `restockedAt` dates for a given product.
 */
export interface RestockLogEntry {
  id: number;
  productId: number;
  restockedAt: string;   // ISO 8601
  quantity: number | null; // how much was bought this time, optional
}

export type NewRestockLogEntry = Omit<RestockLogEntry, 'id'>;
