// app/history.tsx  (a stack screen opened by the bell)
import { useCallback, useState } from 'react';
import { View, Text, SectionList, StyleSheet } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { listProducts } from '../database/productRepository';
import { getDaysRemaining } from '../database/consumption';
import { NOTIFY_BUFFER_DAYS } from '../database/notifications';
import { listEvents, markEventsSeen, type AppEvent } from '../database/eventRepository';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import type { Product } from '../types';

type Row =
  | { kind: 'low'; key: string; name: string; text: string }
  | { kind: 'event'; key: string; event: AppEvent };

const EVENT_ICON: Record<AppEvent['type'], keyof typeof Ionicons.glyphMap> = {
  added: 'add-circle-outline',
  restocked: 'cart-outline',
  archived: 'archive-outline',
  deleted: 'trash-outline',
};

function eventText(e: AppEvent): string {
  switch (e.type) {
    case 'added':
      return `${e.productName} was added`;
    case 'restocked':
      return `Bought ${e.quantity ?? ''} ${e.productName}`.replace('  ', ' ');
    case 'archived':
      return `${e.productName} ran out and was archived`;
    case 'deleted':
      return `${e.productName} was deleted`;
  }
}

function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function HistoryScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [low, setLow] = useState<Row[]>([]);
  const [events, setEvents] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const [products, evs] = await Promise.all([listProducts(), listEvents()]);
      const lowRows: Row[] = products
        .filter((p: Product) => p.inStorage)
        .map((p) => ({ p, d: getDaysRemaining(p) }))
        .filter((x) => x.d != null && x.d <= NOTIFY_BUFFER_DAYS && (x.p.quantity ?? 0) > 0)
        .sort((a, b) => (a.d as number) - (b.d as number))
        .map(({ p, d }) => ({
          kind: 'low' as const,
          key: `low-${p.id}`,
          name: `${p.company ? `${p.company} ` : ''}${p.name}`,
          text: (d as number) <= 0 ? 'likely out' : `${d}d left`,
        }));
      setLow(lowRows);
      setEvents(evs.map((event) => ({ kind: 'event' as const, key: `ev-${event.id}`, event })));
      markEventsSeen(); // clears the bell's badge on this phone
    } catch (err) {
      console.warn('Could not load history:', err);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const sections = [
    ...(low.length ? [{ title: 'Running low now', data: low }] : []),
    { title: 'History', data: events },
  ];

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(r) => r.key}
        refreshing={loading}
        onRefresh={load}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionTitle}>{section.title}</Text>
        )}
        renderItem={({ item }) =>
          item.kind === 'low' ? (
            <View style={styles.row}>
              <Ionicons name="alert-circle-outline" size={20} color="#f5a623" />
              <Text style={styles.rowText}>{item.name}</Text>
              <Text style={styles.when}>{item.text}</Text>
            </View>
          ) : (
            <View style={styles.row}>
              <Ionicons name={EVENT_ICON[item.event.type]} size={20} color={colors.textSecondary} />
              <Text style={styles.rowText}>{eventText(item.event)}</Text>
              <Text style={styles.when}>{timeAgo(item.event.createdAt)}</Text>
            </View>
          )
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            {failed ? "Couldn't load history. Pull down to retry." : 'Nothing yet.'}
          </Text>
        }
        ListFooterComponent={
          !failed && events.length === 0 && !loading ? (
            <Text style={styles.empty}>Nothing has happened yet — buying, adding and archiving will show up here.</Text>
          ) : null
        }
      />
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 6,
      backgroundColor: colors.background,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowText: { flex: 1, fontSize: 15, color: colors.textPrimary },
    when: { fontSize: 12, color: colors.textMuted },
    empty: { color: colors.textMuted, textAlign: 'center', padding: 32 },
  });
}
