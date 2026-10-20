// database/eventRepository.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';

export type EventType = 'added' | 'restocked' | 'archived' | 'deleted';

export interface AppEvent {
  id: number;
  type: EventType;
  productId: number | null;
  productName: string;
  quantity: number | null;
  createdAt: string;
}

interface EventRow {
  id: number;
  type: EventType;
  product_id: number | null;
  product_name: string;
  quantity: number | null;
  created_at: string;
}

const LAST_SEEN_KEY = 'events:lastSeenAt';

/**
 * Records something that happened. Best-effort on purpose: a failure here
 * (offline, table missing) must never break the real action it describes.
 */
export async function logEvent(e: {
  type: EventType;
  productId: number | null;
  productName: string;
  quantity?: number | null;
}): Promise<void> {
  try {
    const { error } = await supabase.from('events').insert({
      type: e.type,
      product_id: e.productId,
      product_name: e.productName,
      quantity: e.quantity ?? null,
    });
    if (error) console.warn('Could not log event:', error.message);
  } catch (err) {
    console.warn('Could not log event:', err);
  }
}

/** Newest first. */
export async function listEvents(limit = 30): Promise<AppEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as EventRow[]).map((r) => ({
    id: r.id,
    type: r.type,
    productId: r.product_id,
    productName: r.product_name,
    quantity: r.quantity,
    createdAt: r.created_at,
  }));
}

/** When THIS phone last opened the history screen (each phone has its own). */
export async function getLastSeen(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LAST_SEEN_KEY);
  } catch {
    return null;
  }
}

export async function markEventsSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_SEEN_KEY, new Date().toISOString());
  } catch {
    // not critical
  }
}

/** How many events happened since this phone last opened the history screen. */
export async function countUnseenEvents(): Promise<number> {
  try {
    const lastSeen = await getLastSeen();
    let q = supabase.from('events').select('id', { count: 'exact', head: true });
    if (lastSeen) q = q.gt('created_at', lastSeen);
    const { count, error } = await q;
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}
