import { getCalendarDayDifference, getLocalDateKey } from '../utils/date';

const DEFAULT_REMINDER_CONTENT = {
  title: '행복 찾을 시간이에요!',
  body: '오늘도 행복한 하루!! 작은 행복 하나를 찾아볼까요?'
};

const getHoursUntilNextMidnight = (now) => {
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const remainingHours = (nextMidnight.getTime() - now.getTime()) / (1000 * 60 * 60);

  return Math.max(Math.ceil(remainingHours), 1);
};

export const getReminderNotificationContent = (globalStreak, now = new Date()) => {
  const currentStreak = Number.isFinite(globalStreak?.current) ? globalStreak.current : 0;
  const lastDateKey = getLocalDateKey(globalStreak?.lastDate);
  const todayKey = getLocalDateKey(now);

  if (!lastDateKey || !todayKey || currentStreak <= 0 || lastDateKey === todayKey) {
    return DEFAULT_REMINDER_CONTENT;
  }

  const diffDays = getCalendarDayDifference(lastDateKey, now);

  if (diffDays === 1) {
    const remainingHours = getHoursUntilNextMidnight(now);

    return {
      title: '오늘 행복을 이어가세요',
      body: `${remainingHours}시간 뒤면 ${currentStreak}일 기록이 사라져요!`
    };
  }

  if (diffDays > 1) {
    return {
      title: '오늘의 행복을 다시 시작해보세요',
      body: '작은 행복 하나로 새로운 연속 기록을 시작할 수 있어요.'
    };
  }

  return DEFAULT_REMINDER_CONTENT;
};
