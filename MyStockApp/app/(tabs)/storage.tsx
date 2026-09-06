// app/(tabs)/storage.tsx
import { useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { listProducts, updateProductQuantities } from '../../database/productRepository';
import { getEffectiveQuantity, getDaysRemaining } from '../../database/consumption';
import type { Product } from '../../types';

/** Local, unsaved quantity for one product while a shopping session is active. */
interface SessionEntry {
  start: number; // value when the session began -- used to detect "changed" rows
  current: number; // live value as +/- are tapped
}

export default function StorageScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // null = not in shopping mode. Present = { [productId]: SessionEntry }
  const [session, setSession] = useState<Record<number, SessionEntry> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await listProducts();
    data.sort(
      (a, b) => (getEffectiveQuantity(a) ?? Infinity) - (getEffectiveQuantity(b) ?? Infinity)
    );
    setProducts(data);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Always land back on the clean, read-only view when this tab regains focus.
      setSession(null);
      load();
    }, [load])
  );

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
    const changes = Object.entries(session)
      .map(([id, entry]) => ({ id: Number(id), ...entry }))
      .filter((e) => e.current !== e.start)
      .map((e) => ({ id: e.id, quantity: e.current }));

    if (changes.length === 0) {
      setSession(null);
      return;
    }

    setSaving(true);
    try {
      await updateProductQuantities(changes);
      setSession(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  const shopping = session != null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {!shopping && (
          <Pressable style={styles.shopButton} onPress={startShopping}>
            <Ionicons name="cart-outline" size={16} color="#2563eb" />
            <Text style={styles.shopButtonText}>Go shopping</Text>
          </Pressable>
        )}
      </View>

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
          const entry = session?.[item.id];
          const changed = entry != null && entry.current !== entry.start;
          const displayQuantity = entry ? entry.current : getEffectiveQuantity(item);
          const daysLeft = getDaysRemaining(item);

          return (
            <View style={[styles.row, changed && styles.rowChanged]}>
              <View style={styles.rowText}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.sub}>
                  {daysLeft == null ? 'no rate set' : daysLeft <= 0 ? 'out soon' : `${daysLeft}d left`}
                </Text>
              </View>

              {shopping ? (
                <View style={styles.stepper}>
                  <Pressable
                    style={styles.stepperButton}
                    onPress={() => adjust(item.id, -1)}
                    accessibilityLabel={`Decrease ${item.name} quantity`}
                  >
                    <Ionicons name="remove" size={16} color="#333" />
                  </Pressable>
                  <Text style={[styles.quantity, changed && styles.quantityChanged]}>
                    {displayQuantity}
                  </Text>
                  <Pressable
                    style={styles.stepperButton}
                    onPress={() => adjust(item.id, 1)}
                    accessibilityLabel={`Increase ${item.name} quantity`}
                  >
                    <Ionicons name="add" size={16} color="#333" />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 8,
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
    borderColor: '#2563eb',
  },
  shopButtonText: { color: '#2563eb', fontWeight: '600', fontSize: 14 },
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
  rowChanged: { backgroundColor: '#eff6ff' },
  rowText: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600' },
  sub: { fontSize: 12, color: '#999', marginTop: 2 },
  quantity: { fontSize: 17, fontWeight: '600', color: '#444', minWidth: 24, textAlign: 'center' },
  quantityChanged: { color: '#2563eb' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepperButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBar: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  saveBarButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  discardButton: { borderWidth: StyleSheet.hairlineWidth, borderColor: '#ccc' },
  discardButtonText: { color: '#444', fontWeight: '600' },
  saveButton: { backgroundColor: '#2563eb' },
  saveButtonText: { color: 'white', fontWeight: '600' },
});
