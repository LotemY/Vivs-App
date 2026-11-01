// database/notifications.ts
import { Platform } from 'react-native';
import type { Product } from '../types';
import { getConsumptionRatePerDay } from './consumption';

/** How many days before the predicted run-out date an item counts as "running low". */
export const NOTIFY_BUFFER_DAYS = 3;

/** The daily digest goes out at this hour on the PHONE'S OWN clock (so 9:00 wherever the phone is). */
export const DIGEST_HOUR = 9;

/** How many days ahead to schedule digests. Refreshed every time the app opens or data changes. */
export const DIGEST_HORIZON_DAYS = 14;

/** Birthday reminders go out at this hour (phone-local) on the day itself. */
export const BIRTHDAY_HOUR = 8;

/** One birthday. `year` is optional -- when set, the notification also says the age. */
export interface Birthday {
  name: string;
  day: number; // 1-31
  month: number; // 1-12
  year?: number; // birth year
  message: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

let handlerConfigured = false;

/**
 * Loads expo-notifications lazily, at call time, inside a try/catch.
 * This is deliberate: a plain top-level `import * as Notifications from
 * 'expo-notifications'` gets evaluated the instant ANY file that imports
 * this module loads -- which in this app means the moment the root layout
 * or any screen loads, before any of our own error handling can run. In
 * some Expo Go + Android environments that eager import itself throws,
 * which poisons the whole module graph (every route depending on this
 * file, even transitively, fails with "missing default export").
 * Requiring it lazily, only when a function here actually runs, means a
 * failure is caught right here and degrades gracefully instead of taking
 * down navigation entirely.
 */
function loadNotifications(): typeof import('expo-notifications') | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-notifications');
  } catch (err) {
    console.warn('expo-notifications unavailable in this environment:', err);
    return null;
  }
}

/**
 * Call once, e.g. from the root layout, before scheduling anything.
 * Deliberately defensive: notification setup should never be able to crash
 * the app or block navigation if something about the environment doesn't
 * cooperate -- if it fails, notifications just silently don't work, and
 * everything else in the app continues normally.
 */
export async function initNotifications(): Promise<void> {
  const Notifications = loadNotifications();
  if (!Notifications) return;

  try {
    if (!handlerConfigured) {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
      handlerConfigured = true;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Running low',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
      await Notifications.setNotificationChannelAsync('birthdays', {
        name: 'Birthdays',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing !== 'granted') {
      await Notifications.requestPermissionsAsync();
    }
  } catch (err) {
    console.warn('Notifications setup skipped:', err);
  }
}

function displayName(p: Product): string {
  return `${p.company ? `${p.company} ` : ''}${p.name}`;
}

/** The text of one digest, depending on how many items are in it. */
function buildDigestContent(names: string[]): { title: string; body: string } {
  const n = names.length;
  if (n === 1) {
    return { title: 'Time to restock?', body: `${names[0]} is running low` };
  }
  if (n <= 3) {
    return { title: `${n} items running low`, body: names.join(', ') };
  }
  return {
    title: `${n} items running low`,
    body: `${names.slice(0, 3).join(', ')} and ${n - 3} more`,
  };
}

/** The next DIGEST_HOUR:00 (phone-local) strictly after `from`. */
function nextDigestSlot(from: Date): Date {
  const slot = new Date(from);
  slot.setHours(DIGEST_HOUR, 0, 0, 0);
  if (slot.getTime() <= from.getTime()) slot.setDate(slot.getDate() + 1);
  return slot;
}

/**
 * Which digest slot an item belongs in: the last DIGEST_HOUR:00 at or before
 * the moment it enters its "running low" window (so you get a little MORE
 * warning, never less). If that slot has already passed but the window
 * hasn't opened yet, it goes into the next available slot. Items already
 * inside their window are skipped -- the app's own "Likely out" flag and
 * days-left text cover those.
 */
function digestSlotFor(product: Product, now: Date): Date | null {
  const ratePerDay = getConsumptionRatePerDay(product);
  if (ratePerDay == null || product.quantity == null || product.quantity <= 0) return null;

  const totalDurationDays = product.quantity / ratePerDay;
  const runOutMs = new Date(product.quantityUpdatedAt).getTime() + totalDurationDays * DAY_MS;
  const notifyMs = runOutMs - NOTIFY_BUFFER_DAYS * DAY_MS;
  if (notifyMs <= now.getTime()) return null;

  const slot = new Date(notifyMs);
  slot.setHours(DIGEST_HOUR, 0, 0, 0);
  if (slot.getTime() > notifyMs) slot.setDate(slot.getDate() - 1);

  const finalSlot = slot.getTime() > now.getTime() ? slot : nextDigestSlot(now);
  if (finalSlot.getTime() - now.getTime() > DIGEST_HORIZON_DAYS * DAY_MS) return null;
  return finalSlot;
}

// Two screens can ask for a reschedule at nearly the same moment (e.g. both
// tabs loading on app open). Running them strictly one after another keeps
// them from cancelling each other's freshly scheduled notifications.
let queue: Promise<void> = Promise.resolve();

/**
 * Rebuilds the whole set of upcoming digest notifications from scratch:
 * cancels everything scheduled, then schedules one notification per day that
 * has at least one item newly running low. Safe to call as often as you
 * like -- on app open, after saving a shopping session, after archiving.
 * Pass every product; archived ones (inStorage = false) are ignored here.
 */
export function rescheduleDigest(products: Product[]): Promise<void> {
  queue = queue.then(() => runReschedule(products)).catch(() => { });
  return queue;
}

async function runReschedule(products: Product[]): Promise<void> {
  const Notifications = loadNotifications();
  if (!Notifications) return;

  try {
    // Clears the old digest (and any per-product notifications from older
    // builds) -- but leaves birthday reminders alone.
    await cancelAllExceptBirthdays(Notifications);

    const now = new Date();
    const bySlot = new Map<number, { product: Product; runOutMs: number }[]>();

    for (const product of products) {
      if (!product.inStorage) continue;
      const slot = digestSlotFor(product, now);
      if (!slot) continue;

      const ratePerDay = getConsumptionRatePerDay(product) as number;
      const runOutMs =
        new Date(product.quantityUpdatedAt).getTime() +
        ((product.quantity as number) / ratePerDay) * DAY_MS;

      const key = slot.getTime();
      const group = bySlot.get(key) ?? [];
      group.push({ product, runOutMs });
      bySlot.set(key, group);
    }

    for (const [slotMs, group] of bySlot) {
      // Soonest-to-run-out first, so the most urgent names lead the message.
      group.sort((a, b) => a.runOutMs - b.runOutMs);
      const { title, body } = buildDigestContent(group.map((g) => displayName(g.product)));

      await Notifications.scheduleNotificationAsync({
        content: { title, body, data: { kind: 'digest' } },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(slotMs),
          channelId: 'default',
        },
      });
    }
  } catch (err) {
    console.warn("Couldn't schedule the digest notifications:", err);
  }
}

type NotificationsModule = typeof import('expo-notifications');

/** Cancels every scheduled notification that isn't a birthday reminder. */
async function cancelAllExceptBirthdays(Notifications: NotificationsModule): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    const kind = (n.content.data as { kind?: string } | undefined)?.kind;
    if (kind !== 'birthday') {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}

function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/** The next `count` times a birthday falls (BIRTHDAY_HOUR:00 local), skipping any that already passed. */
function upcomingBirthdays(b: Birthday, now: Date, count: number): { date: Date; turning: number | null }[] {
  const out: { date: Date; turning: number | null }[] = [];
  for (let y = now.getFullYear(); out.length < count && y <= now.getFullYear() + 3; y++) {
    // 29 Feb birthdays are celebrated on 28 Feb in non-leap years.
    const day = b.month === 2 && b.day === 29 && !isLeapYear(y) ? 28 : b.day;
    const date = new Date(y, b.month - 1, day, BIRTHDAY_HOUR, 0, 0, 0);
    if (date.getTime() > now.getTime()) {
      out.push({ date, turning: b.year != null ? y - b.year : null });
    }
  }
  return out;
}

/**
 * Rebuilds the birthday reminders from scratch: cancels the old birthday
 * ones, then schedules the next two occurrences of each birthday (so even a
 * year without opening the app still gets this year's reminder).
 */
export function rescheduleBirthdays(birthdays: Birthday[]): Promise<void> {
  queue = queue.then(() => runRescheduleBirthdays(birthdays)).catch(() => { });
  return queue;
}

async function runRescheduleBirthdays(birthdays: Birthday[]): Promise<void> {
  const Notifications = loadNotifications();
  if (!Notifications) return;

  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      const kind = (n.content.data as { kind?: string } | undefined)?.kind;
      if (kind === 'birthday') await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }

    const now = new Date();
    for (const b of birthdays) {
      for (const { date, turning } of upcomingBirthdays(b, now, 2)) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `${b.name}'s birthday today`,
            body: b.message.replace('{age}', turning != null ? String(turning) : ''),
            data: { kind: 'birthday' },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date,
            channelId: 'birthdays',
          },
        });
      }
    }
  } catch (err) {
    console.warn("Couldn't schedule the birthday reminders:", err);
  }
}

/**
 * Kept only so older imports keep compiling. Per-product notifications no
 * longer exist -- the digest is rebuilt from scratch by rescheduleDigest(),
 * which already leaves out anything archived or deleted.
 */
export async function cancelNotificationForProduct(_productId: number): Promise<void> { }

/** Kept only so older imports keep compiling; see rescheduleDigest(). */
export async function scheduleRunningLowNotification(_product: Product): Promise<void> { }
