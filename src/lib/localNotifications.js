import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const REMINDER_TITLE = '행복 찾을 시간이에요!';
const REMINDER_BODY = '오늘도 행복한 하루!! 작은 행복 하나를 찾아볼까요?';

const normalizePermissionState = (value) => {
  if (value === 'granted' || value === 'denied') {
    return value;
  }

  return 'default';
};

const parseReminderTime = (timeValue) => {
  const [rawHour = '20', rawMinute = '00'] = String(timeValue || '20:00').split(':');
  const hour = Number(rawHour);
  const minute = Number(rawMinute);

  return {
    hour: Number.isFinite(hour) ? hour : 20,
    minute: Number.isFinite(minute) ? minute : 0
  };
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

export const syncNativeReminderNotifications = async (reminders, enabled) => {
  if (!isNativeNotificationPlatform()) {
    return;
  }

  const reminderNotificationIds = reminders.map(reminder => ({
    id: createNativeReminderId(reminder.id)
  }));

  if (reminderNotificationIds.length > 0) {
    await LocalNotifications.cancel({
      notifications: reminderNotificationIds
    });
  }

  if (!enabled || reminders.length === 0) {
    return;
  }

  const permission = await checkNativeNotificationPermission();

  if (permission !== 'granted') {
    return;
  }

  await LocalNotifications.schedule({
    notifications: reminders.map(reminder => {
      const { hour, minute } = parseReminderTime(reminder.time);

      return {
        id: createNativeReminderId(reminder.id),
        title: REMINDER_TITLE,
        body: REMINDER_BODY,
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
};
