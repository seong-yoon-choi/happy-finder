export const DEFAULT_REMINDER_NOTIFICATION_TITLE = '행복을 찾을 시간이에요!';
export const DEFAULT_REMINDER_NOTIFICATION_BODY = '오늘 행복을 이어가세요.';
export const REMINDER_NOTIFICATION_TITLE_MAX_LENGTH = 60;
export const REMINDER_NOTIFICATION_BODY_MAX_LENGTH = 140;

const normalizeReminderNotificationText = (value, fallback, maxLength) => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalizedValue = value.trim().slice(0, maxLength);
  return normalizedValue || fallback;
};

export const normalizeReminderNotificationContent = (content = {}) => ({
  title: normalizeReminderNotificationText(
    content.title ?? content.notificationTitle,
    DEFAULT_REMINDER_NOTIFICATION_TITLE,
    REMINDER_NOTIFICATION_TITLE_MAX_LENGTH
  ),
  body: normalizeReminderNotificationText(
    content.body ?? content.notificationBody,
    DEFAULT_REMINDER_NOTIFICATION_BODY,
    REMINDER_NOTIFICATION_BODY_MAX_LENGTH
  )
});

export const getReminderNotificationContent = (globalStreak, now = new Date(), content = {}) => {
  void now;

  const notificationContent = normalizeReminderNotificationContent(content);

  return {
    title: notificationContent.title,
    body: notificationContent.body
  };
};
