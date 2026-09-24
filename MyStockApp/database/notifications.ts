// database/notifications.ts
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Product } from '../types';
import { getConsumptionRatePerDay } from './consumption';

/** How many days before the predicted run-out date to notify. */
export const NOTIFY_BUFFER_DAYS = 3;

const STORAGE_KEY_PREFIX = 'notif:';

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

function storageKey(productId: number): string {
  return `${STORAGE_KEY_PREFIX}${productId}`;
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
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing !== 'granted') {
      await Notifications.requestPermissionsAsync();
    }
  } catch (err) {
    console.warn('Notifications setup skipped:', err);
  }
}

/**
 * (Re)schedules the "running low" notification for one product, based on
 * its current quantity, quantityUpdatedAt, and consumption rate.
 * Cancels any previously scheduled notification for this product first, so
 * this is always safe to call again after any change -- creation, or a
 * shopping-mode correction that shifts the predicted run-out date.
 * No-ops (after cancelling any stale one) if there's no rate configured,
 * no quantity, the predicted notify date has already passed, or
 * notifications aren't available in this environment.
 */
export async function scheduleRunningLowNotification(product: Product): Promise<void> {
  const Notifications = loadNotifications();
  if (!Notifications) return;

  try {
    await cancelNotificationForProduct(product.id);

    const ratePerDay = getConsumptionRatePerDay(product);
    if (ratePerDay == null || product.quantity == null || product.quantity <= 0) {
      return;
    }

    const totalDurationDays = product.quantity / ratePerDay;
    const updatedAt = new Date(product.quantityUpdatedAt);
    const runOutDate = new Date(updatedAt.getTime() + totalDurationDays * 24 * 60 * 60 * 1000);
    const notifyDate = new Date(runOutDate.getTime() - NOTIFY_BUFFER_DAYS * 24 * 60 * 60 * 1000);
    console.log(`[notif] ${product.name}: rate=${ratePerDay}/day, runOut=${runOutDate}, notifyDate=${notifyDate}, now=${new Date()}`);
    if (notifyDate.getTime() <= Date.now()) {
      // Already within (or past) the buffer window -- nothing to schedule
      // for the future. The app's own "out soon" display already covers this.
      return;
    }

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${product.name} is running low`,
        body: `About ${NOTIFY_BUFFER_DAYS} days left at your usual rate — might be time to restock.`,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: notifyDate,
        channelId: 'default',
      },
    });

    await AsyncStorage.setItem(storageKey(product.id), identifier);
  } catch (err) {
    console.warn(`Couldn't schedule notification for product ${product.id}:`, err);
  }
}

export async function cancelNotificationForProduct(productId: number): Promise<void> {
  const key = storageKey(productId);
  const Notifications = loadNotifications();

  if (!Notifications) {
    // Still clear our local record even if the library itself is unavailable.
    await AsyncStorage.removeItem(key).catch(() => {});
    return;
  }

  try {
    const identifier = await AsyncStorage.getItem(key);
    if (identifier) {
      await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {
        // Already fired or cancelled -- fine, just clear our record of it.
      });
      await AsyncStorage.removeItem(key);
    }
  } catch (err) {
    console.warn(`Couldn't cancel notification for product ${productId}:`, err);
  }
}
