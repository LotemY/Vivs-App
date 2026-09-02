// app/(tabs)/storage.tsx
import { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { listProducts } from '../../database/productRepository';
import { getEffectiveQuantity, getDaysRemaining } from '../../database/consumption';
import type { Product } from '../../types';

export default function StorageScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await listProducts();
    // Lowest *effective* (decayed) quantity first — what's about to run out
    data.sort(
      (a, b) => (getEffectiveQuantity(a) ?? Infinity) - (getEffectiveQuantity(b) ?? Infinity)
    );
    setProducts(data);
    setLoading(false);
  }, []);

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
        renderItem={({ item }) => {
          const daysLeft = getDaysRemaining(item);
          return (
            <View style={styles.row}>
              <Text style={styles.name}>{item.name}</Text>
              <View style={styles.quantityGroup}>
                <Text style={styles.quantity}>{getEffectiveQuantity(item) ?? '—'}</Text>
                {daysLeft != null && (
                  <Text style={styles.daysLeft}>
                    {daysLeft <= 0 ? 'out soon' : `${daysLeft}d left`}
                  </Text>
                )}
              </View>
            </View>
          );
        }}
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
  quantityGroup: { alignItems: 'flex-end' },
  quantity: { fontSize: 15, color: '#444' },
  daysLeft: { fontSize: 12, color: '#999', marginTop: 2 },
});
