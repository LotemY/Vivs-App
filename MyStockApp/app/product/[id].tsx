// app/product/[id].tsx
import { useCallback, useState } from 'react';
import { View, ActivityIndicator, Text, Pressable, StyleSheet } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ProductForm } from '../../components/ProductForm';
import { getProduct, updateProduct, deleteProduct } from '../../database/productRepository';
import type { NewProduct, Product } from '../../types';

export default function EditProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const productId = Number(id);
  const db = useSQLiteContext();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      getProduct(db, productId).then((p) => {
        if (!cancelled) {
          setProduct(p);
          setLoading(false);
        }
      });
      return () => {
        cancelled = true;
      };
    }, [db, productId])
  );

  async function handleSubmit(data: NewProduct) {
    await updateProduct(db, productId, data);
    router.back();
  }

  async function handleDelete() {
    await deleteProduct(db, productId);
    router.back();
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.center}>
        <Text>Product not found.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ProductForm initial={product} onSubmit={handleSubmit} submitLabel="Save Changes" />
      <Pressable style={styles.deleteButton} onPress={handleDelete}>
        <Text style={styles.deleteText}>Delete Product</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  deleteButton: { marginHorizontal: 16, marginTop: 8, alignItems: 'center', padding: 12 },
  deleteText: { color: '#dc2626', fontSize: 15, fontWeight: '600' },
});
