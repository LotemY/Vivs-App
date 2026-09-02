// app/(tabs)/storage.tsx
import { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { listProducts } from '../../database/productRepository';
import type { Product } from '../../types';

export default function StorageScreen() {
  const db = useSQLiteContext();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await listProducts(db);
    // Lowest quantity first — what's about to run out is most useful to see
    data.sort((a, b) => (a.quantity ?? Infinity) - (b.quantity ?? Infinity));
    setProducts(data);
    setLoading(false);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={products}
        keyExtractor={(item) => String(item.id)}
        refreshing={loading}
        onRefresh={load}
        contentContainerStyle={products.length === 0 && styles.emptyContainer}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            Nothing to show yet — add products from the Products tab.
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.quantity}>
              {item.quantity ?? '—'} {item.unit ?? ''}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#888', textAlign: 'center', paddingHorizontal: 32 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  name: { fontSize: 16, fontWeight: '600' },
  quantity: { fontSize: 15, color: '#444' },
});
