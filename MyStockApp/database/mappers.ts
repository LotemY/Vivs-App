// database/mappers.ts
import type { Product, RestockLogEntry } from '../types';

/** Raw shape as it comes back from Supabase (snake_case columns, matching the SQL schema). */
export interface ProductRow {
  id: number;
  name: string;
  company: string | null;
  price: number | null;
  unit: string | null;
  quantity: number | null;
  quantity_updated_at: string;
  consumption_rate_amount: number | null;
  consumption_rate_days: number | null;
  photo_url: string | null;
  is_essential: boolean;
  category: string | null;
  units_per_pack: number | null;
  pack_unit_type: 'item' | 'g' | 'ml' | 'kg' | 'l' | null;
  average_days_between_restocks: number | null;
  manual_override_days: number | null;
  created_at: string;
  in_storage: boolean;
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
    company: row.company,
    price: row.price,
    unit: row.unit,
    quantity: row.quantity,
    quantityUpdatedAt: row.quantity_updated_at,
    consumptionRateAmount: row.consumption_rate_amount,
    consumptionRateDays: row.consumption_rate_days,
    photoUrl: row.photo_url,
    isEssential: row.is_essential,
    category: row.category,
    unitsPerPack: row.units_per_pack,
    packUnitType: row.pack_unit_type,
    averageDaysBetweenRestocks: row.average_days_between_restocks,
    manualOverrideDays: row.manual_override_days,
    createdAt: row.created_at,
    inStorage: row.in_storage,
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
