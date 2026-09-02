// database/schema.ts
import { type SQLiteDatabase } from 'expo-sqlite';

/**
 * Bump this whenever you change the schema, and add a new `if (version < N)`
 * migration branch below. Never edit an old branch once it's shipped —
 * only append new ones.
 */
export const DB_VERSION = 1;

/**
 * Called once by <SQLiteProvider onInit={migrateDbIfNeeded}>.
 * Uses PRAGMA user_version to track which migrations have already run,
 * so this is safe to call on every app launch.
 */
export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const result = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version'
  );
  let currentVersion = result?.user_version ?? 0;

  if (currentVersion >= DB_VERSION) {
    return;
  }

  if (currentVersion === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price REAL,
        unit TEXT,
        quantity REAL,
        photo BLOB,
        average_days_between_restocks REAL,
        manual_override_days INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS restock_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        restocked_at TEXT NOT NULL,
        quantity REAL,
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_restock_log_product_date
        ON restock_log (product_id, restocked_at);
    `);
    currentVersion = 1;
  }

  // Future migrations go here, e.g.:
  // if (currentVersion === 1) {
  //   await db.execAsync(`ALTER TABLE products ADD COLUMN notes TEXT;`);
  //   currentVersion = 2;
  // }

  await db.execAsync(`PRAGMA user_version = ${DB_VERSION}`);
}
