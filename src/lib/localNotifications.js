import { Capacitor, registerPlugin } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { getReminderNotificationContent } from './reminderContent';

const NATIVE_REMINDER_NOTIFICATION_STORAGE_KEY = 'happy_native_reminder_notification_ids';
const NATIVE_REMINDER_NOTIFICATION_SMALL_ICON = 'ic_stat_happy_clover';
const NATIVE_REMINDER_NOTIFICATION_ICON_COLOR = '#FFFFFF';
const AppNotificationSettings = registerPlugin('AppNotificationSettings');

const normalizePermissionState = (value) => {
  if (value === 'granted' || value === 'denied') {
    return value;
  }

  return 'default';
};

const parseReminderTime = (timeValue) => {
  const [rawHour = '12', rawMinute = '00'] = String(timeValue || '12:00').split(':');
  const hour = Number(rawHour);
  const minute = Number(rawMinute);

  return {
    hour: Number.isFinite(hour) ? hour : 12,
    minute: Number.isFinite(minute) ? minute : 0
  };
};

const getNextReminderTriggerTime = (timeValue, now = new Date()) => {
  const { hour, minute } = parseReminderTime(timeValue);
  const nextTrigger = new Date(now);

  nextTrigger.setHours(hour, minute, 0, 0);

  if (nextTrigger.getTime() <= now.getTime()) {
    nextTrigger.setDate(nextTrigger.getDate() + 1);
  }

  return nextTrigger;
};

const createNativeReminderId = (reminderId) => {
  let hash = 0;

  for (let index = 0; index < reminderId.length; index += 1) {
    hash = ((hash << 5) - hash) + reminderId.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash) || 1;
};

export const isNativeNotificationPlatform = () => Capacitor.isNativePlatform();
export const isNativeAndroidNotificationPlatform = () => (
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
);

const readStoredNativeReminderNotificationIds = () => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(NATIVE_REMINDER_NOTIFICATION_STORAGE_KEY);
    const parsedValue = rawValue ? JSON.parse(rawValue) : [];

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue
      .map(value => Number(value))
      .filter(value => Number.isInteger(value) && value > 0);
  } catch {
    return [];
  }
};

const writeStoredNativeReminderNotificationIds = (notificationIds) => {
  if (typeof window === 'undefined') {
    return;
  }

  const normalizedIds = [...new Set(
    notificationIds
      .map(value => Number(value))
      .filter(value => Number.isInteger(value) && value > 0)
  )];

  if (normalizedIds.length === 0) {
    window.localStorage.removeItem(NATIVE_REMINDER_NOTIFICATION_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(
    NATIVE_REMINDER_NOTIFICATION_STORAGE_KEY,
    JSON.stringify(normalizedIds)
  );
};

export const checkNativeNotificationPermission = async () => {
  if (!isNativeNotificationPlatform()) {
    return 'unsupported';
  }

  const permissionStatus = await LocalNotifications.checkPermissions();
  return normalizePermissionState(permissionStatus.display);
};

export const requestNativeNotificationPermission = async () => {
  if (!isNativeNotificationPlatform()) {
    return 'unsupported';
  }

  const permissionStatus = await LocalNotifications.requestPermissions();
  return normalizePermissionState(permissionStatus.display);
};

export const checkNativeExactAlarmPermission = async () => {
  if (!isNativeAndroidNotificationPlatform()) {
    return 'unsupported';
  }

  const permissionStatus = await LocalNotifications.checkExactNotificationSetting();
  return normalizePermissionState(permissionStatus.exact_alarm);
};

export const openNativeExactAlarmSettings = async () => {
  if (!isNativeAndroidNotificationPlatform()) {
    return 'unsupported';
  }

  const permissionStatus = await LocalNotifications.changeExactNotificationSetting();
  return normalizePermissionState(permissionStatus.exact_alarm);
};

export const openNativeNotificationSettings = async () => {
  if (!isNativeNotificationPlatform()) {
    return false;
  }

  await AppNotificationSettings.open();
  return true;
};

export const syncNativeReminderNotifications = async (reminders, enabled, globalStreak, notificationContent) => {
  if (!isNativeNotificationPlatform()) {
    return false;
  }

  const currentReminderNotificationIds = reminders.map(reminder => createNativeReminderId(reminder.id));
  const storedReminderNotificationIds = readStoredNativeReminderNotificationIds();
  const reminderNotificationIdsToCancel = [...new Set([
    ...storedReminderNotificationIds,
    ...currentReminderNotificationIds
  ])];

  try {
    if (reminderNotificationIdsToCancel.length > 0) {
      await LocalNotifications.cancel({
        notifications: reminderNotificationIdsToCancel.map(id => ({ id }))
      });
    }

    if (!enabled || reminders.length === 0) {
      writeStoredNativeReminderNotificationIds([]);
      return true;
    }

    const permission = await checkNativeNotificationPermission();

    if (permission !== 'granted') {
      writeStoredNativeReminderNotificationIds([]);
      return false;
    }

    await LocalNotifications.schedule({
      notifications: reminders.map(reminder => {
        const { hour, minute } = parseReminderTime(reminder.time);
        const reminderContent = getReminderNotificationContent(
          globalStreak,
          getNextReminderTriggerTime(reminder.time),
          notificationContent
        );

        return {
          id: createNativeReminderId(reminder.id),
          title: reminderContent.title,
          body: reminderContent.body,
          smallIcon: NATIVE_REMINDER_NOTIFICATION_SMALL_ICON,
          iconColor: NATIVE_REMINDER_NOTIFICATION_ICON_COLOR,
          schedule: {
            on: {
              hour,
              minute
            },
            allowWhileIdle: true
          },
          extra: {
            reminderId: reminder.id
          }
        };
      })
    });

    writeStoredNativeReminderNotificationIds(currentReminderNotificationIds);
    return true;
  } catch {
    writeStoredNativeReminderNotificationIds([]);
    return false;
  }
};
