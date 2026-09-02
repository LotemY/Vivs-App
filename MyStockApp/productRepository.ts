// database/productRepository.ts
import { type SQLiteDatabase } from 'expo-sqlite';
import type { Product, NewProduct } from '../types';
import {
  rowToProduct,
  PRODUCT_COLUMNS_NO_PHOTO,
  PRODUCT_COLUMNS_WITH_PHOTO,
  type ProductRow,
} from './mappers';

/** List view — excludes photo BLOB for speed. */
export async function listProducts(db: SQLiteDatabase): Promise<Product[]> {
  const rows = await db.getAllAsync<ProductRow>(
    `SELECT ${PRODUCT_COLUMNS_NO_PHOTO} FROM products ORDER BY name COLLATE NOCASE ASC`
  );
  return rows.map(rowToProduct);
}

/** Single product with photo — use for detail/edit screens. */
export async function getProduct(
  db: SQLiteDatabase,
  id: number
): Promise<Product | null> {
  const row = await db.getFirstAsync<ProductRow>(
    `SELECT ${PRODUCT_COLUMNS_WITH_PHOTO} FROM products WHERE id = ?`,
    [id]
  );
  return row ? rowToProduct(row) : null;
}

export async function createProduct(
  db: SQLiteDatabase,
  data: NewProduct
): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO products (name, price, unit, quantity, photo, manual_override_days)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.name,
      data.price,
      data.unit,
      data.quantity,
      data.photo,
      data.manualOverrideDays,
    ]
  );
  return result.lastInsertRowId;
}

export async function updateProduct(
  db: SQLiteDatabase,
  id: number,
  data: NewProduct
): Promise<void> {
  await db.runAsync(
    `UPDATE products
     SET name = ?, price = ?, unit = ?, quantity = ?, photo = ?, manual_override_days = ?
     WHERE id = ?`,
    [
      data.name,
      data.price,
      data.unit,
      data.quantity,
      data.photo,
      data.manualOverrideDays,
      id,
    ]
  );
}

export async function deleteProduct(db: SQLiteDatabase, id: number): Promise<void> {
  // restock_log rows for this product are removed automatically via ON DELETE CASCADE
  await db.runAsync(`DELETE FROM products WHERE id = ?`, [id]);
}
