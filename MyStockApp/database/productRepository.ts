// database/productRepository.ts
import { supabase } from './supabaseClient';
import type { Product, NewProduct, ProductUpdate, RestockLogEntry } from '../types';
import {
  rowToProduct,
  rowToRestockLogEntry,
  type ProductRow,
  type RestockLogRow,
} from './mappers';
import { logEvent } from './eventRepository';

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

/** "Company Name" the way it's shown everywhere else. */
function displayName(p: { company: string | null; name: string }): string {
  return `${p.company ? `${p.company} ` : ''}${p.name}`;
}

export async function createProduct(data: NewProduct): Promise<number> {
  const { data: row, error } = await supabase
    .from('products')
    .insert({
      name: data.name,
      company: data.company,
      price: data.price,
      unit: data.unit,
      quantity: 0, // set later via Storage's shopping mode, not the form
      consumption_rate_amount: null, // never set at creation anymore -- picked up organically
      consumption_rate_days: null,   // from the first real shopping-mode correction
      photo_url: data.photoUrl,
      is_essential: data.isEssential,
      category: data.category,
      units_per_pack: data.unitsPerPack,
      pack_unit_type: data.packUnitType,
      manual_override_days: data.manualOverrideDays,
      in_storage: true, // every new product starts tracked in Storage
    })
    .select('id')
    .single();

  if (error) throw error;
  logEvent({ type: 'added', productId: row.id, productName: displayName(data) });
  return row.id;
}

export async function updateProduct(id: number, data: ProductUpdate): Promise<void> {
  const { error } = await supabase
    .from('products')
    .update({
      name: data.name,
      company: data.company,
      price: data.price,
      unit: data.unit,
      // quantity / quantity_updated_at / consumption_rate_* are all
      // intentionally omitted. Editing a product's details (price, name,
      // unit) must never touch stock levels, the decay clock, or the
      // consumption rate -- those are only ever set by a real
      // shopping-mode correction.
      photo_url: data.photoUrl,
      is_essential: data.isEssential,
      category: data.category,
      units_per_pack: data.unitsPerPack,
      pack_unit_type: data.packUnitType,
      manual_override_days: data.manualOverrideDays,
      // Saving an edit always un-archives -- if you're back in here
      // touching a product's details, you're using it again. No separate
      // "bring it back" button needed.
      in_storage: true,
    })
    .eq('id', id);

  if (error) throw error;
}

/**
 * Archives a product out of Storage/shopping mode without deleting it --
 * it stays in Products (the full catalog) and its history is untouched.
 * Triggered from Storage by pressing "-" while a product is already at 0.
 */
export async function archiveProduct(id: number): Promise<void> {
  const product = await getProduct(id);
  const { error } = await supabase.from('products').update({ in_storage: false }).eq('id', id);
  if (error) throw error;
  if (product) logEvent({ type: 'archived', productId: id, productName: displayName(product) });
}
export async function unarchiveProduct(id: number): Promise<void> {
  const { error } = await supabase.from('products').update({ in_storage: true }).eq('id', id);
  if (error) throw error;
}
export async function deleteProduct(id: number): Promise<void> {
  const product = await getProduct(id);
  // restock_log rows for this product are removed automatically via ON DELETE CASCADE
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
  if (product) logEvent({ type: 'deleted', productId: id, productName: displayName(product) });
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
        logEvent({
          type: 'restocked',
          productId: product.id,
          productName: displayName(product),
          quantity: -consumedAmount,
        });
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
 * Distinct companies already in use across all products, alphabetically --
 * same "remembers what you typed before" behavior as listCategories(),
 * powers the suggestion chips under the Company field.
 */
export async function listCompanies(): Promise<string[]> {
  const { data, error } = await supabase
    .from('products')
    .select('company')
    .not('company', 'is', null);

  if (error) throw error;

  const unique = new Set<string>();
  for (const row of data as { company: string | null }[]) {
    if (row.company) unique.add(row.company);
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

/**
 * The color assigned to each category, keyed by category name.
 * Backs the long-press "set a color for this category" feature -- once
 * set, that color is used for the category's text everywhere it shows up.
 */
export async function listCategoryColors(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from('category_colors').select('*');
  if (error) throw error;

  const map: Record<string, string> = {};
  for (const row of data as { category: string; color: string }[]) {
    map[row.category] = row.color;
  }
  return map;
}

export async function setCategoryColor(category: string, color: string): Promise<void> {
  const { error } = await supabase
    .from('category_colors')
    .upsert({ category, color }, { onConflict: 'category' });
  if (error) throw error;
}
