// database/DatabaseProvider.tsx
import React, { Suspense } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SQLiteProvider } from 'expo-sqlite';
import { migrateDbIfNeeded } from './schema';

const DB_NAME = 'restock.db';

/**
 * Wrap your app's root component in this. It opens (or creates) the
 * database, runs any pending migrations, and exposes the connection
 * to descendants via useSQLiteContext().
 *
 * Usage in App.tsx:
 *   <DatabaseProvider>
 *     <RestOfApp />
 *   </DatabaseProvider>
 */
export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SQLiteProvider databaseName={DB_NAME} onInit={migrateDbIfNeeded} useSuspense>
        {children}
      </SQLiteProvider>
    </Suspense>
  );
}

function LoadingFallback() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
