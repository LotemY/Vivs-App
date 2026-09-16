// app/(tabs)/storage.tsx
import { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Image, ScrollView } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { listProducts, getProduct, applyShoppingChanges, listAllRestockLogs } from '../../database/productRepository';
import { getEffectiveQuantity, getDaysRemaining, getConsumptionRatePerDay } from '../../database/consumption';
import { computeAverageRestockDays } from '../../database/restockStats';
import { scheduleRunningLowNotification } from '../../database/notifications';
import { useTheme } from '../../theme/ThemeContext';
import type { ThemeColors } from '../../theme/colors';
import type { Product, RestockLogEntry } from '../../types';

/** Local, unsaved quantity for one product while a shopping session is active. */
interface SessionEntry {
  start: number; // value when the session began -- used to detect "changed" rows
  current: number; // live value as +/- are tapped
}

export default function StorageScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [products, setProducts] = useState<Product[]>([]);
  const [avgRestockDays, setAvgRestockDays] = useState<Record<number, number | null>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null); // null = "All"
  // null = not in shopping mode. Present = { [productId]: SessionEntry }
  const [session, setSession] = useState<Record<number, SessionEntry> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [data, allLogs] = await Promise.all([listProducts(), listAllRestockLogs()]);

    const logsByProduct: Record<number, RestockLogEntry[]> = {};
    for (const log of allLogs) {
      (logsByProduct[log.productId] ??= []).push(log);
    }
    const averages: Record<number, number | null> = {};
    for (const p of data) {
      averages[p.id] = computeAverageRestockDays(logsByProduct[p.id] ?? []);
    }

    setProducts(data);
    setAvgRestockDays(averages);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Always land back on the clean, read-only view when this tab regains focus.
      setSession(null);
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

  // Essential items always float to the top; within that, lowest effective
  // quantity first (closest to running out). Scoped to whichever category
  // filter is selected (or everything, for "All").
  const visibleProducts = useMemo(() => {
    const filtered = categoryFilter
      ? products.filter((p) => p.category === categoryFilter)
      : products;
    return [...filtered].sort((a, b) => {
      if (a.isEssential !== b.isEssential) return a.isEssential ? -1 : 1;
      return (getEffectiveQuantity(a) ?? Infinity) - (getEffectiveQuantity(b) ?? Infinity);
    });
  }, [products, categoryFilter]);

  function startShopping() {
    const initial: Record<number, SessionEntry> = {};
    for (const p of products) {
      const value = getEffectiveQuantity(p) ?? 0;
      initial[p.id] = { start: value, current: value };
    }
    setSession(initial);
  }

  function adjust(id: number, delta: number) {
    setSession((prev) => {
      if (!prev) return prev;
      const entry = prev[id];
      const next = Math.max(0, entry.current + delta);
      return { ...prev, [id]: { ...entry, current: next } };
    });
  }

  function discard() {
    setSession(null);
  }

  async function save() {
    if (!session) return;
    const changes = products
      .map((product) => {
        const entry = session[product.id];
        return entry ? { product, newQuantity: entry.current } : null;
      })
      .filter(
        (c): c is { product: Product; newQuantity: number } =>
          c != null && c.newQuantity !== (c.product.quantity ?? 0)
      );

    if (changes.length === 0) {
      setSession(null);
      return;
    }

    setSaving(true);
    try {
      await applyShoppingChanges(changes);
      setSession(null);

      // Reschedule notifications using the freshly-updated rate/quantity/
      // timestamp for exactly the products that changed -- not the stale
      // in-memory objects from before the save.
      const updatedProducts = await Promise.all(
        changes.map((c) => getProduct(c.product.id))
      );
      await Promise.all(
        updatedProducts
          .filter((p): p is Product => p != null)
          .map((p) => scheduleRunningLowNotification(p))
      );

      await load();
    } finally {
      setSaving(false);
    }
  }

  const shopping = session != null;

  return (
    <View style={styles.container}>
      {!shopping && categories.length > 0 && (
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
              colors={colors}
            />
          ))}
        </ScrollView>
      )}

      {!shopping && (
        <View style={styles.header}>
          <Pressable style={styles.shopButton} onPress={startShopping}>
            <Ionicons name="cart-outline" size={16} color={colors.accent} />
            <Text style={styles.shopButtonText}>Go shopping</Text>
          </Pressable>
        </View>
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
              ? `Nothing in "${categoryFilter}" yet.`
              : 'Nothing to show yet — add products from the Products tab.'}
          </Text>
        }
        renderItem={({ item }) => {
          const entry = session?.[item.id];
          const changed = entry != null && entry.current !== entry.start;
          const displayQuantity = entry ? entry.current : getEffectiveQuantity(item);
          const daysLeft = getDaysRemaining(item);
          const avgDays = avgRestockDays[item.id];
          const ratePerDay = getConsumptionRatePerDay(item);

          const daysLeftText =
            daysLeft == null ? 'no rate set' : daysLeft <= 0 ? 'out soon' : `${daysLeft}d left`;
          const avgText = avgDays != null ? ` · avg ${Math.round(avgDays)}d cycle` : '';
          const rateText = ratePerDay != null ? ` · ${ratePerDay.toFixed(1)}/day` : '';

          return (
            <View style={[styles.row, changed && styles.rowChanged]}>
              {item.photoUrl ? (
                <Image source={{ uri: item.photoUrl }} style={styles.thumbnail} />
              ) : (
                <View style={styles.thumbnailPlaceholder}>
                  <Ionicons name="image-outline" size={18} color={colors.textMuted} />
                </View>
              )}
              <View style={styles.rowText}>
                <View style={styles.nameRow}>
                  {item.isEssential && (
                    <Ionicons name="star" size={13} color={colors.accent} style={styles.star} />
                  )}
                  <Text style={styles.name}>{item.name}</Text>
                </View>
                <Text style={styles.sub}>
                  {item.category ? `${item.category} · ` : ''}
                  {daysLeftText}
                  {rateText}
                  {avgText}
                </Text>
              </View>

              {shopping ? (
                <View style={styles.stepper}>
                  <Pressable
                    style={styles.stepperButton}
                    onPress={() => adjust(item.id, -1)}
                    accessibilityLabel={`Decrease ${item.name} quantity`}
                  >
                    <Ionicons name="remove" size={16} color={colors.textPrimary} />
                  </Pressable>
                  <Text style={[styles.quantity, changed && styles.quantityChanged]}>
                    {displayQuantity}
                  </Text>
                  <Pressable
                    style={styles.stepperButton}
                    onPress={() => adjust(item.id, 1)}
                    accessibilityLabel={`Increase ${item.name} quantity`}
                  >
                    <Ionicons name="add" size={16} color={colors.textPrimary} />
                  </Pressable>
                </View>
              ) : (
                <Text style={styles.quantity}>{displayQuantity ?? '—'}</Text>
              )}
            </View>
          );
        }}
      />

      {shopping && (
        <View style={styles.saveBar}>
          <Pressable style={[styles.saveBarButton, styles.discardButton]} onPress={discard}>
            <Text style={styles.discardButtonText}>Discard</Text>
          </Pressable>
          <Pressable
            style={[styles.saveBarButton, styles.saveButton]}
            onPress={save}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save changes'}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function FilterPill({
  label,
  active,
  onPress,
  colors,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: ThemeColors;
}) {
  const styles = makeStyles(colors);
  return (
    <Pressable
      style={[styles.filterPill, active && { backgroundColor: colors.accent, borderColor: colors.accent }]}
      onPress={onPress}
    >
      <Text style={[styles.filterPillText, active && { color: colors.onAccent }]}>{label}</Text>
    </Pressable>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    filterScroll: { flexGrow: 0 },
    filterRow: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 4,
    },
    filterPill: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    filterPillText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
    header: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: 16,
      paddingTop: 6,
      paddingBottom: 4,
    },
    shopButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.accent,
    },
    shopButtonText: { color: colors.accent, fontWeight: '600', fontSize: 14 },
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
    rowChanged: { backgroundColor: colors.changedRowBg },
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
    rowText: { flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center' },
    star: { marginRight: 4 },
    name: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
    sub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    quantity: {
      fontSize: 17,
      fontWeight: '600',
      color: colors.textSecondary,
      minWidth: 24,
      textAlign: 'center',
    },
    quantityChanged: { color: colors.accent },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    stepperButton: {
      width: 30,
      height: 30,
      borderRadius: 15,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveBar: {
      flexDirection: 'row',
      gap: 8,
      padding: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
    },
    saveBarButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    discardButton: { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
    discardButtonText: { color: colors.textSecondary, fontWeight: '600' },
    saveButton: { backgroundColor: colors.accent },
    saveButtonText: { color: colors.onAccent, fontWeight: '600' },
  });
}
