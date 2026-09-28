// app/(tabs)/index.tsx
import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { listProducts, deleteProduct, listCategoryColors } from '../../database/productRepository';
import { cancelNotificationForProduct } from '../../database/notifications';
import { deleteProductPhoto } from '../../database/photoUpload';
import { getPricePerReference } from '../../database/pricing';
import { useTheme } from '../../theme/ThemeContext';
import { PhotoViewer } from '../../components/PhotoViewer';
import type { ThemeColors } from '../../theme/colors';
import type { Product } from '../../types';

export default function ProductsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null); // null = "All"
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({});

  // #5: full-size photo viewer state
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [data, colorMap] = await Promise.all([listProducts(), listCategoryColors()]);
    setProducts(data);
    setCategoryColors(colorMap);
    setLoading(false);
  }, []);

  // Reload every time this tab regains focus (e.g. after add/edit/delete)
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Every category actually in use right now, alphabetically -- the filter
  // bar is fully dynamic, not a fixed list.
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      if (p.category) set.add(p.category);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [products]);

  // Essential items always float to the top; within that, sorted by name.
  // Scoped to whichever category filter is selected (or everything, for "All").
  const visibleProducts = useMemo(() => {
    const filtered = categoryFilter
      ? products.filter((p) => p.category === categoryFilter)
      : products;
    return [...filtered].sort((a, b) => {
      if (a.isEssential !== b.isEssential) return a.isEssential ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [products, categoryFilter]);

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
      {categories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterRow}
        >
          <FilterPill
            label="All"
            active={categoryFilter === null}
            onPress={() => setCategoryFilter(null)}
            colors={colors}
          />
          {categories.map((c) => (
            <FilterPill
              key={c}
              label={c}
              active={categoryFilter === c}
              onPress={() => setCategoryFilter(c)}
              pillColor={categoryColors[c]}
              colors={colors}
            />
          ))}
          {/* Explicit trailing spacer -- guarantees breathing room after the
              last pill even if contentContainerStyle padding alone doesn't
              get honored (a known quirk when combined with `gap` on some
              RN/Yoga versions). This is what actually fixes the cut-off. */}
          <View style={styles.filterEndSpacer} />
        </ScrollView>
      )}

      <FlatList
        data={visibleProducts}
        keyExtractor={(item) => String(item.id)}
        refreshing={loading}
        onRefresh={load}
        contentContainerStyle={visibleProducts.length === 0 && styles.emptyContainer}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {categoryFilter
              ? `No products in "${categoryFilter}" yet.`
              : 'No products yet. Tap + to add your first one.'}
          </Text>
        }
        renderItem={({ item }) => {
          const catColor = item.category ? categoryColors[item.category] : undefined;
          // #7: normalized price-per-reference (e.g. "1.20 € per 100g")
          // instead of the old flat price / unitsPerPack division.
          const pricePerReference = getPricePerReference({
            price: item.price,
            unitsPerPack: item.unitsPerPack,
            packUnitType: item.packUnitType,
          });

          return (
            <Pressable
              style={styles.row}
              onPress={() => router.push(`/product/${item.id}`)}
              onLongPress={() => confirmDelete(item)}
            >
              {/* #5: tap the thumbnail to view it full-size (long-press still deletes) */}
              <Pressable onPress={() => item.photoUrl && setViewingPhoto(item.photoUrl)}>
                {item.photoUrl ? (
                  <Image source={{ uri: item.photoUrl }} style={styles.thumbnail} />
                ) : (
                  <View style={styles.thumbnailPlaceholder}>
                    <Ionicons name="image-outline" size={18} color={colors.textMuted} />
                  </View>
                )}
              </Pressable>
              <View style={styles.rowText}>
                <View style={styles.nameRow}>
                  {item.isEssential && (
                    <Ionicons name="star" size={13} color={colors.accent} style={styles.star} />
                  )}
                  {/* #6: company + name shown together */}
                  <Text style={[styles.name, !item.inStorage && styles.nameArchived]}>
                    {item.company ? `${item.company} ` : ''}
                    {item.name}
                  </Text>
                  {!item.inStorage && (
                    <Text style={styles.archivedTag}>Archived</Text>
                  )}
                </View>
                <Text style={styles.meta}>
                  {item.category ? (
                    <Text style={catColor ? { color: catColor } : undefined}>
                      {item.category}
                    </Text>
                  ) : null}
                  {item.category ? '  ·  ' : ''}
                  {item.unit ?? 'no unit'}
                  {item.price != null ? `  ·  ${item.price.toFixed(2)} €` : ''}
                  {pricePerReference ? `  (${pricePerReference})` : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </Pressable>
          );
        }}
      />

      <Pressable style={styles.fab} onPress={() => router.push('/product/new')}>
        <Ionicons name="add" size={28} color={colors.onAccent} />
      </Pressable>

      <PhotoViewer uri={viewingPhoto} onClose={() => setViewingPhoto(null)} />
    </View>
  );
}

function FilterPill({
  label,
  active,
  onPress,
  pillColor,
  colors,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  pillColor?: string;
  colors: ThemeColors;
}) {
  const styles = makeStyles(colors);
  const customStyle = pillColor
    ? { borderColor: pillColor, backgroundColor: active ? pillColor : undefined }
    : undefined;
  return (
    <Pressable
      style={[
        styles.filterPill,
        active && !pillColor && { backgroundColor: colors.accent, borderColor: colors.accent },
        customStyle,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.filterPillText,
          active && { color: colors.onAccent },
          pillColor && !active ? { color: pillColor } : undefined,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    filterScroll: { flexGrow: 0, height: 48 },
    filterRow: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 6,
      paddingRight: 8, // small base padding; filterEndSpacer below does the real work
    },
    filterEndSpacer: { width: 24 },
    filterPill: {
      flexShrink: 0, // never let a pill's own width get squeezed by the row
      paddingHorizontal: 14,
      paddingVertical: 5,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterPillText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
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
    nameRow: { flexDirection: 'row', alignItems: 'center' },
    star: { marginRight: 4 },
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
    nameArchived: { color: colors.textMuted },
    archivedTag: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.textMuted,
      marginLeft: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      textTransform: 'uppercase',
    },
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
