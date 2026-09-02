// types.ts

/**
 * A tracked household item.
 * `photo` is raw image bytes (BLOB) stored directly in SQLite — optional.
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
  quantity: number | null;      // current amount on hand
  photo: Uint8Array | null;     // BLOB, nullable
  averageDaysBetweenRestocks: number | null;
  manualOverrideDays: number | null;
  createdAt: string;            // ISO 8601
}

/** Shape used when creating a product (id/createdAt are generated). */
export type NewProduct = Omit<Product, 'id' | 'createdAt' | 'averageDaysBetweenRestocks'>;

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
