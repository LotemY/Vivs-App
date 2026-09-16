// database/productRepository.ts
import { supabase } from './supabaseClient';
import type { Product, NewProduct, ProductUpdate, RestockLogEntry } from '../types';
import {
  rowToProduct,
  rowToRestockLogEntry,
  type ProductRow,
  type RestockLogRow,
} from './mappers';

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
      is_essential: data.isEssential,
      category: data.category,
      manual_override_days: data.manualOverrideDays,
    })
    .select('id')
    .single();

  if (error) throw error;
  return row.id;
}

export async function updateProduct(id: number, data: ProductUpdate): Promise<void> {
  const { error } = await supabase
    .from('products')
    .update({
      name: data.name,
      price: data.price,
      unit: data.unit,
      // quantity / quantity_updated_at / consumption_rate_* are all
      // intentionally omitted. Editing a product's details (price, name,
      // unit) must never touch stock levels, the decay clock, or the
      // consumption rate -- those are only ever set by a real
      // shopping-mode correction. See ProductUpdate's doc comment.
      photo_url: data.photoUrl,
      is_essential: data.isEssential,
      category: data.category,
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
 * Applies every quantity change made during a shopping-mode session.
 * For each item, compares its actual last-known quantity/timestamp against
 * the corrected value and decides what happened:
 *
 *  - Quantity went DOWN -> a real usage correction. Recomputes the
 *    consumption rate from actual elapsed time and actual amount gone
 *    (skipped if less than 12 hours have passed -- not enough signal to
 *    measure a meaningful daily rate from).
 *  - Quantity went UP -> a restock. Logged to restock_log for the
 *    average/median cycle calculation. Never touches the consumption rate
 *    -- buying more doesn't mean you're using it faster.
 *
 * Every changed item always gets quantity + quantity_updated_at written,
 * resetting the decay clock to now with the corrected number either way.
 */
export async function applyShoppingChanges(
  changes: { product: Product; newQuantity: number }[]
): Promise<void> {
  const now = new Date();
  const nowIso = now.toISOString();

  await Promise.all(
    changes.map(async ({ product, newQuantity }) => {
      const previousQuantity = product.quantity ?? 0;
      const consumedAmount = previousQuantity - newQuantity;

      const productUpdate: Record<string, unknown> = {
        quantity: newQuantity,
        quantity_updated_at: nowIso,
      };

      if (consumedAmount > 0) {
        const elapsedMs = now.getTime() - new Date(product.quantityUpdatedAt).getTime();
        const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
        // Require at least half a day of real elapsed time -- same-day
        // corrections are too noisy to trust as a daily rate.
        if (elapsedDays >= 0.5) {
          productUpdate.consumption_rate_amount = consumedAmount;
          productUpdate.consumption_rate_days = Number(elapsedDays.toFixed(2));
        }
      }

      const { error: updateError } = await supabase
        .from('products')
        .update(productUpdate)
        .eq('id', product.id);
      if (updateError) throw updateError;

      if (consumedAmount < 0) {
        const { error: logError } = await supabase.from('restock_log').insert({
          product_id: product.id,
          restocked_at: nowIso,
          quantity: -consumedAmount,
        });
        if (logError) throw logError;
      }
    })
  );
}

/**
 * Distinct categories already in use across all products, alphabetically --
 * powers the "pick an existing category" suggestions in the product form.
 */
export async function listCategories(): Promise<string[]> {
  const { data, error } = await supabase
    .from('products')
    .select('category')
    .not('category', 'is', null);

  if (error) throw error;

  const unique = new Set<string>();
  for (const row of data as { category: string | null }[]) {
    if (row.category) unique.add(row.category);
  }
  return Array.from(unique).sort((a, b) => a.localeCompare(b));
}

/**
 * All restock_log rows for every product in one query, so Storage can
 * compute each product's average/median restock cycle without firing
 * one request per row.
 */
export async function listAllRestockLogs(): Promise<RestockLogEntry[]> {
  const { data, error } = await supabase
    .from('restock_log')
    .select('*')
    .order('restocked_at', { ascending: true });

  if (error) throw error;
  return (data as RestockLogRow[]).map(rowToRestockLogEntry);
}
