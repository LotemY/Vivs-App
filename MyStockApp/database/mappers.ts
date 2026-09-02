// database/mappers.ts
import type { Product, RestockLogEntry } from '../types';

/**
 * Raw shape as it comes back from SQLite (snake_case columns).
 * `photo` is included as optional because list queries should
 * omit it (see productColumnsNoPhoto below) — only detail/edit
 * queries need to pull the actual bytes.
 */
export interface ProductRow {
  id: number;
  name: string;
  price: number | null;
  unit: string | null;
  quantity: number | null;
  photo?: Uint8Array | null;
  average_days_between_restocks: number | null;
  manual_override_days: number | null;
  created_at: string;
}

export interface RestockLogRow {
  id: number;
  product_id: number;
  restocked_at: string;
  quantity: number | null;
}

/** Column list for list views — deliberately excludes the `photo` BLOB. */
export const PRODUCT_COLUMNS_NO_PHOTO =
  'id, name, price, unit, quantity, average_days_between_restocks, manual_override_days, created_at';

/** Full column list, including `photo` — use only for single-item detail fetches. */
export const PRODUCT_COLUMNS_WITH_PHOTO = `${PRODUCT_COLUMNS_NO_PHOTO}, photo`;

export function rowToProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    unit: row.unit,
    quantity: row.quantity,
    photo: row.photo ?? null,
    averageDaysBetweenRestocks: row.average_days_between_restocks,
    manualOverrideDays: row.manual_override_days,
    createdAt: row.created_at,
  };
}

export function rowToRestockLogEntry(row: RestockLogRow): RestockLogEntry {
  return {
    id: row.id,
    productId: row.product_id,
    restockedAt: row.restocked_at,
    quantity: row.quantity,
  };
}
