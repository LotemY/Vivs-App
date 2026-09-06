// app/product/[id].tsx
import { useCallback, useState } from 'react';
import { View, ActivityIndicator, Text, Pressable, StyleSheet } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ProductForm } from '../../components/ProductForm';
import { getProduct, updateProduct, deleteProduct } from '../../database/productRepository';
import { cancelNotificationForProduct } from '../../database/notifications';
import type { ProductUpdate, Product } from '../../types';

export default function EditProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const productId = Number(id);
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      getProduct(productId).then((p) => {
        if (!cancelled) {
          setProduct(p);
          setLoading(false);
        }
      });
      return () => {
        cancelled = true;
      };
    }, [productId])
  );

  async function handleSubmit(data: ProductUpdate) {
    await updateProduct(productId, data);
    router.replace('/');
  }

  async function handleDelete() {
    await cancelNotificationForProduct(productId);
    await deleteProduct(productId);
    router.replace('/');
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
      <ProductForm mode="edit" initial={product} onSubmit={handleSubmit} submitLabel="Save Changes" />
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
