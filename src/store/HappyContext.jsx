/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { getCalendarDayDifference, getLocalDateKey } from '../utils/date';
import { getTreeInfo } from '../utils/progress';
import {
  checkNativeNotificationPermission,
  isNativeNotificationPlatform,
  requestNativeNotificationPermission,
  syncNativeReminderNotifications
} from '../lib/localNotifications';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getAppRedirectUrl } from '../lib/routes';

const LOCAL_CREATOR_ID = 'local-user';
const DEFAULT_REMINDER_TIME = '20:00';

const createReminderId = () => `reminder_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const createReminderItem = (time = DEFAULT_REMINDER_TIME, overrides = {}) => ({
  id: overrides.id || createReminderId(),
  time: typeof time === 'string' ? time : DEFAULT_REMINDER_TIME,
  lastTriggeredDate: typeof overrides.lastTriggeredDate === 'string' ? overrides.lastTriggeredDate : null
});

const defaultReminderSettings = {
  enabled: false,
  reminders: [createReminderItem(DEFAULT_REMINDER_TIME, { id: 'default-reminder' })]
};
const defaultAuthFeedback = {
  type: 'idle',
  message: ''
};
const AUTH_MODE_STORAGE_KEY = 'happy_auth_mode';
const APP_STORAGE_KEYS = [
  'happy_items',
  'happy_stamps',
  'happy_favorites',
  'happy_memos',
  'happy_theme',
  'happy_streak',
  'happy_reminder'
];
const defaultCloudSyncStatus = {
  type: 'idle',
  message: '',
  lastSyncedAt: null
};
const CLOUD_SNAPSHOT_TABLE = 'happy_user_snapshots';
const DELETE_ACCOUNT_FUNCTION_NAME = 'delete-account';
const createTemporarySignupPassword = () => (
  `temp_${Math.random().toString(36).slice(2, 10)}_${Date.now()}Aa1!`
);

const initialItems = [
  {
    id: 'h1',
    title: '길고양이 찾기',
    description: '귀여운 길고양이를 찾아서 행복해져 보세요!',
    category: '소확행',
    isCustom: false,
    creator: 'system',
    totalEnjoyCount: 24
  },
  {
    id: 'h2',
    title: '풀냄새 맡기',
    description: '평소에 맡기 힘들었던 산뜻한 풀냄새로 기분을 행복하게 해보세요.',
    category: '소확행',
    isCustom: false,
    creator: 'system',
    totalEnjoyCount: 19
  },
  {
    id: 'h3',
    title: '따뜻한 커피 한 잔',
    description: '여유롭게 마시는 커피 한 잔의 향기를 즐겨보세요.',
    category: '소확행',
    isCustom: false,
    creator: 'system',
    totalEnjoyCount: 31
  },
  {
    id: 'h4',
    title: '좋아하는 음악 듣기',
    description: '하루를 마무리하며 좋아하는 노래를 감상하세요.',
    category: '소확행',
    isCustom: false,
    creator: 'system',
    totalEnjoyCount: 22
  },
  {
    id: 'h5',
    title: '맛있는 주말 브런치',
    description: '일주일에 한 번, 나를 위한 맛있는 식사를 대접하세요.',
    category: '일주일행복',
    isCustom: false,
    creator: 'system',
    totalEnjoyCount: 17
  },
  {
    id: 'h6',
    title: '새로운 곳 산책하기',
    description: '이번 주는 가보지 않았던 새로운 길을 걸어보세요.',
    category: '일주일행복',
    isCustom: false,
    creator: 'system',
    totalEnjoyCount: 14
  },
  {
    id: 'h7',
    title: '책 한 권 다 읽기',
    description: '한 달간 조금씩 읽어 책 한 권을 완독하는 성취감을 느껴보세요.',
    category: '한달행복',
    isCustom: false,
    creator: 'system',
    totalEnjoyCount: 11
  },
  {
    id: 'h8',
    title: '나만의 여행 떠나기',
    description: '한 달에 하루, 오롯이 나를 위한 당일치기 여행을 다녀오세요.',
    category: '한달행복',
    isCustom: false,
    creator: 'system',
    totalEnjoyCount: 9
  },
  {
    id: 'h9',
    title: '창문 열고 바람 쐬기',
    description: '잠깐 창문을 열고 시원한 바람을 느끼며 머리를 환기해보세요.',
    category: '소확행',
    isCustom: false,
    creator: 'system',
    totalEnjoyCount: 16
  },
  {
    id: 'h10',
    title: '좋아하는 간식 하나 사기',
    description: '작지만 확실한 만족을 주는 간식 하나로 오늘을 더 달콤하게 만들어보세요.',
    category: '소확행',
    isCustom: false,
    creator: 'system',
    totalEnjoyCount: 21
  },
  {
    id: 'h11',
    title: '하늘 사진 찍기',
    description: '오늘의 하늘을 찍어두고 잠깐 멈춰 서서 계절의 분위기를 느껴보세요.',
    category: '소확행',
    isCustom: false,
    creator: 'system',
    totalEnjoyCount: 13
  },
  {
    id: 'h12',
    title: '햇살 아래 10분 걷기',
    description: '잠깐이라도 햇살을 받으며 걷다 보면 몸과 마음이 조금 가벼워질 거예요.',
    category: '소확행',
    isCustom: false,
    creator: 'system',
    totalEnjoyCount: 18
  },
  {
    id: 'h13',
    title: '가보고 싶던 카페 가기',
    description: '이번 주엔 저장만 해둔 카페에 직접 가서 새로운 기분을 만나보세요.',
    category: '일주일행복',
    isCustom: false,
    creator: 'system',
    totalEnjoyCount: 12
  },
  {
    id: 'h14',
    title: '영화 한 편 제대로 보기',
    description: '한 주에 한 번은 좋아하는 영화나 보고 싶던 작품에 집중해보세요.',
    category: '일주일행복',
    isCustom: false,
    creator: 'system',
    totalEnjoyCount: 15
  },
  {
    id: 'h15',
    title: '꽃 한 송이 두기',
    description: '책상이나 방에 꽃 한 송이를 두면 일주일의 분위기가 달라질 수 있어요.',
    category: '일주일행복',
    isCustom: false,
    creator: 'system',
    totalEnjoyCount: 8
  },
  {
    id: 'h16',
    title: '주말 아침 천천히 시작하기',
    description: '알람에 쫓기지 않고 여유롭게 아침을 시작하는 시간도 큰 행복이에요.',
    category: '일주일행복',
    isCustom: false,
    creator: 'system',
    totalEnjoyCount: 11
  },
  {
    id: 'h17',
    title: '작은 목표 하나 완성하기',
    description: '한 달 안에 끝낼 수 있는 목표 하나를 정하고 마무리하는 성취를 느껴보세요.',
    category: '한달행복',
    isCustom: false,
    creator: 'system',
    totalEnjoyCount: 10
  },
  {
    id: 'h18',
    title: '나만의 플레이리스트 만들기',
    description: '한 달 동안 들을 곡을 골라 나만의 플레이리스트를 완성해보세요.',
    category: '한달행복',
    isCustom: false,
    creator: 'system',
    totalEnjoyCount: 7
  },
  {
    id: 'h19',
    title: '감사 기록 남기기',
    description: '한 달 동안 감사했던 순간을 모아보면 예상보다 많은 행복이 보일 거예요.',
    category: '한달행복',
    isCustom: false,
    creator: 'system',
    totalEnjoyCount: 6
  },
  {
    id: 'h20',
    title: '사진첩 정리하며 추억 보기',
    description: '미뤄둔 사진을 정리하며 지나온 좋은 순간들을 천천히 돌아보세요.',
    category: '한달행복',
    isCustom: false,
    creator: 'system',
    totalEnjoyCount: 9
  }
];

const readStoredJson = (key, fallback) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
};

const hasPasswordRecoveryInUrl = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  const searchParams = new URLSearchParams(window.location.search);

  if (searchParams.get('type') === 'recovery') {
    return true;
  }

  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;
  const hashParams = new URLSearchParams(hash);

  return hashParams.get('type') === 'recovery';
};

const clearAuthRedirectState = () => {
  if (typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);
  const removableKeys = ['type', 'access_token', 'refresh_token', 'expires_in', 'expires_at', 'token_type'];

  removableKeys.forEach(key => {
    url.searchParams.delete(key);
  });

  url.hash = '';
  window.history.replaceState({}, '', `${url.pathname}${url.search}`);
};

const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const getStampCountFromData = (data) => {
  if (typeof data === 'number') {
    return data;
  }

  return data?.count || 0;
};

const getTotalStampCount = (stamps) => Object.values(stamps).reduce((sum, data) => {
  return sum + getStampCountFromData(data);
}, 0);

const normalizeMemo = (memo) => {
  const createdAt = typeof memo?.createdAt === 'string' ? memo.createdAt : new Date().toISOString();
  const updatedAt = typeof memo?.updatedAt === 'string' ? memo.updatedAt : createdAt;

  return {
    ...memo,
    createdAt,
    updatedAt
  };
};

const getCurrentTimeKey = (value = new Date()) => {
  const hours = String(value.getHours()).padStart(2, '0');
  const minutes = String(value.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const normalizeReminderItem = (value, fallbackId) => {
  if (!isRecord(value)) {
    return createReminderItem(DEFAULT_REMINDER_TIME, { id: fallbackId });
  }

  return createReminderItem(
    typeof value.time === 'string' ? value.time : DEFAULT_REMINDER_TIME,
    {
      id: typeof value.id === 'string' && value.id.trim() ? value.id : fallbackId,
      lastTriggeredDate: typeof value.lastTriggeredDate === 'string' ? value.lastTriggeredDate : null
    }
  );
};

const createStreakCelebration = (dayCount) => ({
  icon: '🔥',
  title: `${dayCount}일째 행복을 찾으셨군요!!`,
  message: '오늘도 행복한 하루!!'
});

const createReminderCelebration = () => ({
  icon: '⏰',
  title: '행복 찾을 시간이에요!',
  message: '오늘도 행복한 하루!! 작은 행복 하나를 찾아볼까요?'
});

const initialItemCountMap = initialItems.reduce((acc, item) => {
  acc[item.id] = item.totalEnjoyCount || 0;
  return acc;
}, {});

const getCreatorIdsForCurrentUser = (authUser) => {
  const creatorIds = new Set([LOCAL_CREATOR_ID]);

  if (typeof authUser?.id === 'string' && authUser.id) {
    creatorIds.add(authUser.id);
  }

  return creatorIds;
};

const isOwnedByCurrentUser = (item, authUser) => (
  getCreatorIdsForCurrentUser(authUser).has(item?.creatorId)
  || (item?.isCustom && item?.creator === 'user' && !item?.creatorId)
);

const getKoreanAuthErrorMessage = (error, fallbackMessage) => {
  const rawMessage = typeof error?.message === 'string' ? error.message.trim() : '';
  const message = rawMessage.toLowerCase();

  if (!rawMessage) {
    return fallbackMessage;
  }

  if (message.includes('invalid login credentials')) {
    return '이메일 또는 비밀번호가 올바르지 않아요.';
  }

  if (message.includes('email not confirmed')) {
    return '이메일 인증을 완료한 뒤 로그인해주세요.';
  }

  if (message.includes('user already registered')) {
    return '이미 가입된 이메일이에요. 로그인해주세요.';
  }

  if (message.includes('otp') && message.includes('expired')) {
    return '인증번호가 만료됐어요. 다시 받아주세요.';
  }

  if (
    (message.includes('otp') && message.includes('invalid'))
    || message.includes('token has expired or is invalid')
  ) {
    return '인증번호 6자리를 다시 확인해주세요.';
  }

  if (message.includes('password should be at least')) {
    return '비밀번호는 6자 이상으로 입력해주세요.';
  }

  if (message.includes('invalid email') || message.includes('unable to validate email address')) {
    return '올바른 이메일 주소를 입력해주세요.';
  }

  if (message.includes('signup is disabled')) {
    return '현재 회원가입이 비활성화되어 있어요.';
  }

  if (message.includes('email rate limit exceeded') || message.includes('security purposes') || error?.status === 429) {
    return '요청이 너무 많아요. 잠시 후 다시 시도해주세요.';
  }

  if (message.includes('database error')) {
    return '계정 정보를 저장하는 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.';
  }

  if (message.includes('failed to fetch') || message.includes('network')) {
    return '네트워크 연결을 확인한 뒤 다시 시도해주세요.';
  }

  if (message.includes('provider is not enabled') || message.includes('unsupported provider')) {
    return '이 소셜 로그인이 아직 활성화되지 않았어요. Supabase에서 provider 설정을 먼저 켜주세요.';
  }

  if (message.includes('redirect url') || message.includes('redirect_to')) {
    return '로그인 연결 주소 설정이 올바르지 않아요. Supabase Redirect URL을 확인해주세요.';
  }

  if (message.includes('token') || message.includes('jwt')) {
    return '인증 정보가 만료되었어요. 다시 로그인해주세요.';
  }

  return fallbackMessage;
};

const getAuthFeedbackFromError = (error, fallbackMessage) => ({
  type: 'error',
  message: getKoreanAuthErrorMessage(error, fallbackMessage)
});

const getAuthUserNickname = (user) => {
  if (typeof user?.user_metadata?.nickname === 'string' && user.user_metadata.nickname.trim()) {
    return user.user_metadata.nickname.trim();
  }

  return '';
};

const getAuthUserOnboardingState = (user) => {
  const metadata = isRecord(user?.user_metadata) ? user.user_metadata : {};

  return {
    nickname: getAuthUserNickname(user),
    isOver14: metadata.ageConfirmed === true,
    hasAcceptedTerms: metadata.termsAccepted === true,
    hasAcceptedPrivacy: metadata.privacyAccepted === true,
    hasAcceptedMarketing: metadata.marketingAccepted === true
  };
};

const getAuthUserDisplayName = (user) => {
  const candidates = [
    getAuthUserNickname(user)
  ];

  const matchedName = candidates.find(value => typeof value === 'string' && value.trim());

  if (matchedName) {
    return matchedName.trim();
  }

  return '나';
};

const getAuthProviderLabel = (provider) => {
  if (provider === 'google') {
    return 'Google';
  }

  return '소셜 로그인';
};

const normalizeItem = (item, savedStamps = {}) => {
  const ownCount = getStampCountFromData(savedStamps[item.id]);
  const baseCount = Number.isFinite(item.totalEnjoyCount)
    ? item.totalEnjoyCount
    : (initialItemCountMap[item.id] || 0);

  return {
    ...item,
    creatorId: item.creatorId || (item.isCustom && item.creator === 'user' ? LOCAL_CREATOR_ID : undefined),
    totalEnjoyCount: Math.max(baseCount, ownCount)
  };
};

const mergeItemsWithInitialItems = (savedItems, savedStamps = {}) => {
  if (!Array.isArray(savedItems) || savedItems.length === 0) {
    return initialItems.map(item => normalizeItem(item, savedStamps));
  }

  const normalizedSavedItems = savedItems.map(item => normalizeItem(item, savedStamps));
  const seenIds = new Set(normalizedSavedItems.map(item => item.id));
  const missingInitialItems = initialItems
    .filter(item => !seenIds.has(item.id))
    .map(item => normalizeItem(item, savedStamps));

  return [...normalizedSavedItems, ...missingInitialItems];
};

const normalizeReminderSettings = (value) => {
  if (!isRecord(value)) {
    return defaultReminderSettings;
  }

  if (!Array.isArray(value.reminders)) {
    return {
      enabled: Boolean(value.enabled),
      reminders: [normalizeReminderItem({
        id: 'legacy-reminder',
        time: value.time,
        lastTriggeredDate: value.lastTriggeredDate
      }, 'legacy-reminder')]
    };
  }

  return {
    enabled: Boolean(value.enabled),
    reminders: value.reminders.map((reminder, index) => normalizeReminderItem(reminder, `reminder-${index + 1}`))
  };
};

const normalizeGlobalStreak = (value) => {
  if (!isRecord(value)) {
    return { current: 0, lastDate: null };
  }

  return {
    current: typeof value.current === 'number' ? value.current : 0,
    lastDate: typeof value.lastDate === 'string' ? value.lastDate : null
  };
};

const normalizeMemoMap = (value) => {
  if (!isRecord(value)) {
    return {};
  }

  return Object.entries(value).reduce((acc, [itemId, memos]) => {
    if (!Array.isArray(memos)) {
      return acc;
    }

    acc[itemId] = memos.map(normalizeMemo);
    return acc;
  }, {});
};

const createCloudSnapshotPayload = ({
  items,
  userStamps,
  userFavorites,
  userMemos,
  isDarkMode,
  globalStreak,
  reminderSettings
}) => ({
  version: 1,
  items,
  userStamps,
  userFavorites,
  userMemos,
  isDarkMode,
  globalStreak,
  reminderSettings
});

const normalizeCloudSnapshot = (payload) => {
  const nextUserStamps = isRecord(payload?.userStamps) ? payload.userStamps : {};

  return {
    items: mergeItemsWithInitialItems(Array.isArray(payload?.items) ? payload.items : initialItems, nextUserStamps),
    userStamps: nextUserStamps,
    userFavorites: isRecord(payload?.userFavorites) ? payload.userFavorites : {},
    userMemos: normalizeMemoMap(payload?.userMemos),
    isDarkMode: Boolean(payload?.isDarkMode),
    globalStreak: normalizeGlobalStreak(payload?.globalStreak),
    reminderSettings: normalizeReminderSettings(payload?.reminderSettings)
  };
};

export const HappyContext = createContext();

export const useHappy = () => useContext(HappyContext);

export const HappyProvider = ({ children }) => {
  const storedStamps = readStoredJson('happy_stamps', {});
  const initialUserStamps = isRecord(storedStamps) ? storedStamps : {};

  const [items, setItems] = useState(() => {
    const savedItems = readStoredJson('happy_items', initialItems);
    return mergeItemsWithInitialItems(savedItems, initialUserStamps);
  });

  const [userStamps, setUserStamps] = useState(() => {
    return initialUserStamps;
  });

  const [userFavorites, setUserFavorites] = useState(() => {
    const savedFavorites = readStoredJson('happy_favorites', {});
    return isRecord(savedFavorites) ? savedFavorites : {};
  });

  const [userMemos, setUserMemos] = useState(() => {
    const savedMemos = readStoredJson('happy_memos', {});
    return isRecord(savedMemos) ? savedMemos : {};
  });

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return Boolean(readStoredJson('happy_theme', false));
  });

  const [globalStreak, setGlobalStreak] = useState(() => {
    const savedStreak = readStoredJson('happy_streak', { current: 0, lastDate: null });
    return normalizeGlobalStreak(savedStreak);
  });

  const [reminderSettings, setReminderSettings] = useState(() => {
    const savedReminder = readStoredJson('happy_reminder', defaultReminderSettings);
    return normalizeReminderSettings(savedReminder);
  });

  const [notificationPermission, setNotificationPermission] = useState(() => {
    if (isNativeNotificationPlatform()) {
      return 'default';
    }

    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }

    return window.Notification.permission;
  });

  const [celebrationQueue, setCelebrationQueue] = useState([]);
  const [authSession, setAuthSession] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [isGuestMode, setIsGuestMode] = useState(() => localStorage.getItem(AUTH_MODE_STORAGE_KEY) === 'guest');
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(() => hasPasswordRecoveryInUrl());
  const [isSignupCompletionPending, setIsSignupCompletionPending] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(isSupabaseConfigured);
  const [isAuthBusy, setIsAuthBusy] = useState(false);
  const [authFeedback, setAuthFeedback] = useState(defaultAuthFeedback);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState(defaultCloudSyncStatus);
  const hasBootstrappedCloudRef = useRef(false);
  const isApplyingCloudSnapshotRef = useRef(false);
  const cloudSyncTimeoutRef = useRef(null);
  const latestSnapshotStateRef = useRef(null);
  const isPasswordRecoveryRef = useRef(hasPasswordRecoveryInUrl());
  const postSignOutFeedbackRef = useRef(null);

  useEffect(() => {
    isPasswordRecoveryRef.current = isPasswordRecovery;
  }, [isPasswordRecovery]);

  useEffect(() => {
    if (!isNativeNotificationPlatform()) {
      return undefined;
    }

    let isMounted = true;

    const syncPermission = async () => {
      const permission = await checkNativeNotificationPermission();

      if (isMounted) {
        setNotificationPermission(permission);
      }
    };

    syncPermission();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!supabase) {
      return undefined;
    }

    let isMounted = true;

    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (error) {
        setAuthFeedback(getAuthFeedbackFromError(error, 'Supabase 세션을 불러오지 못했어요.'));
      }

      setAuthSession(data.session ?? null);
      setAuthUser(data.session?.user ?? null);
      if (!data.session?.user) {
        setIsSignupCompletionPending(false);
      }
      setIsAuthLoading(false);
    };

    loadSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) {
        return;
      }

      const isRecoverySession = event === 'PASSWORD_RECOVERY' || hasPasswordRecoveryInUrl();

      setAuthSession(session ?? null);
      setAuthUser(session?.user ?? null);
      setIsAuthLoading(false);

      if (event === 'SIGNED_IN') {
        setIsGuestMode(false);
        localStorage.removeItem(AUTH_MODE_STORAGE_KEY);
        if (!isRecoverySession) {
          setIsPasswordRecovery(false);
        }
      }

      if (event === 'PASSWORD_RECOVERY') {
        setIsGuestMode(false);
        localStorage.removeItem(AUTH_MODE_STORAGE_KEY);
        setIsPasswordRecovery(true);
        setIsSignupCompletionPending(false);
        setAuthFeedback({
          type: 'success',
          message: '새 비밀번호를 설정해주세요.'
        });
      }

      if (event === 'USER_UPDATED' && isPasswordRecoveryRef.current) {
        clearAuthRedirectState();
        setIsPasswordRecovery(false);
        setAuthFeedback({
          type: 'success',
          message: '비밀번호가 새로 설정됐어요. 다시 사용할 수 있어요.'
        });
      }

      if (event === 'SIGNED_OUT') {
        setIsGuestMode(false);
        localStorage.removeItem(AUTH_MODE_STORAGE_KEY);
        setIsPasswordRecovery(false);
        setIsSignupCompletionPending(false);
        const postSignOutFeedback = postSignOutFeedbackRef.current;
        postSignOutFeedbackRef.current = null;
        setAuthFeedback(postSignOutFeedback || defaultAuthFeedback);
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    latestSnapshotStateRef.current = {
      items,
      userStamps,
      userFavorites,
      userMemos,
      isDarkMode,
      globalStreak,
      reminderSettings
    };
  }, [items, userStamps, userFavorites, userMemos, isDarkMode, globalStreak, reminderSettings]);

  const applyCloudSnapshot = (payload) => {
    const snapshot = normalizeCloudSnapshot(payload);
    isApplyingCloudSnapshotRef.current = true;
    setItems(snapshot.items);
    setUserStamps(snapshot.userStamps);
    setUserFavorites(snapshot.userFavorites);
    setUserMemos(snapshot.userMemos);
    setIsDarkMode(snapshot.isDarkMode);
    setGlobalStreak(snapshot.globalStreak);
    setReminderSettings(snapshot.reminderSettings);
  };

  useEffect(() => {
    if (!isApplyingCloudSnapshotRef.current) {
      return;
    }

    isApplyingCloudSnapshotRef.current = false;
  }, [items, userStamps, userFavorites, userMemos, isDarkMode, globalStreak, reminderSettings]);

  useEffect(() => {
    if (!supabase || !authUser?.id) {
      hasBootstrappedCloudRef.current = false;
      if (cloudSyncTimeoutRef.current) {
        window.clearTimeout(cloudSyncTimeoutRef.current);
        cloudSyncTimeoutRef.current = null;
      }
      return undefined;
    }

    let isMounted = true;

    const bootstrapCloudSnapshot = async () => {
      setIsCloudSyncing(true);
      setCloudSyncStatus({
        type: 'loading',
        message: '클라우드 기록을 확인하고 있어요.',
        lastSyncedAt: null
      });

      const { data, error } = await supabase
        .from(CLOUD_SNAPSHOT_TABLE)
        .select('payload, updated_at')
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (error) {
        setCloudSyncStatus({
          type: 'error',
          message: '클라우드 기록 테이블을 아직 만들지 않았거나 접근할 수 없어요.',
          lastSyncedAt: null
        });
        setIsCloudSyncing(false);
        return;
      }

      if (isRecord(data?.payload)) {
        applyCloudSnapshot(data.payload);
        hasBootstrappedCloudRef.current = true;
        setCloudSyncStatus({
          type: 'success',
          message: '클라우드에 저장된 기록을 불러왔어요.',
          lastSyncedAt: typeof data.updated_at === 'string' ? data.updated_at : new Date().toISOString()
        });
        setIsCloudSyncing(false);
        return;
      }

      const payload = createCloudSnapshotPayload(latestSnapshotStateRef.current);

      const { error: upsertError } = await supabase
        .from(CLOUD_SNAPSHOT_TABLE)
        .upsert({
          user_id: authUser.id,
          payload
        }, {
          onConflict: 'user_id'
        });

      if (!isMounted) {
        return;
      }

      if (upsertError) {
        setCloudSyncStatus({
          type: 'error',
          message: '첫 클라우드 백업을 저장하지 못했어요.',
          lastSyncedAt: null
        });
        setIsCloudSyncing(false);
        return;
      }

      hasBootstrappedCloudRef.current = true;
      setCloudSyncStatus({
        type: 'success',
        message: '로컬 기록을 클라우드에 처음 백업했어요.',
        lastSyncedAt: new Date().toISOString()
      });
      setIsCloudSyncing(false);
    };

    bootstrapCloudSnapshot();

    return () => {
      isMounted = false;
    };
  }, [authUser?.id]);

  useEffect(() => {
    localStorage.setItem('happy_items', JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem('happy_stamps', JSON.stringify(userStamps));
  }, [userStamps]);

  useEffect(() => {
    localStorage.setItem('happy_favorites', JSON.stringify(userFavorites));
  }, [userFavorites]);

  useEffect(() => {
    localStorage.setItem('happy_memos', JSON.stringify(userMemos));
  }, [userMemos]);

  useEffect(() => {
    localStorage.setItem('happy_theme', JSON.stringify(isDarkMode));
    if (isDarkMode) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('happy_streak', JSON.stringify(globalStreak));
  }, [globalStreak]);

  useEffect(() => {
    localStorage.setItem('happy_reminder', JSON.stringify(reminderSettings));
  }, [reminderSettings]);

  useEffect(() => {
    if (!supabase || !authUser?.id || !hasBootstrappedCloudRef.current || isApplyingCloudSnapshotRef.current) {
      return undefined;
    }

    if (cloudSyncTimeoutRef.current) {
      window.clearTimeout(cloudSyncTimeoutRef.current);
    }

    cloudSyncTimeoutRef.current = window.setTimeout(async () => {
      setIsCloudSyncing(true);

      const payload = createCloudSnapshotPayload({
        items,
        userStamps,
        userFavorites,
        userMemos,
        isDarkMode,
        globalStreak,
        reminderSettings
      });

      const { error } = await supabase
        .from(CLOUD_SNAPSHOT_TABLE)
        .upsert({
          user_id: authUser.id,
          payload
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        setCloudSyncStatus(prev => ({
          type: 'error',
          message: '클라우드에 저장하지 못했어요.',
          lastSyncedAt: prev.lastSyncedAt
        }));
        setIsCloudSyncing(false);
        return;
      }

      setCloudSyncStatus({
        type: 'success',
        message: '클라우드에 저장됐어요.',
        lastSyncedAt: new Date().toISOString()
      });
      setIsCloudSyncing(false);
    }, 900);

    return () => {
      if (cloudSyncTimeoutRef.current) {
        window.clearTimeout(cloudSyncTimeoutRef.current);
        cloudSyncTimeoutRef.current = null;
      }
    };
  }, [authUser?.id, items, userStamps, userFavorites, userMemos, isDarkMode, globalStreak, reminderSettings]);

  useEffect(() => {
    if (!isNativeNotificationPlatform()) {
      return undefined;
    }

    let isMounted = true;

    const syncReminders = async () => {
      await syncNativeReminderNotifications(reminderSettings.reminders, reminderSettings.enabled);
      const permission = await checkNativeNotificationPermission();

      if (isMounted) {
        setNotificationPermission(permission);
      }
    };

    syncReminders();

    return () => {
      isMounted = false;
    };
  }, [reminderSettings.enabled, reminderSettings.reminders]);

  useEffect(() => {
    if (isNativeNotificationPlatform()) {
      return undefined;
    }

    if (typeof window === 'undefined' || !reminderSettings.enabled || reminderSettings.reminders.length === 0) {
      return undefined;
    }

    const checkReminder = () => {
      const now = new Date();
      const todayKey = getLocalDateKey(now);
      const currentTimeKey = getCurrentTimeKey(now);
      const dueReminderIds = reminderSettings.reminders
        .filter(reminder => currentTimeKey >= reminder.time && reminder.lastTriggeredDate !== todayKey)
        .map(reminder => reminder.id);

      if (dueReminderIds.length === 0) {
        return;
      }

      setCelebrationQueue(prev => [...prev, createReminderCelebration()]);

      if ('Notification' in window && window.Notification.permission === 'granted') {
        new window.Notification('행복 찾을 시간이에요!', {
          body: '오늘도 행복한 하루!! 작은 행복 하나를 찾아볼까요?'
        });
      }

      setReminderSettings(prev => ({
        ...prev,
        reminders: prev.reminders.map(reminder => (
          dueReminderIds.includes(reminder.id)
            ? { ...reminder, lastTriggeredDate: todayKey }
            : reminder
        ))
      }));
    };

    checkReminder();
    const reminderInterval = window.setInterval(checkReminder, 30000);

    return () => {
      window.clearInterval(reminderInterval);
    };
  }, [reminderSettings.enabled, reminderSettings.reminders]);

  const addStamp = (itemId) => {
    const today = new Date();
    const todayKey = getLocalDateKey(today);
    const currentUserStampCount = getStampCountFromData(userStamps[itemId]);
    const currentTotalStamps = getTotalStampCount(userStamps);
    const nextTotalStamps = currentTotalStamps + 1;
    const previousTreeInfo = getTreeInfo(currentTotalStamps);
    const nextTreeInfo = getTreeInfo(nextTotalStamps);
    const celebrations = [];

    setUserStamps(prev => {
      const current = prev[itemId] || { count: 0, lastStampedDate: null };

      return {
        ...prev,
        [itemId]: {
          count: current.count + 1,
          lastStampedDate: todayKey
        }
      };
    });

    setItems(prev => prev.map(item => {
      if (item.id !== itemId) {
        return item;
      }

      return {
        ...item,
        totalEnjoyCount: Math.max(item.totalEnjoyCount || 0, currentUserStampCount) + 1
      };
    }));

    let nextStreak = globalStreak;

    if (getLocalDateKey(globalStreak.lastDate) !== todayKey) {
      if (!globalStreak.lastDate) {
        nextStreak = { current: 1, lastDate: todayKey };
        celebrations.push(createStreakCelebration(1));
      } else {
        const diffDays = getCalendarDayDifference(globalStreak.lastDate, today);

        if (diffDays === 1) {
          nextStreak = { current: globalStreak.current + 1, lastDate: todayKey };
          celebrations.push(createStreakCelebration(globalStreak.current + 1));
        } else {
          nextStreak = { current: 1, lastDate: todayKey };
          celebrations.push(createStreakCelebration(1));
        }
      }
    }

    setGlobalStreak(nextStreak);

    if (previousTreeInfo.id !== nextTreeInfo.id) {
      celebrations.push({
        icon: nextTreeInfo.icon,
        title: `${nextTreeInfo.title}(으)로 업그레이드됐어요!`,
        message: `총 ${nextTotalStamps}번의 행복을 찾아서 ${previousTreeInfo.title}에서 한 단계 자랐어요!`
      });
    }

    if (celebrations.length > 0) {
      setCelebrationQueue(prev => [...prev, ...celebrations]);
    }
  };

  const addCustomItem = (title, description, category) => {
    const newItem = {
      id: `c_${Date.now()}`,
      title,
      description,
      category: category,
      isCustom: true,
      creator: 'user',
      creatorId: authUser?.id || LOCAL_CREATOR_ID,
      totalEnjoyCount: 0
    };

    setItems(prev => [newItem, ...prev]);
  };

  const deleteCustomItem = (itemId) => {
    const targetItem = items.find(item => item.id === itemId);

    if (!targetItem || !targetItem.isCustom || !isOwnedByCurrentUser(targetItem, authUser)) {
      return false;
    }

    setItems(prev => prev.filter(item => item.id !== itemId));

    setUserFavorites(prev => {
      if (!(itemId in prev)) {
        return prev;
      }

      const next = { ...prev };
      delete next[itemId];
      return next;
    });

    setUserMemos(prev => {
      if (!(itemId in prev)) {
        return prev;
      }

      const next = { ...prev };
      delete next[itemId];
      return next;
    });

    return true;
  };

  const getItemsByCategory = (category) => {
    return items.filter(item => item.category === category);
  };

  const getMyItems = () => {
    return items.filter(item => isOwnedByCurrentUser(item, authUser));
  };

  const getStampedItems = () => {
    return items.filter(item => getStampCountFromData(userStamps[item.id]) > 0);
  };

  const getFavoriteItems = () => {
    return items.filter(item => userFavorites[item.id]);
  };

  const getItemStats = (itemId) => {
    const myCount = getStampCountFromData(userStamps[itemId]);
    const matchedItem = items.find(item => item.id === itemId);
    const totalCount = Math.max(matchedItem?.totalEnjoyCount || 0, myCount);

    return {
      myCount,
      totalCount,
      othersCount: Math.max(totalCount - myCount, 0)
    };
  };

  const getItemMemos = (itemId) => {
    const savedMemos = userMemos[itemId];
    return Array.isArray(savedMemos) ? savedMemos.map(normalizeMemo) : [];
  };

  const addMemo = (itemId, content) => {
    const trimmedContent = content.trim();

    if (!trimmedContent) {
      return null;
    }

    const nowIso = new Date().toISOString();
    const nextMemo = {
      id: `m_${Date.now()}`,
      content: trimmedContent,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    setUserMemos(prev => {
      const currentMemos = Array.isArray(prev[itemId]) ? prev[itemId].map(normalizeMemo) : [];

      return {
        ...prev,
        [itemId]: [nextMemo, ...currentMemos]
      };
    });

    return nextMemo;
  };

  const updateMemo = (itemId, memoId, content) => {
    const trimmedContent = content.trim();

    if (!trimmedContent) {
      return false;
    }

    let didUpdate = false;

    setUserMemos(prev => {
      const currentMemos = Array.isArray(prev[itemId]) ? prev[itemId].map(normalizeMemo) : [];

      const nextMemos = currentMemos.map(memo => {
        if (memo.id !== memoId) {
          return memo;
        }

        didUpdate = true;

        return {
          ...memo,
          content: trimmedContent,
          updatedAt: new Date().toISOString()
        };
      });

      if (!didUpdate) {
        return prev;
      }

      return {
        ...prev,
        [itemId]: nextMemos
      };
    });

    return didUpdate;
  };

  const deleteMemo = (itemId, memoId) => {
    let didDelete = false;

    setUserMemos(prev => {
      const currentMemos = Array.isArray(prev[itemId]) ? prev[itemId].map(normalizeMemo) : [];
      const nextMemos = currentMemos.filter(memo => memo.id !== memoId);

      if (nextMemos.length === currentMemos.length) {
        return prev;
      }

      didDelete = true;

      if (nextMemos.length === 0) {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }

      return {
        ...prev,
        [itemId]: nextMemos
      };
    });

    return didDelete;
  };

  const isItemOwnedByCurrentUser = (itemId) => {
    const matchedItem = items.find(item => item.id === itemId);
    return isOwnedByCurrentUser(matchedItem, authUser);
  };

  const toggleFavorite = (itemId) => {
    setUserFavorites(prev => {
      const isFav = prev[itemId];
      if (isFav) {
        const newState = { ...prev };
        delete newState[itemId];
        return newState;
      } else {
        return { ...prev, [itemId]: true };
      }
    });
  };

  const clearAuthFeedback = () => {
    setAuthFeedback(defaultAuthFeedback);
  };

  const continueAsGuest = () => {
    setIsGuestMode(true);
    localStorage.setItem(AUTH_MODE_STORAGE_KEY, 'guest');
    setAuthFeedback(defaultAuthFeedback);
  };

  const leaveGuestMode = () => {
    setIsGuestMode(false);
    localStorage.removeItem(AUTH_MODE_STORAGE_KEY);
  };

  const resetLocalAppState = () => {
    const emptyProgress = {};

    setItems(mergeItemsWithInitialItems(initialItems, emptyProgress));
    setUserStamps(emptyProgress);
    setUserFavorites({});
    setUserMemos({});
    setIsDarkMode(false);
    setGlobalStreak({ current: 0, lastDate: null });
    setReminderSettings(defaultReminderSettings);
    setCelebrationQueue([]);
    setCloudSyncStatus(defaultCloudSyncStatus);
    setIsCloudSyncing(false);
    hasBootstrappedCloudRef.current = false;
    latestSnapshotStateRef.current = null;
  };

  const clearLocalAppStorage = () => {
    APP_STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
  };

  const signInWithPassword = async (email, password) => {
    if (!supabase) {
      const nextFeedback = {
        type: 'error',
        message: 'Supabase 환경변수를 먼저 연결해주세요.'
      };

      setAuthFeedback(nextFeedback);
      return { success: false, error: nextFeedback.message };
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    if (!normalizedEmail) {
      const nextFeedback = {
        type: 'error',
        message: '이메일을 입력해주세요.'
      };

      setAuthFeedback(nextFeedback);
      return { success: false, error: nextFeedback.message };
    }

    if (!normalizedPassword) {
      const nextFeedback = {
        type: 'error',
        message: '비밀번호를 입력해주세요.'
      };

      setAuthFeedback(nextFeedback);
      return { success: false, error: nextFeedback.message };
    }

    setIsAuthBusy(true);
    setAuthFeedback(defaultAuthFeedback);

    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: normalizedPassword
    });

    setIsAuthBusy(false);

    if (error) {
      const nextFeedback = getAuthFeedbackFromError(error, '로그인하지 못했어요.');
      setAuthFeedback(nextFeedback);
      return { success: false, error: nextFeedback.message, reason: 'auth' };
    }

    return { success: true, reason: null };
  };

  const signUpWithPassword = async (email, password) => {
    if (!supabase) {
      const nextFeedback = {
        type: 'error',
        message: 'Supabase 환경변수를 먼저 연결해주세요.'
      };

      setAuthFeedback(nextFeedback);
      return { success: false, error: nextFeedback.message };
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    if (!normalizedEmail) {
      const nextFeedback = {
        type: 'error',
        message: '이메일을 입력해주세요.'
      };

      setAuthFeedback(nextFeedback);
      return { success: false, error: nextFeedback.message };
    }

    if (!normalizedPassword) {
      const nextFeedback = {
        type: 'error',
        message: '비밀번호를 입력해주세요.'
      };

      setAuthFeedback(nextFeedback);
      return { success: false, error: nextFeedback.message };
    }

    if (normalizedEmail === '__never__' && normalizedPassword === '__never__') {
      const nextFeedback = {
        type: 'error',
        message: '닉네임을 입력해주세요.'
      };

      setAuthFeedback(nextFeedback);
      return { success: false, error: nextFeedback.message };
    }

    if (normalizedPassword.length < 6) {
      const nextFeedback = {
        type: 'error',
        message: '비밀번호는 6자 이상으로 입력해주세요.'
      };

      setAuthFeedback(nextFeedback);
      return { success: false, error: nextFeedback.message };
    }

    setIsAuthBusy(true);
    setAuthFeedback(defaultAuthFeedback);

    const redirectTo = getAppRedirectUrl();
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: normalizedPassword,
      options: {
        ...(redirectTo ? { emailRedirectTo: redirectTo } : {}),
        data: {
          nickname: '',
          name: '',
          full_name: ''
        }
      }
    });

    setIsAuthBusy(false);

    if (error) {
      const nextFeedback = getAuthFeedbackFromError(error, '회원가입하지 못했어요.');
      setAuthFeedback(nextFeedback);
      return { success: false, error: nextFeedback.message };
    }

    const needsEmailConfirmation = data.user && !data.session;
    const nextFeedback = {
      type: 'success',
      message: needsEmailConfirmation
        ? '회원가입이 완료됐어요. 이메일 인증 후 로그인해주세요.'
        : '회원가입이 완료됐어요. 바로 로그인됩니다.'
    };

    setAuthFeedback(nextFeedback);
    return { success: true };
  };

  const requestSignUpEmailVerification = async (email, options = {}) => {
    if (!supabase) {
      const nextFeedback = {
        type: 'error',
        message: 'Supabase 환경변수를 먼저 연결해주세요.'
      };

      setAuthFeedback(nextFeedback);
      return { success: false, error: nextFeedback.message };
    }

    const normalizedEmail = email.trim().toLowerCase();
    const isResend = options?.resend === true;

    if (!normalizedEmail) {
      const nextFeedback = {
        type: 'error',
        message: '이메일을 입력해주세요.'
      };

      setAuthFeedback(nextFeedback);
      return { success: false, error: nextFeedback.message, reason: 'validation' };
    }

    setIsAuthBusy(true);
    setAuthFeedback(defaultAuthFeedback);

    let error = null;
    let data = null;

    if (isResend) {
      const response = await supabase.auth.resend({
        type: 'signup',
        email: normalizedEmail
      });

      error = response.error;
      data = response.data;
    } else {
      const response = await supabase.auth.signUp({
        email: normalizedEmail,
        password: createTemporarySignupPassword(),
        options: {
          data: {
            nickname: '',
            name: '',
            full_name: ''
          }
        }
      });

      error = response.error;
      data = response.data;
    }

    if (!isResend && data?.session) {
      await supabase.auth.signOut();
      setIsAuthBusy(false);

      const nextFeedback = {
        type: 'error',
        message: '이메일 인증 설정이 꺼져 있어요. Supabase Auth에서 Confirm email을 먼저 켜주세요.'
      };

      setAuthFeedback(nextFeedback);
      return { success: false, error: nextFeedback.message, reason: 'configuration' };
    }

    const looksLikeObfuscatedExistingUser = (
      !isResend
      && !error
      && data?.user
      && Array.isArray(data.user.identities)
      && data.user.identities.length === 0
    );

    setIsAuthBusy(false);

    if (looksLikeObfuscatedExistingUser) {
      const nextFeedback = {
        type: 'error',
        message: '이미 가입된 이메일이에요. 로그인해주세요.'
      };

      setAuthFeedback(nextFeedback);
      return { success: false, error: nextFeedback.message, reason: 'duplicate' };
    }

    if (error) {
      const nextFeedback = getAuthFeedbackFromError(error, '인증번호를 보내지 못했어요.');
      setAuthFeedback(nextFeedback);
      return { success: false, error: nextFeedback.message, reason: 'auth' };
    }

    const nextFeedback = {
      type: 'success',
      message: isResend
        ? '인증번호를 다시 보냈어요. 이메일의 6자리 인증번호를 입력해주세요.'
        : '인증번호를 보냈어요. 이메일의 6자리 인증번호를 입력해주세요.'
    };

    setAuthFeedback(nextFeedback);
    return { success: true, email: normalizedEmail };
  };

  const verifySignUpEmailVerificationCode = async (email, verificationCode) => {
    if (!supabase) {
      const nextFeedback = {
        type: 'error',
        message: 'Supabase 환경변수를 먼저 연결해주세요.'
      };

      setAuthFeedback(nextFeedback);
      return { success: false, error: nextFeedback.message };
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedVerificationCode = verificationCode.trim();

    if (!normalizedEmail) {
      const nextFeedback = {
        type: 'error',
        message: '이메일을 입력해주세요.'
      };

      setAuthFeedback(nextFeedback);
      return { success: false, error: nextFeedback.message, reason: 'validation' };
    }

    if (!/^\d{6}$/.test(normalizedVerificationCode)) {
      const nextFeedback = {
        type: 'error',
        message: '6자리 인증번호를 입력해주세요.'
      };

      setAuthFeedback(nextFeedback);
      return { success: false, error: nextFeedback.message, reason: 'validation' };
    }

    setIsSignupCompletionPending(true);
    setIsAuthBusy(true);
    setAuthFeedback(defaultAuthFeedback);

    const { error } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token: normalizedVerificationCode,
      type: 'email'
    });

    if (error) {
      setIsAuthBusy(false);
      setIsSignupCompletionPending(false);
      const nextFeedback = getAuthFeedbackFromError(error, '이메일 인증을 완료하지 못했어요.');
      setAuthFeedback(nextFeedback);
      return { success: false, error: nextFeedback.message, reason: 'auth' };
    }

    setIsAuthBusy(false);
    setAuthFeedback({
      type: 'success',
      message: '인증번호가 확인되었습니다. 비밀번호를 입력하고 회원가입을 완료해주세요.'
    });

    return { success: true };
  };

  const completeSignUpWithVerificationCode = async password => {
    if (!supabase) {
      const nextFeedback = {
        type: 'error',
        message: 'Supabase 환경변수를 먼저 연결해주세요.'
      };

      setAuthFeedback(nextFeedback);
      return { success: false, error: nextFeedback.message };
    }

    const normalizedPassword = password.trim();

    if (!normalizedPassword) {
      const nextFeedback = {
        type: 'error',
        message: '비밀번호를 입력해주세요.'
      };

      setAuthFeedback(nextFeedback);
      return { success: false, error: nextFeedback.message, reason: 'validation' };
    }

    if (normalizedPassword.length < 6) {
      const nextFeedback = {
        type: 'error',
        message: '비밀번호는 6자 이상으로 입력해주세요.'
      };

      setAuthFeedback(nextFeedback);
      return { success: false, error: nextFeedback.message, reason: 'validation' };
    }

    setIsAuthBusy(true);
    setAuthFeedback(defaultAuthFeedback);

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setIsAuthBusy(false);
      const nextFeedback = {
        type: 'error',
        message: '이메일 인증 상태를 찾지 못했어요. 인증번호 확인을 다시 진행해주세요.'
      };

      setAuthFeedback(nextFeedback);
      return { success: false, error: nextFeedback.message, reason: 'auth' };
    }

    const { error: passwordUpdateError } = await supabase.auth.updateUser({
      password: normalizedPassword
    });

    setIsAuthBusy(false);

    if (passwordUpdateError) {
      const nextFeedback = getAuthFeedbackFromError(passwordUpdateError, '비밀번호를 저장하지 못했어요.');
      setAuthFeedback(nextFeedback);
      return { success: false, error: nextFeedback.message, reason: 'auth' };
    }

    setIsSignupCompletionPending(false);
    setAuthFeedback({
      type: 'success',
      message: '회원가입이 완료됐어요.'
    });

    return { success: true };
  };

  const requestPasswordReset = async (email) => {
    if (!supabase) {
      const nextFeedback = {
        type: 'error',
        message: 'Supabase 환경변수를 먼저 연결해주세요.'
      };

      setAuthFeedback(nextFeedback);
      return { success: false, error: nextFeedback.message, reason: 'unavailable' };
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      const nextFeedback = {
        type: 'error',
        message: '이메일을 입력해주세요.'
      };

      setAuthFeedback(nextFeedback);
      return { success: false, error: nextFeedback.message, reason: 'validation' };
    }

    setIsAuthBusy(true);
    setAuthFeedback(defaultAuthFeedback);

    const redirectTo = getAppRedirectUrl();
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      ...(redirectTo ? { redirectTo } : {})
    });

    setIsAuthBusy(false);

    if (error) {
      const nextFeedback = getAuthFeedbackFromError(error, '비밀번호 재설정 메일을 보내지 못했어요.');
      setAuthFeedback(nextFeedback);
      return { success: false, error: nextFeedback.message, reason: 'validation' };
    }

    const nextFeedback = {
      type: 'success',
      message: '비밀번호 재설정 메일을 보냈어요. 메일의 링크에서 새 비밀번호를 설정해주세요.'
    };

    setAuthFeedback(nextFeedback);
    return { success: true };
  };

  const completePasswordReset = async (password) => {
    if (!supabase) {
      const nextFeedback = {
        type: 'error',
        message: 'Supabase 환경변수를 먼저 연결해주세요.'
      };

      setAuthFeedback(nextFeedback);
      return { success: false, error: nextFeedback.message };
    }

    const normalizedPassword = password.trim();

    if (!normalizedPassword) {
      const nextFeedback = {
        type: 'error',
        message: '새 비밀번호를 입력해주세요.'
      };

      setAuthFeedback(nextFeedback);
      return { success: false, error: nextFeedback.message };
    }

    if (normalizedPassword.length < 6) {
      const nextFeedback = {
        type: 'error',
        message: '비밀번호는 6자 이상으로 입력해주세요.'
      };

      setAuthFeedback(nextFeedback);
      return { success: false, error: nextFeedback.message };
    }

    setIsAuthBusy(true);
    setAuthFeedback(defaultAuthFeedback);

    const { data, error } = await supabase.auth.updateUser({
      password: normalizedPassword
    });

    setIsAuthBusy(false);

    if (error) {
      const nextFeedback = getAuthFeedbackFromError(error, '새 비밀번호를 저장하지 못했어요.');
      setAuthFeedback(nextFeedback);
      return { success: false, error: nextFeedback.message };
    }

    clearAuthRedirectState();
    setIsPasswordRecovery(false);

    if (data.user) {
      setAuthUser(data.user);
      setAuthSession(prev => (prev ? { ...prev, user: data.user } : prev));
    }

    setAuthFeedback({
      type: 'success',
      message: '비밀번호가 새로 설정됐어요. 다시 사용할 수 있어요.'
    });

    return { success: true };
  };

  const signInWithSocialProvider = async (provider) => {
    if (!supabase) {
      const nextFeedback = {
        type: 'error',
        message: 'Supabase 환경변수를 먼저 연결해주세요.'
      };

      setAuthFeedback(nextFeedback);
      return { success: false, error: nextFeedback.message };
    }

    setIsAuthBusy(true);
    setAuthFeedback(defaultAuthFeedback);

    const redirectTo = getAppRedirectUrl();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: redirectTo ? { redirectTo } : undefined
    });

    setIsAuthBusy(false);

    if (error) {
      const nextFeedback = getAuthFeedbackFromError(
        error,
        `${getAuthProviderLabel(provider)} 로그인으로 연결하지 못했어요.`
      );
      setAuthFeedback(nextFeedback);
      return { success: false, error: nextFeedback.message };
    }

    return { success: true };
  };

  const signOutFromSupabase = async () => {
    if (!supabase) {
      return { success: false, error: 'Supabase가 연결되지 않았어요.' };
    }

    setIsSignupCompletionPending(false);
    setIsAuthBusy(true);
    const { error } = await supabase.auth.signOut();
    setIsAuthBusy(false);

    if (error) {
      const nextFeedback = getAuthFeedbackFromError(error, '로그아웃하지 못했어요.');
      setAuthFeedback(nextFeedback);
      return { success: false, error: nextFeedback.message };
    }

    return { success: true };
  };

  const deleteAccount = async () => {
    if (!supabase || !authUser) {
      return { success: false, error: '로그인한 계정이 없어요.' };
    }

    setIsAuthBusy(true);
    setAuthFeedback(defaultAuthFeedback);

    const successFeedback = {
      type: 'success',
      message: '계정과 저장된 기록이 삭제됐어요.'
    };

    const { error } = await supabase.functions.invoke(DELETE_ACCOUNT_FUNCTION_NAME, {
      body: {
        confirmation: 'DELETE'
      }
    });

    if (error) {
      setIsAuthBusy(false);
      const nextFeedback = getAuthFeedbackFromError(error, '회원탈퇴를 완료하지 못했어요.');
      setAuthFeedback(nextFeedback);
      return { success: false, error: nextFeedback.message };
    }

    clearLocalAppStorage();
    resetLocalAppState();
    clearAuthRedirectState();
    setIsGuestMode(false);
    setIsSignupCompletionPending(false);
    localStorage.removeItem(AUTH_MODE_STORAGE_KEY);
    postSignOutFeedbackRef.current = successFeedback;

    const { error: signOutError } = await supabase.auth.signOut();

    setIsAuthBusy(false);

    if (signOutError) {
      postSignOutFeedbackRef.current = null;
      setAuthSession(null);
      setAuthUser(null);
      setIsPasswordRecovery(false);
      setAuthFeedback(successFeedback);
    }

    return { success: true };
  };

  const updateAuthNickname = async (nickname) => {
    if (!supabase || !authUser) {
      return { success: false, error: '로그인한 계정이 없어요.' };
    }

    const normalizedNickname = nickname.trim();

    if (!normalizedNickname) {
      return { success: false, error: '닉네임을 입력해주세요.' };
    }

    if (normalizedNickname.length > 8) {
      return { success: false, error: '닉네임은 최대 8글자까지 입력할 수 있어요.' };
    }

    setIsAuthBusy(true);

    const { data, error } = await supabase.auth.updateUser({
      data: {
        ...(isRecord(authUser.user_metadata) ? authUser.user_metadata : {}),
        nickname: normalizedNickname
      }
    });

    setIsAuthBusy(false);

    if (error) {
      const nextFeedback = getAuthFeedbackFromError(error, '닉네임을 저장하지 못했어요.');
      return { success: false, error: nextFeedback.message };
    }

    if (data.user) {
      setAuthUser(data.user);
      setAuthSession(prev => (prev ? { ...prev, user: data.user } : prev));
    }

    return { success: true };
  };

  const completeAuthOnboarding = async ({
    isOver14,
    hasAcceptedTerms,
    hasAcceptedPrivacy,
    hasAcceptedMarketing
  }) => {
    if (!supabase || !authUser) {
      return { success: false, error: '로그인한 계정이 없어요.' };
    }

    if (!isOver14) {
      return { success: false, error: '만 14세 이상인지 확인해주세요.' };
    }

    if (!hasAcceptedTerms) {
      return { success: false, error: '이용약관 동의가 필요해요.' };
    }

    if (!hasAcceptedPrivacy) {
      return { success: false, error: '개인정보처리방침 동의가 필요해요.' };
    }

    setIsAuthBusy(true);

    const { data, error } = await supabase.auth.updateUser({
      data: {
        ...(isRecord(authUser.user_metadata) ? authUser.user_metadata : {}),
        ageConfirmed: true,
        termsAccepted: true,
        privacyAccepted: true,
        marketingAccepted: Boolean(hasAcceptedMarketing)
      }
    });

    setIsAuthBusy(false);

    if (error) {
      const nextFeedback = getAuthFeedbackFromError(error, '첫 설정을 저장하지 못했어요.');
      return { success: false, error: nextFeedback.message };
    }

    if (data.user) {
      setAuthUser(data.user);
      setAuthSession(prev => (prev ? { ...prev, user: data.user } : prev));
    }

    return { success: true };
  };

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  const updateReminderTime = (time) => {
    setReminderSettings(prev => ({
      ...prev,
      reminders: prev.reminders.length > 0
        ? prev.reminders.map((reminder, index) => (
          index === 0
            ? normalizeReminderItem({
              ...reminder,
              time
            }, reminder.id)
            : reminder
        ))
        : [createReminderItem(time)]
    }));
  };

  const addReminder = (time = DEFAULT_REMINDER_TIME) => {
    const todayKey = getLocalDateKey();
    const nowTimeKey = getCurrentTimeKey();

    setReminderSettings(prev => ({
      ...prev,
      reminders: [
        ...prev.reminders,
        createReminderItem(time, {
          lastTriggeredDate: prev.enabled && nowTimeKey >= time ? todayKey : null
        })
      ]
    }));
  };

  const updateReminder = (reminderId, time) => {
    const todayKey = getLocalDateKey();
    const nowTimeKey = getCurrentTimeKey();

    setReminderSettings(prev => ({
      ...prev,
      reminders: prev.reminders.map(reminder => {
        if (reminder.id !== reminderId) {
          return reminder;
        }

        return {
          ...reminder,
          time,
          lastTriggeredDate: prev.enabled && nowTimeKey >= time ? todayKey : null
        };
      })
    }));
  };

  const deleteReminder = (reminderId) => {
    setReminderSettings(prev => ({
      ...prev,
      reminders: prev.reminders.filter(reminder => reminder.id !== reminderId)
    }));
  };

  const requestNotificationPermission = async () => {
    if (isNativeNotificationPlatform()) {
      const permission = await requestNativeNotificationPermission();
      setNotificationPermission(permission);
      return permission;
    }

    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationPermission('unsupported');
      return 'unsupported';
    }

    const permission = await window.Notification.requestPermission();
    setNotificationPermission(permission);
    return permission;
  };

  const toggleReminder = async (enabled) => {
    let currentPermission = notificationPermission;

    if (enabled && currentPermission === 'default') {
      currentPermission = await requestNotificationPermission();
    }

    const todayKey = getLocalDateKey();
    const nowTimeKey = getCurrentTimeKey();

    setReminderSettings(prev => ({
      ...prev,
      enabled,
      reminders: prev.reminders.map(reminder => ({
        ...reminder,
        lastTriggeredDate: enabled && nowTimeKey >= reminder.time ? todayKey : reminder.lastTriggeredDate
      }))
    }));

    return currentPermission;
  };

  const dismissCelebration = () => {
    setCelebrationQueue(prev => prev.slice(1));
  };

  const totalStamps = getTotalStampCount(userStamps);
  const activeCelebration = celebrationQueue[0] || null;

  return (
    <HappyContext.Provider value={{
      items,
      userStamps,
      userFavorites,
      addStamp,
      addCustomItem,
      deleteCustomItem,
      getItemsByCategory,
      getItemStats,
      getItemMemos,
      isItemOwnedByCurrentUser,
      addMemo,
      updateMemo,
      deleteMemo,
      getMyItems,
      getStampedItems,
      getFavoriteItems,
      toggleFavorite,
      totalStamps,
      isDarkMode,
      toggleTheme,
      isSupabaseConfigured,
      authSession,
      authUser,
      isGuestMode,
      authUserOnboarding: getAuthUserOnboardingState(authUser),
      authUserNickname: getAuthUserNickname(authUser),
      authUserDisplayName: getAuthUserDisplayName(authUser),
      isSignupCompletionPending,
      isPasswordRecovery,
      isAuthLoading,
      isAuthBusy,
      authFeedback,
      isCloudSyncing,
      cloudSyncStatus,
      clearAuthFeedback,
      continueAsGuest,
      leaveGuestMode,
      signInWithPassword,
      signUpWithPassword,
      requestSignUpEmailVerification,
      verifySignUpEmailVerificationCode,
      completeSignUpWithVerificationCode,
      requestPasswordReset,
      completePasswordReset,
      signInWithSocialProvider,
      signOutFromSupabase,
      deleteAccount,
      completeAuthOnboarding,
      updateAuthNickname,
      globalStreak,
      reminderSettings,
      notificationPermission,
      toggleReminder,
      addReminder,
      updateReminder,
      deleteReminder,
      updateReminderTime,
      requestNotificationPermission,
      activeCelebration,
      dismissCelebration
    }}>
      {children}
    </HappyContext.Provider>
  );
};

