// database/productRepository.ts
import { supabase } from './supabaseClient';
import type { Product, NewProduct } from '../types';
import { rowToProduct, type ProductRow } from './mappers';

/** List view -- no `db` argument anymore, the Supabase client is a module-level singleton. */
export async function listProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return (data as ProductRow[]).map(rowToProduct);
}

export async function getProduct(id: number): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data ? rowToProduct(data as ProductRow) : null;
}

export async function createProduct(data: NewProduct): Promise<number> {
  const { data: row, error } = await supabase
    .from('products')
    .insert({
      name: data.name,
      price: data.price,
      unit: data.unit,
      quantity: 0, // set later via Storage's shopping mode, not the form
      consumption_rate_amount: data.consumptionRateAmount,
      consumption_rate_days: data.consumptionRateDays,
      photo_url: data.photoUrl,
      manual_override_days: data.manualOverrideDays,
    })
    .select('id')
    .single();

  if (error) throw error;
  return row.id;
}

export async function updateProduct(id: number, data: NewProduct): Promise<void> {
  const { error } = await supabase
    .from('products')
    .update({
      name: data.name,
      price: data.price,
      unit: data.unit,
      // quantity / quantity_updated_at intentionally omitted -- editing a
      // product's details must never touch stock levels or reset the
      // decay clock. That's exclusively Storage's job now.
      consumption_rate_amount: data.consumptionRateAmount,
      consumption_rate_days: data.consumptionRateDays,
      photo_url: data.photoUrl,
      manual_override_days: data.manualOverrideDays,
    })
    .eq('id', id);

  if (error) throw error;
}

export async function deleteProduct(id: number): Promise<void> {
  // restock_log rows for this product are removed automatically via ON DELETE CASCADE
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Partial update -- only touches quantity (and resets the decay clock).
 * Used by Storage's shopping-mode Save, which batches every changed row
 * into one set of concurrent requests fired once, rather than one write
 * per +/- tap.
 */
export async function updateProductQuantities(
  changes: { id: number; quantity: number }[]
): Promise<void> {
  const nowIso = new Date().toISOString();
  const results = await Promise.all(
    changes.map(({ id, quantity }) =>
      supabase
        .from('products')
        .update({ quantity, quantity_updated_at: nowIso })
        .eq('id', id)
    )
  );
  const firstError = results.find((r) => r.error)?.error;
  if (firstError) throw firstError;
}
