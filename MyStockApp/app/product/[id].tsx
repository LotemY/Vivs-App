// app/product/[id].tsx
import { useCallback, useState } from 'react';
import {
  View,
  ActivityIndicator,
  Text,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ProductForm } from '../../components/ProductForm';
import { getProduct, updateProduct, deleteProduct } from '../../database/productRepository';
import { cancelNotificationForProduct } from '../../database/notifications';
import { useTheme } from '../../theme/ThemeContext';
import type { ThemeColors } from '../../theme/colors';
import type { ProductUpdate, Product } from '../../types';

export default function EditProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const productId = Number(id);
  const router = useRouter();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
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
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFoundText}>Product not found.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior="padding"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 150 }}
        keyboardShouldPersistTaps="handled"
      >
        <ProductForm
          mode="edit"
          initial={product}
          onSubmit={handleSubmit}
          submitLabel="Save Changes"
          onCancel={() => router.back()}
        />
        <Pressable style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteText}>Delete Product</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    notFoundText: { color: colors.textPrimary },
    deleteButton: { marginHorizontal: 16, marginTop: 8, alignItems: 'center', padding: 12 },
    deleteText: { color: colors.danger, fontSize: 15, fontWeight: '600' },
  });
}
