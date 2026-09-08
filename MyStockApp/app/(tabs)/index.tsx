// app/(tabs)/index.tsx
import { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Alert,
  Image,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { listProducts, deleteProduct } from '../../database/productRepository';
import { cancelNotificationForProduct } from '../../database/notifications';
import { deleteProductPhoto } from '../../database/photoUpload';
import { useTheme } from '../../theme/ThemeContext';
import type { ThemeColors } from '../../theme/colors';
import type { Product } from '../../types';

export default function ProductsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await listProducts();
    setProducts(data);
    setLoading(false);
  }, []);

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
            await cancelNotificationForProduct(product.id);
            await deleteProduct(product.id);
            if (product.photoUrl) {
              deleteProductPhoto(product.photoUrl); // best-effort, not awaited
            }
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
            {item.photoUrl ? (
              <Image source={{ uri: item.photoUrl }} style={styles.thumbnail} />
            ) : (
              <View style={styles.thumbnailPlaceholder}>
                <Ionicons name="image-outline" size={18} color={colors.textMuted} />
              </View>
            )}
            <View style={styles.rowText}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {item.unit ?? 'no unit'}
                {item.price != null ? `  ·  ${item.price.toFixed(2)} €` : ''}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </Pressable>
        )}
      />

      <Pressable style={styles.fab} onPress={() => router.push('/product/new')}>
        <Ionicons name="add" size={28} color={colors.onAccent} />
      </Pressable>
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { color: colors.textMuted, textAlign: 'center', paddingHorizontal: 32 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowText: { flex: 1 },
    thumbnail: { width: 40, height: 40, borderRadius: 8, marginRight: 12 },
    thumbnailPlaceholder: {
      width: 40,
      height: 40,
      borderRadius: 8,
      marginRight: 12,
      backgroundColor: colors.placeholderBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    name: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
    meta: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 4,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
    },
  });
}
