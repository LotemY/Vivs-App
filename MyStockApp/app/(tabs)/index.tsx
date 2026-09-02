// app/(tabs)/index.tsx
import { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { listProducts, deleteProduct } from '../../database/productRepository';
import type { Product } from '../../types';

export default function ProductsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await listProducts(db);
    setProducts(data);
    setLoading(false);
  }, [db]);

  // Reload every time this tab regains focus (e.g. after add/edit/delete)
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function confirmDelete(product: Product) {
    Alert.alert(
      'Delete product?',
      `"${product.name}" and its restock history will be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteProduct(db, product.id);
            load();
          },
        },
      ]
    );
  }

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
            No products yet. Tap + to add your first one.
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => router.push(`/product/${item.id}`)}
            onLongPress={() => confirmDelete(item)}
          >
            <View style={styles.rowText}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {item.quantity ?? '—'} {item.unit ?? ''}
                {item.price != null ? `  ·  $${item.price.toFixed(2)}` : ''}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </Pressable>
        )}
      />

      <Pressable style={styles.fab} onPress={() => router.push('/product/new')}>
        <Ionicons name="add" size={28} color="white" />
      </Pressable>
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
  rowText: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600' },
  meta: { fontSize: 13, color: '#777', marginTop: 2 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
});
