// database/birthdaySync.ts
//
// Schedules this phone's birthday reminders from the private list in
// birthdays.local.ts. Call it when the app opens.
import { rescheduleBirthdays } from './notifications';
import { BIRTHDAYS } from './birthdays.local';

export async function syncBirthdayNotifications(): Promise<void> {
  try {
    await rescheduleBirthdays(BIRTHDAYS);
  } catch (err) {
    console.warn("Couldn't sync birthday reminders:", err);
  }
}
