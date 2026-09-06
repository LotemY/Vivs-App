// types.ts

/**
 * A tracked household item.
 * `photoUrl` points to a file in the Supabase "product-photos" storage
 * bucket -- the database itself never holds image bytes.
 * `averageDaysBetweenRestocks` is a cached value, recomputed whenever a
 * new restock is logged (see Section 4).
 * `manualOverrideDays` lets the user set an expected restock interval
 * by hand before enough restock history exists to compute an average.
 */
export interface Product {
  id: number;
  name: string;
  price: number | null;
  unit: string | null;          // e.g. "kg", "pack", "bottle", "roll"
  quantity: number | null;      // amount on hand as of quantityUpdatedAt
  quantityUpdatedAt: string;    // ISO 8601 -- when quantity was last explicitly set
  consumptionRateAmount: number | null; // e.g. 3 (units)
  consumptionRateDays: number | null;   // e.g. 1 (day) -- together: "3 units every 1 day"
  photoUrl: string | null;
  averageDaysBetweenRestocks: number | null;
  manualOverrideDays: number | null;
  createdAt: string;            // ISO 8601
}

/**
 * Shape used when creating/editing a product via the form.
 * Notably excludes `quantity` and `quantityUpdatedAt` -- those are no
 * longer set here at all, only via Storage's shopping-mode save.
 */
export type NewProduct = Omit<
  Product,
  'id' | 'createdAt' | 'averageDaysBetweenRestocks' | 'quantityUpdatedAt' | 'quantity'
>;

/**
 * A single purchase/restock event for a product.
 * The average-duration logic in Section 4 is derived entirely from
 * the gaps between consecutive `restockedAt` dates for a given product.
 */
export interface RestockLogEntry {
  id: number;
  productId: number;
  restockedAt: string;   // ISO 8601
  quantity: number | null; // how much was bought this time, optional
}

export type NewRestockLogEntry = Omit<RestockLogEntry, 'id'>;
