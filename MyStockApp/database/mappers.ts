// database/mappers.ts
import type { Product, RestockLogEntry } from '../types';

/** Raw shape as it comes back from Supabase (snake_case columns, matching the SQL schema). */
export interface ProductRow {
  id: number;
  name: string;
  price: number | null;
  unit: string | null;
  quantity: number | null;
  photo_url: string | null;
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

export function rowToProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    unit: row.unit,
    quantity: row.quantity,
    photoUrl: row.photo_url,
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
