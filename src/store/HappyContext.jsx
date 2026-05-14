/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useContext, useEffect, useEffectEvent, useRef } from 'react';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { getLocalDateKey } from '../utils/date';
import {
  DEFAULT_REMINDER_NOTIFICATION_BODY,
  DEFAULT_REMINDER_NOTIFICATION_TITLE,
  REMINDER_NOTIFICATION_BODY_MAX_LENGTH,
  REMINDER_NOTIFICATION_TITLE_MAX_LENGTH,
  getReminderNotificationContent
} from '../lib/reminderContent';
import {
  checkNativeExactAlarmPermission,
  checkNativeNotificationPermission,
  isNativeAndroidNotificationPlatform,
  isNativeNotificationPlatform,
  openNativeExactAlarmSettings,
  openNativeNotificationSettings,
  requestNativeNotificationPermission,
  syncNativeReminderNotifications
} from '../lib/localNotifications';
import { supabase, isSupabaseConfigured, supabaseAuthStorageKey } from '../lib/supabase';
import {
  deleteMemoStoredImages,
  isNativeMemoImageAvailable,
  uploadLocalMemoImageToCloud
} from '../lib/memoImages';
import { openExternalUrl } from '../lib/externalBrowser';
import {
  isNativeGoogleSignInConfigured,
  signInWithNativeGoogle,
  signOutFromNativeGoogle
} from '../lib/nativeGoogleSignIn';
import {
  isNativeAppleSignInConfigured,
  signInWithNativeApple,
  signOutFromNativeApple
} from '../lib/nativeAppleSignIn';
import {
  createReviewAdminUser,
  isReviewAdminCredentials
} from '../lib/reviewAdminAccess';
import { requestReviewAdminSession } from '../lib/reviewAdminSession';
import { APP_PATH, PASSWORD_RESET_PATH, getAppRedirectUrl, getNativeAuthCallbackPathFromUrl } from '../lib/routes';
import { MAX_RECORD_TAGS, normalizeVisibleTags } from '../lib/happinessTags';

const LEGACY_LOCAL_CREATOR_ID = 'local-user';
const DEFAULT_REMINDER_TIME = '12:00';
const DEFAULT_SECONDARY_REMINDER_TIME = '18:00';

const createReminderId = () => `reminder_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const createCustomItemId = () => `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const createReminderItem = (time = DEFAULT_REMINDER_TIME, overrides = {}) => ({
  id: overrides.id || createReminderId(),
  time: typeof time === 'string' ? time : DEFAULT_REMINDER_TIME,
  lastTriggeredDate: typeof overrides.lastTriggeredDate === 'string' ? overrides.lastTriggeredDate : null
});

const applyReminderEnabledState = (settings, enabled) => {
  const todayKey = getLocalDateKey();
  const nowTimeKey = getCurrentTimeKey();

  return {
    ...settings,
    enabled,
    reminders: settings.reminders.map(reminder => ({
      ...reminder,
      lastTriggeredDate: enabled && nowTimeKey >= reminder.time ? todayKey : reminder.lastTriggeredDate
    }))
  };
};

const defaultReminderSettings = {
  enabled: false,
  notificationTitle: DEFAULT_REMINDER_NOTIFICATION_TITLE,
  notificationBody: DEFAULT_REMINDER_NOTIFICATION_BODY,
  reminders: [
    createReminderItem(DEFAULT_REMINDER_TIME, { id: 'default-reminder-noon' }),
    createReminderItem(DEFAULT_SECONDARY_REMINDER_TIME, { id: 'default-reminder-evening' })
  ]
};

const hasRequiredNativeReminderPermissions = (notificationPermission) => (
  notificationPermission === 'granted'
);

const defaultAuthFeedback = {
  type: 'idle',
  message: ''
};
const AUTH_MODE_STORAGE_KEY = 'happy_auth_mode';
const INITIAL_NOTIFICATION_PERMISSION_PROMPTED_STORAGE_KEY = 'happy_initial_notification_permission_prompted';
const GUEST_LOCAL_CREATOR_ID_STORAGE_KEY = 'happy_guest_local_creator_id';
const REVIEW_ADMIN_AUTH_STORAGE_KEY = 'happy_review_admin_auth_user';
const AUTH_SESSION_BACKUP_STORAGE_KEY = 'happy_auth_session_backup';
const LAST_NATIVE_AUTH_CALLBACK_STORAGE_KEY = 'happy_last_native_auth_callback_url';
const MARKETING_CONSENT_STORAGE_KEY = 'happy_marketing_consent';
const APP_STORAGE_KEYS = [
  AUTH_SESSION_BACKUP_STORAGE_KEY,
  INITIAL_NOTIFICATION_PERMISSION_PROMPTED_STORAGE_KEY,
  MARKETING_CONSENT_STORAGE_KEY,
  'happy_items',
  'happy_stamps',
  'happy_favorites',
  'happy_memos',
  'happy_free_records',
  'happy_theme',
  'happy_streak',
  'happy_reminder'
];
const defaultCloudSyncStatus = {
  type: 'idle',
  message: '',
  lastSyncedAt: null
};
const PROFILES_TABLE = 'profiles';
const CLOUD_SNAPSHOT_TABLE = 'happy_user_snapshots';
const HAPPINESS_ITEMS_TABLE = 'happiness_items';
const HAPPINESS_ITEM_SELECT_COLUMNS = 'id, title, description, category, source, owner_user_id, is_public, created_at';
const HAPPINESS_ITEM_SELECT_COLUMNS_WITH_TAGS = `${HAPPINESS_ITEM_SELECT_COLUMNS}, tags`;
const DELETE_ACCOUNT_FUNCTION_NAME = 'delete-account';
const DELETE_HAPPINESS_ITEM_FUNCTION_NAME = 'delete-happiness-item';
const FREE_RECORD_IMAGE_ITEM_ID = 'free-records';
const LEGACY_CATEGORY_MAP = {
  일주일행복: '기분전환',
  한달행복: '제대로'
};
const createTemporarySignupPassword = () => (
  `temp_${Math.random().toString(36).slice(2, 10)}_${Date.now()}Aa1!`
);

const createGuestLocalCreatorId = () => `guest_${Math.random().toString(36).slice(2, 10)}`;

const isMissingTagsColumnError = error => {
  if (!error) {
    return false;
  }

  const errorMessage = typeof error.message === 'string' ? error.message.toLowerCase() : '';
  const errorDetails = typeof error.details === 'string' ? error.details.toLowerCase() : '';
  const combinedMessage = `${errorMessage} ${errorDetails}`;

  return (
    combinedMessage.includes('tags')
    && (
      error.code === '42703'
      || error.code === 'PGRST204'
      || combinedMessage.includes('column')
      || combinedMessage.includes('schema cache')
    )
  );
};

const omitTagsFromPayload = payload => {
  const payloadWithoutTags = { ...payload };
  delete payloadWithoutTags.tags;
  return payloadWithoutTags;
};

const getGuestLocalCreatorId = () => {
  if (typeof window === 'undefined') {
    return LEGACY_LOCAL_CREATOR_ID;
  }

  const storedId = window.localStorage.getItem(GUEST_LOCAL_CREATOR_ID_STORAGE_KEY);

  if (typeof storedId === 'string' && storedId.trim()) {
    return storedId.trim();
  }

  const nextId = createGuestLocalCreatorId();
  window.localStorage.setItem(GUEST_LOCAL_CREATOR_ID_STORAGE_KEY, nextId);
  return nextId;
};

const readStoredReviewAdminAuthUser = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(REVIEW_ADMIN_AUTH_STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue);
    return parsedValue && typeof parsedValue === 'object' ? parsedValue : null;
  } catch {
    return null;
  }
};

const writeStoredReviewAdminAuthUser = user => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(REVIEW_ADMIN_AUTH_STORAGE_KEY, JSON.stringify(user));
};

const clearStoredReviewAdminAuthUser = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(REVIEW_ADMIN_AUTH_STORAGE_KEY);
};

const initialItems = [
  {
    id: 'h21',
    title: '일기 쓰기',
    description: '오늘의 기분을 짧게라도 적으며 마음을 천천히 정리해보세요.',
    previewImage: '/happiness-sample-journal.svg',
    category: '소확행',
    isCustom: false,
    creator: 'system',
    totalEnjoyCount: 12
  },
  {
    id: 'h22',
    title: '좋아하는 양말 신고 하루 시작하기',
    description: '좋아하는 양말을 신고 하루를 시작하면 기분이 조금 더 산뜻해질 수 있어요.',
    category: '소확행',
    isCustom: false,
    creator: 'system',
    totalEnjoyCount: 9
  },
  {
    id: 'h23',
    title: '셀프 칭찬 한마디 하기',
    description: '거울을 보며 오늘의 나에게 짧은 칭찬 한마디를 건네보세요.',
    category: '소확행',
    isCustom: false,
    creator: 'system',
    totalEnjoyCount: 11
  },
  {
    id: 'h24',
    title: '휴대폰 배경화면 바꾸기',
    description: '마음에 드는 사진이나 이미지를 골라 기분 좋은 화면으로 바꿔보세요.',
    category: '소확행',
    isCustom: false,
    creator: 'system',
    totalEnjoyCount: 10
  },
  {
    id: 'h25',
    title: '비 오는 날 빗소리 듣기',
    description: '비가 오는 날엔 잠깐 멈춰서 빗소리를 들으며 마음을 쉬게 해보세요.',
    category: '소확행',
    isCustom: false,
    creator: 'system',
    totalEnjoyCount: 8
  },
  {
    id: 'h26',
    title: '핸드크림 바르고 향 맡기',
    description: '좋아하는 향을 가까이 두고 천천히 맡아보며 기분을 다독여보세요.',
    category: '소확행',
    isCustom: false,
    creator: 'system',
    totalEnjoyCount: 13
  },
  {
    id: 'h27',
    title: '옷 사기',
    description: '입고 싶었던 옷 한 벌을 골라 기분 전환이 되는 소비를 해보세요.',
    category: '기분전환',
    isCustom: false,
    creator: 'system',
    totalEnjoyCount: 10
  },
  {
    id: 'h28',
    title: '보고 싶었던 영화 보기',
    description: '미뤄뒀던 영화를 보며 잠깐 다른 세계에 푹 빠져보세요.',
    category: '기분전환',
    isCustom: false,
    creator: 'system',
    totalEnjoyCount: 14
  },
  {
    id: 'h29',
    title: '노래방 가기',
    description: '마음껏 노래를 부르며 쌓여 있던 기분을 시원하게 풀어보세요.',
    category: '기분전환',
    isCustom: false,
    creator: 'system',
    totalEnjoyCount: 9
  },
  {
    id: 'h30',
    title: '쉬는 날 계획하기',
    description: '다가오는 쉬는 날에 하고 싶은 일을 골라 기대감을 만들어보세요.',
    category: '기분전환',
    isCustom: false,
    creator: 'system',
    totalEnjoyCount: 7
  },
  {
    id: 'h31',
    title: '서점에서 책 구경하기',
    description: '서점에 들러 표지와 제목을 천천히 보며 마음 가는 책을 찾아보세요.',
    category: '기분전환',
    isCustom: false,
    creator: 'system',
    totalEnjoyCount: 8
  },
  {
    id: 'h32',
    title: '사고 싶었던 물건 사기',
    description: '계속 눈에 밟히던 물건을 드디어 사며 만족감을 느껴보세요.',
    category: '기분전환',
    isCustom: false,
    creator: 'system',
    totalEnjoyCount: 11
  },
  {
    id: 'h33',
    title: '공연 보러 가기',
    description: '라이브로만 느낄 수 있는 분위기와 에너지를 직접 경험해보세요.',
    category: '제대로',
    isCustom: false,
    creator: 'system',
    totalEnjoyCount: 10
  },
  {
    id: 'h34',
    title: '나만의 취미 만들기',
    description: '꾸준히 즐길 수 있는 취미 하나를 정해 나만의 시간을 만들어보세요.',
    category: '제대로',
    isCustom: false,
    creator: 'system',
    totalEnjoyCount: 7
  },
  {
    id: 'h35',
    title: '하고 싶은 공부 시작하기',
    description: '예전부터 배우고 싶었던 주제를 골라 첫 페이지를 열어보세요.',
    category: '제대로',
    isCustom: false,
    creator: 'system',
    totalEnjoyCount: 6
  },
  {
    id: 'h36',
    title: '방 정리하기',
    description: '미뤄둔 공간을 정리하면서 생활 분위기까지 가볍게 바꿔보세요.',
    category: '제대로',
    isCustom: false,
    creator: 'system',
    totalEnjoyCount: 9
  },
  {
    id: 'h37',
    title: '혼자 놀기 계획하기',
    description: '오롯이 혼자 즐길 하루를 상상하며 나만의 코스를 짜보세요.',
    category: '제대로',
    isCustom: false,
    creator: 'system',
    totalEnjoyCount: 5
  },
  {
    id: 'h38',
    title: '마음에 드는 문장 메모하기',
    description: '오늘 마음을 건드린 문장 하나를 적어두고 오래 간직해보세요.',
    category: '소확행',
    isCustom: false,
    creator: 'system',
    totalEnjoyCount: 4
  },
  {
    id: 'h39',
    title: '옛 사진 보며 추억 떠올리기',
    description: '갤러리 속 오래된 사진을 보며 지나간 좋은 순간을 천천히 떠올려보세요.',
    category: '소확행',
    isCustom: false,
    creator: 'system',
    totalEnjoyCount: 5
  },
  {
    id: 'h40',
    title: '길가에 피어 있는 꽃의 꽃말 찾아보기',
    description: '우연히 마주친 꽃의 이름과 꽃말을 찾아보며 작은 재미를 느껴보세요.',
    category: '소확행',
    isCustom: false,
    creator: 'system',
    totalEnjoyCount: 3
  },
  {
    id: 'h41',
    title: '자주 쓰는 소지품에 이름 지어주기',
    description: '매일 쓰는 물건에 작은 이름을 붙이며 애정을 더해보세요.',
    category: '소확행',
    isCustom: false,
    creator: 'system',
    totalEnjoyCount: 3
  },
  {
    id: 'h42',
    title: '작은 소품 하나 사서 방 꾸미기',
    description: '마음에 드는 작은 소품 하나로 방 분위기를 가볍게 바꿔보세요.',
    category: '기분전환',
    isCustom: false,
    creator: 'system',
    totalEnjoyCount: 4
  },
  {
    id: 'h43',
    title: '주변 사람에게 작은 선물 건네기',
    description: '고마운 마음을 담아 작은 선물 하나를 전해보세요.',
    category: '기분전환',
    isCustom: false,
    creator: 'system',
    totalEnjoyCount: 2
  },
  {
    id: 'h44',
    title: '옛 물건 꺼내보기',
    description: '예전에 아끼던 물건을 다시 꺼내 보며 그때의 마음을 떠올려보세요.',
    category: '기분전환',
    isCustom: false,
    creator: 'system',
    totalEnjoyCount: 3
  },
  {
    id: 'h45',
    title: '가사를 보며 노래를 천천히 음미하기',
    description: '익숙한 노래도 가사를 따라가며 들으면 또 다른 감정이 보일 수 있어요.',
    category: '기분전환',
    isCustom: false,
    creator: 'system',
    totalEnjoyCount: 4
  },
  {
    id: 'h46',
    title: '평소보다 먼 거리를 걸어가 보기',
    description: '조금 더 멀리 걸어가며 생각을 비우고 몸의 리듬을 느껴보세요.',
    category: '제대로',
    isCustom: false,
    creator: 'system',
    totalEnjoyCount: 3
  },
  {
    id: 'h47',
    title: '주변 사람이나 스스로에게 편지 쓰기',
    description: '전하고 싶었던 마음을 글로 적으며 감정을 차분히 정리해보세요.',
    category: '제대로',
    isCustom: false,
    creator: 'system',
    totalEnjoyCount: 2
  },
  {
    id: 'h48',
    title: '생각만 하던 일 실행해보기',
    description: '미루기만 했던 일을 오늘 바로 시작하며 작은 추진력을 만들어보세요.',
    category: '제대로',
    isCustom: false,
    creator: 'system',
    totalEnjoyCount: 2
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

const readStoredAuthSessionBackup = () => {
  const storedValue = readStoredJson(AUTH_SESSION_BACKUP_STORAGE_KEY, null);

  if (!isRecord(storedValue)) {
    return null;
  }

  const accessToken = typeof storedValue.access_token === 'string'
    ? storedValue.access_token.trim()
    : '';
  const refreshToken = typeof storedValue.refresh_token === 'string'
    ? storedValue.refresh_token.trim()
    : '';

  if (!accessToken || !refreshToken) {
    return null;
  }

  return {
    access_token: accessToken,
    refresh_token: refreshToken
  };
};

const writeStoredAuthSessionBackup = (session) => {
  if (
    !session
    || typeof session.access_token !== 'string'
    || typeof session.refresh_token !== 'string'
    || !session.access_token.trim()
    || !session.refresh_token.trim()
  ) {
    localStorage.removeItem(AUTH_SESSION_BACKUP_STORAGE_KEY);
    return;
  }

  localStorage.setItem(AUTH_SESSION_BACKUP_STORAGE_KEY, JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token
  }));
};

const clearStoredAuthSessionBackup = () => {
  localStorage.removeItem(AUTH_SESSION_BACKUP_STORAGE_KEY);
};

const readLastHandledNativeAuthCallback = () => {
  try {
    return localStorage.getItem(LAST_NATIVE_AUTH_CALLBACK_STORAGE_KEY) || '';
  } catch {
    return '';
  }
};

const writeLastHandledNativeAuthCallback = (urlString) => {
  try {
    if (typeof urlString !== 'string' || !urlString.trim()) {
      localStorage.removeItem(LAST_NATIVE_AUTH_CALLBACK_STORAGE_KEY);
      return;
    }

    localStorage.setItem(LAST_NATIVE_AUTH_CALLBACK_STORAGE_KEY, urlString.trim());
  } catch {
    // Ignore storage write failures.
  }
};

const clearSupabaseAuthStorage = () => {
  if (typeof window === 'undefined') {
    return;
  }

  const storageKeys = [
    supabaseAuthStorageKey,
    `${supabaseAuthStorageKey}-code-verifier`,
    `${supabaseAuthStorageKey}-user`
  ];

  storageKeys.forEach(key => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore localStorage failures.
    }

    try {
      window.sessionStorage.removeItem(key);
    } catch {
      // Ignore sessionStorage failures.
    }
  });
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

const normalizeMemoImages = images => {
  if (!Array.isArray(images)) {
    return [];
  }

  return images
    .filter(image => isRecord(image) && typeof image.path === 'string' && image.path.trim())
    .map(image => ({
      id: typeof image.id === 'string' && image.id.trim()
        ? image.id
        : `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      storageType: image.storageType === 'cloud' ? 'cloud' : 'local',
      path: image.path.trim(),
      contentType: typeof image.contentType === 'string' && image.contentType.trim()
        ? image.contentType.trim()
        : 'image/jpeg',
      size: Number.isFinite(image.size) ? image.size : null,
      resolution: typeof image.resolution === 'string' ? image.resolution : null,
      createdAt: typeof image.createdAt === 'string' ? image.createdAt : new Date().toISOString(),
      migratedAt: typeof image.migratedAt === 'string' ? image.migratedAt : undefined
    }));
};

const normalizeMemo = (memo) => {
  const createdAt = typeof memo?.createdAt === 'string' ? memo.createdAt : new Date().toISOString();
  const updatedAt = typeof memo?.updatedAt === 'string' ? memo.updatedAt : createdAt;

  return {
    ...memo,
    content: typeof memo?.content === 'string' ? memo.content : '',
    images: normalizeMemoImages(memo?.images),
    createdAt,
    updatedAt
  };
};

const normalizeFreeRecord = (record) => {
  const createdAt = typeof record?.createdAt === 'string' ? record.createdAt : new Date().toISOString();
  const updatedAt = typeof record?.updatedAt === 'string' ? record.updatedAt : createdAt;

  return {
    ...record,
    id: typeof record?.id === 'string' && record.id.trim()
      ? record.id.trim()
      : `fr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title: typeof record?.title === 'string' ? record.title : '',
    content: typeof record?.content === 'string' ? record.content : '',
    images: normalizeMemoImages(record?.images),
    tags: normalizeVisibleTags(record?.tags, MAX_RECORD_TAGS),
    createdAt,
    updatedAt
  };
};

const getCurrentTimeKey = (value = new Date()) => {
  const hours = String(value.getHours()).padStart(2, '0');
  const minutes = String(value.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const createDefaultReminderSettings = (enabled = false) => {
  const todayKey = getLocalDateKey();
  const nowTimeKey = getCurrentTimeKey();

  return {
    enabled: Boolean(enabled),
    notificationTitle: DEFAULT_REMINDER_NOTIFICATION_TITLE,
    notificationBody: DEFAULT_REMINDER_NOTIFICATION_BODY,
    reminders: [
      createReminderItem(DEFAULT_REMINDER_TIME, {
        id: 'default-reminder-noon',
        lastTriggeredDate: enabled && nowTimeKey >= DEFAULT_REMINDER_TIME ? todayKey : null
      }),
      createReminderItem(DEFAULT_SECONDARY_REMINDER_TIME, {
        id: 'default-reminder-evening',
        lastTriggeredDate: enabled && nowTimeKey >= DEFAULT_SECONDARY_REMINDER_TIME ? todayKey : null
      })
    ]
  };
};

const getMillisecondsUntilNextMidnight = (now = new Date()) => {
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return Math.max(nextMidnight.getTime() - now.getTime(), 1000);
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

const initialItemCountMap = initialItems.reduce((acc, item) => {
  acc[item.id] = item.totalEnjoyCount || 0;
  return acc;
}, {});
const initialItemTagMap = {
  h21: ['혼자', '실내', '편안함'],
  h22: ['혼자', '짧게', '즐거움'],
  h23: ['혼자', '짧게', '뿌듯함'],
  h24: ['혼자', '실내', '새로움'],
  h25: ['혼자', '실내', '편안함'],
  h26: ['혼자', '짧게', '편안함'],
  h27: ['혼자', '유료', '새로움'],
  h28: ['혼자', '길게', '즐거움'],
  h29: ['함께', '유료', '즐거움'],
  h30: ['혼자', '짧게', '설렘'],
  h31: ['혼자', '실내', '새로움'],
  h32: ['혼자', '유료', '뿌듯함'],
  h33: ['함께', '유료', '감동'],
  h34: ['혼자', '길게', '뿌듯함'],
  h35: ['혼자', '길게', '뿌듯함'],
  h36: ['혼자', '활동적', '뿌듯함'],
  h37: ['혼자', '길게', '즐거움'],
  h38: ['혼자', '짧게', '감동'],
  h39: ['혼자', '실내', '감동'],
  h40: ['혼자', '실외', '새로움'],
  h41: ['혼자', '짧게', '즐거움'],
  h42: ['혼자', '유료', '새로움'],
  h43: ['함께', '유료', '감동'],
  h44: ['혼자', '실내', '감동'],
  h45: ['혼자', '휴식', '감동'],
  h46: ['혼자', '실외', '활동적'],
  h47: ['혼자', '길게', '위로'],
  h48: ['혼자', '활동적', '뿌듯함']
};
const initialItemDefaultMap = new Map(initialItems.map(item => [
  item.id,
  {
    ...item,
    tags: normalizeVisibleTags(item.tags || initialItemTagMap[item.id])
  }
]));

const getCreatorIdsForCurrentUser = (authUser) => {
  if (typeof authUser?.id === 'string' && authUser.id) {
    return new Set([authUser.id]);
  }

  return new Set([getGuestLocalCreatorId(), LEGACY_LOCAL_CREATOR_ID]);
};

const isOwnedByCurrentUser = (item, authUser) => (
  getCreatorIdsForCurrentUser(authUser).has(item?.creatorId)
  || (!authUser?.id && item?.isCustom && item?.creator === 'user' && !item?.creatorId)
);

const getKoreanAuthErrorMessage = (error, fallbackMessage) => {
  const rawMessage = typeof error?.message === 'string' ? error.message.trim() : '';
  const message = rawMessage.toLowerCase();

  if (!rawMessage) {
    return fallbackMessage;
  }

  if (message.includes('invalid login credentials')) {
    return '이메일이 없거나 비밀번호가 맞지 않아요. 가입한 이메일을 다시 확인하거나 비밀번호를 재설정해주세요.';
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

  if (message.includes('cancel') || message.includes('canceled') || message.includes('cancelled') || message.includes('1001')) {
    return '로그인이 취소됐어요.';
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

const isValidEmailFormat = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const isGoogleIdentityUser = (user) => (
  user?.app_metadata?.provider === 'google'
  || user?.app_metadata?.providers?.includes?.('google')
  || user?.identities?.some?.(identity => identity?.provider === 'google')
);

const isAppleIdentityUser = (user) => (
  user?.app_metadata?.provider === 'apple'
  || user?.app_metadata?.providers?.includes?.('apple')
  || user?.identities?.some?.(identity => identity?.provider === 'apple')
);

const shouldResetAuthSession = (error) => {
  const rawMessage = typeof error?.message === 'string' ? error.message.trim() : '';
  const rawCode = typeof error?.code === 'string' ? error.code.trim() : '';
  const normalizedMessage = rawMessage.toLowerCase();
  const normalizedCode = rawCode.toLowerCase();

  return (
    error?.status === 401
    || error?.status === 403
    || normalizedMessage.includes('jwt')
    || normalizedMessage.includes('session not found')
    || normalizedMessage.includes('refresh token')
    || normalizedMessage.includes('user from sub claim in jwt does not exist')
    || normalizedMessage.includes('user not found')
    || normalizedCode.includes('session')
    || normalizedCode.includes('user_not_found')
  );
};

const normalizeStoredReminderNotificationText = (value, fallback, maxLength) => {
  if (typeof value !== 'string') {
    return fallback;
  }

  return value.slice(0, maxLength);
};

const isLegacyDefaultReminder = (reminder) => (
  isRecord(reminder)
  && reminder.time === '20:00'
  && (
    reminder.id === 'default-reminder'
    || reminder.id === 'legacy-reminder'
  )
);

const isRecoverableAuthFetchError = (error) => {
  const rawMessage = typeof error?.message === 'string' ? error.message.trim() : '';
  const rawCode = typeof error?.code === 'string' ? error.code.trim() : '';
  const normalizedMessage = rawMessage.toLowerCase();
  const normalizedCode = rawCode.toLowerCase();

  return (
    normalizedMessage.includes('failed to fetch')
    || normalizedMessage.includes('network')
    || normalizedCode.includes('fetch')
  );
};

const getNormalizedNickname = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const getAuthUserNickname = (user, profileNickname = '') => {
  const normalizedProfileNickname = getNormalizedNickname(profileNickname);

  if (normalizedProfileNickname) {
    return normalizedProfileNickname;
  }

  const normalizedMetadataNickname = getNormalizedNickname(user?.user_metadata?.nickname);

  if (normalizedMetadataNickname) {
    return normalizedMetadataNickname;
  }

  return '';
};

const getAuthUserOnboardingState = (user, profileNickname = '') => {
  const metadata = isRecord(user?.user_metadata) ? user.user_metadata : {};

  return {
    nickname: getAuthUserNickname(user, profileNickname),
    isOver14: metadata.ageConfirmed === true,
    hasAcceptedTerms: metadata.termsAccepted === true,
    hasAcceptedPrivacy: metadata.privacyAccepted === true,
    hasAcceptedMarketing: metadata.marketingAccepted === true
  };
};

const getAuthUserDisplayName = (user, profileNickname = '') => {
  const candidates = [
    getAuthUserNickname(user, profileNickname)
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

  if (provider === 'apple') {
    return 'Apple';
  }

  return '소셜 로그인';
};

const normalizeCategoryName = (category) => {
  if (typeof category !== 'string') {
    return category;
  }

  return LEGACY_CATEGORY_MAP[category] || category;
};

const normalizeItem = (item, savedStamps = {}) => {
  const initialDefaults = initialItemDefaultMap.get(item.id) || {};
  const itemTags = Array.isArray(item.tags) && item.tags.length > 0
    ? item.tags
    : initialDefaults.tags;
  const ownCount = getStampCountFromData(savedStamps[item.id]);
  const baseCount = Number.isFinite(item.totalEnjoyCount)
    ? item.totalEnjoyCount
    : (initialItemCountMap[item.id] || 0);
  const isCustom = item.isCustom === true;

  return {
    ...item,
    isPublic: isCustom ? item.isPublic === true : true,
    isCloudBacked: item.isCloudBacked === true,
    category: normalizeCategoryName(item.category),
    creatorId: item.creatorId || (item.isCustom && item.creator === 'user' ? getGuestLocalCreatorId() : undefined),
    previewImage: item.previewImage || initialDefaults.previewImage || '',
    tags: normalizeVisibleTags(itemTags || []),
    totalEnjoyCount: Math.max(baseCount, ownCount)
  };
};

const normalizeRemoteCatalogItem = (item, localItemMap = new Map()) => {
  const matchedLocalItem = localItemMap.get(item.id);
  const remoteTags = normalizeVisibleTags(item.tags, MAX_RECORD_TAGS);
  const preservedTags = remoteTags.length > 0
    ? remoteTags
    : normalizeVisibleTags(matchedLocalItem?.tags, MAX_RECORD_TAGS);

  return {
    id: item.id,
    title: item.title,
    description: item.description,
    category: normalizeCategoryName(item.category),
    isCustom: item.source === 'custom',
    creator: item.source === 'custom' ? 'user' : 'system',
    creatorId: typeof item.owner_user_id === 'string' ? item.owner_user_id : undefined,
    isPublic: item.source === 'system' || item.is_public === true,
    isCloudBacked: true,
    tags: preservedTags,
    totalEnjoyCount: Number.isFinite(matchedLocalItem?.totalEnjoyCount)
      ? matchedLocalItem.totalEnjoyCount
      : undefined
  };
};

const mergeRemoteItemsWithLocalItems = ({
  localItems,
  remoteItems,
  savedStamps = {},
  authUser
}) => {
  const nextLocalItems = Array.isArray(localItems) ? localItems : [];
  const localItemMap = new Map(nextLocalItems.map(item => [item.id, item]));
  const normalizedRemoteItems = remoteItems.map(item => normalizeItem(
    normalizeRemoteCatalogItem(item, localItemMap),
    savedStamps
  ));
  const remoteIds = new Set(normalizedRemoteItems.map(item => item.id));
  const preservedLocalCustomItems = nextLocalItems
    .filter(item => (
      item?.isCustom
      && item?.isCloudBacked !== true
      && !remoteIds.has(item.id)
      && isOwnedByCurrentUser(item, authUser)
    ))
    .map(item => normalizeItem(item, savedStamps));

  return [...preservedLocalCustomItems, ...normalizedRemoteItems];
};

const mergeItemsWithInitialItems = (savedItems, savedStamps = {}) => {
  if (!Array.isArray(savedItems) || savedItems.length === 0) {
    return initialItems.map(item => normalizeItem(item, savedStamps));
  }

  const activeSystemItemIds = new Set(initialItems.map(item => item.id));
  const normalizedSavedItems = savedItems
    .map(item => normalizeItem(item, savedStamps))
    .filter(item => item?.isCustom || activeSystemItemIds.has(item.id));
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

  const notificationTitle = normalizeStoredReminderNotificationText(
    value.notificationTitle,
    DEFAULT_REMINDER_NOTIFICATION_TITLE,
    REMINDER_NOTIFICATION_TITLE_MAX_LENGTH
  );
  const notificationBody = normalizeStoredReminderNotificationText(
    value.notificationBody,
    DEFAULT_REMINDER_NOTIFICATION_BODY,
    REMINDER_NOTIFICATION_BODY_MAX_LENGTH
  );

  if (!Array.isArray(value.reminders)) {
    const normalizedLegacyReminder = normalizeReminderItem({
      id: 'legacy-reminder',
      time: value.time,
      lastTriggeredDate: value.lastTriggeredDate
    }, 'legacy-reminder');

    if (isLegacyDefaultReminder(normalizedLegacyReminder)) {
      return {
        ...createDefaultReminderSettings(Boolean(value.enabled)),
        notificationTitle,
        notificationBody
      };
    }

    return {
      enabled: Boolean(value.enabled),
      notificationTitle,
      notificationBody,
      reminders: [normalizedLegacyReminder]
    };
  }

  const normalizedReminders = value.reminders.map((reminder, index) => normalizeReminderItem(reminder, `reminder-${index + 1}`));

  if (normalizedReminders.length === 1 && isLegacyDefaultReminder(normalizedReminders[0])) {
    return {
      ...createDefaultReminderSettings(Boolean(value.enabled)),
      notificationTitle,
      notificationBody
    };
  }

  return {
    enabled: Boolean(value.enabled),
    notificationTitle,
    notificationBody,
    reminders: normalizedReminders
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

const normalizeFreeRecords = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(normalizeFreeRecord)
    .filter(record => record.title.trim() || record.content.trim() || record.images.length > 0)
    .sort((leftRecord, rightRecord) => (
      getComparableDateValue(rightRecord.updatedAt) - getComparableDateValue(leftRecord.updatedAt)
    ));
};

const createCloudSnapshotPayload = ({
  items,
  userStamps,
  userFavorites,
  userMemos,
  freeRecords,
  isDarkMode,
  globalStreak,
  reminderSettings
}) => ({
  version: 3,
  items,
  userStamps,
  userFavorites,
  userMemos,
  freeRecords,
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
    freeRecords: normalizeFreeRecords(payload?.freeRecords),
    isDarkMode: Boolean(payload?.isDarkMode),
    globalStreak: normalizeGlobalStreak(payload?.globalStreak),
    reminderSettings: normalizeReminderSettings(payload?.reminderSettings)
  };
};

const getGuestCreatorIdSet = (guestCreatorId = getGuestLocalCreatorId()) => (
  new Set(
    [guestCreatorId, LEGACY_LOCAL_CREATOR_ID]
      .filter(value => typeof value === 'string' && value.trim())
  )
);

const getNormalizedCreatorId = value => (
  typeof value === 'string' ? value.trim() : ''
);

const shouldPromoteCustomItemToAccount = (item, authUserId, guestCreatorIds = getGuestCreatorIdSet()) => {
  if (!item?.isCustom || item?.creator !== 'user' || !authUserId) {
    return false;
  }

  const creatorId = getNormalizedCreatorId(item.creatorId);

  if (creatorId === authUserId) {
    return true;
  }

  if (creatorId && guestCreatorIds.has(creatorId)) {
    return true;
  }

  return !creatorId && item.isCloudBacked !== true;
};

const promoteCustomItemToAccount = (item, authUserId, guestCreatorIds = getGuestCreatorIdSet()) => {
  if (!shouldPromoteCustomItemToAccount(item, authUserId, guestCreatorIds)) {
    return item;
  }

  return {
    ...item,
    creator: 'user',
    creatorId: authUserId
  };
};

const repairCloudSnapshotForAuthenticatedUser = (snapshot, authUserId, guestCreatorIds = getGuestCreatorIdSet()) => {
  const normalizedSnapshot = normalizeCloudSnapshot(snapshot);
  let didRepairOwnership = false;

  const repairedItems = normalizedSnapshot.items.map(item => {
    const repairedItem = promoteCustomItemToAccount(item, authUserId, guestCreatorIds);

    if (repairedItem !== item) {
      didRepairOwnership = true;
    }

    return repairedItem;
  });

  return {
    snapshot: {
      ...normalizedSnapshot,
      items: mergeItemsWithInitialItems(repairedItems, normalizedSnapshot.userStamps)
    },
    didRepairOwnership
  };
};

const getComparableDateValue = value => {
  const normalizedValue = typeof value === 'string' ? value.trim() : '';

  if (!normalizedValue) {
    return Number.NEGATIVE_INFINITY;
  }

  const timestamp = Date.parse(normalizedValue);
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
};

const getMostRecentDateValue = (...values) => {
  let latestValue = null;
  let latestTimestamp = Number.NEGATIVE_INFINITY;

  values.forEach(value => {
    const normalizedValue = typeof value === 'string' ? value.trim() : '';
    const timestamp = getComparableDateValue(normalizedValue);

    if (!normalizedValue || timestamp <= latestTimestamp) {
      return;
    }

    latestValue = normalizedValue;
    latestTimestamp = timestamp;
  });

  return latestValue;
};

const mergeStampEntry = (baseEntry, incomingEntry) => {
  const mergedCount = getStampCountFromData(baseEntry) + getStampCountFromData(incomingEntry);

  if (mergedCount <= 0) {
    return null;
  }

  const mergedLastStampedDate = getMostRecentDateValue(
    baseEntry?.lastStampedDate,
    incomingEntry?.lastStampedDate
  );

  return mergedLastStampedDate
    ? {
        count: mergedCount,
        lastStampedDate: mergedLastStampedDate
      }
    : { count: mergedCount };
};

const mergeUserStampMap = (baseStamps = {}, incomingStamps = {}) => {
  const mergedStamps = {};
  const itemIds = new Set([
    ...Object.keys(isRecord(baseStamps) ? baseStamps : {}),
    ...Object.keys(isRecord(incomingStamps) ? incomingStamps : {})
  ]);

  itemIds.forEach(itemId => {
    const mergedEntry = mergeStampEntry(baseStamps[itemId], incomingStamps[itemId]);

    if (mergedEntry) {
      mergedStamps[itemId] = mergedEntry;
    }
  });

  return mergedStamps;
};

const getMemoMergeKey = memo => {
  const normalizedId = getNormalizedCreatorId(memo?.id);

  if (normalizedId) {
    return `id:${normalizedId}`;
  }

  return `fallback:${memo?.createdAt || ''}:${memo?.content || ''}`;
};

const mergeMemoCollection = (baseMemos = [], incomingMemos = []) => {
  const mergedMemoMap = new Map();

  [...baseMemos, ...incomingMemos]
    .map(normalizeMemo)
    .forEach(memo => {
      const mergeKey = getMemoMergeKey(memo);
      const previousMemo = mergedMemoMap.get(mergeKey);

      if (!previousMemo || getComparableDateValue(memo.updatedAt) >= getComparableDateValue(previousMemo.updatedAt)) {
        mergedMemoMap.set(mergeKey, memo);
      }
    });

  return Array.from(mergedMemoMap.values())
    .sort((leftMemo, rightMemo) => getComparableDateValue(rightMemo.updatedAt) - getComparableDateValue(leftMemo.updatedAt));
};

const mergeMemoMap = (baseMemoMap = {}, incomingMemoMap = {}) => {
  const mergedMemoMap = {};
  const itemIds = new Set([
    ...Object.keys(isRecord(baseMemoMap) ? baseMemoMap : {}),
    ...Object.keys(isRecord(incomingMemoMap) ? incomingMemoMap : {})
  ]);

  itemIds.forEach(itemId => {
    const mergedMemos = mergeMemoCollection(baseMemoMap[itemId], incomingMemoMap[itemId]);

    if (mergedMemos.length > 0) {
      mergedMemoMap[itemId] = mergedMemos;
    }
  });

  return mergedMemoMap;
};

const mergeFreeRecords = (baseRecords = [], incomingRecords = []) => {
  const mergedRecordMap = new Map();

  [...normalizeFreeRecords(baseRecords), ...normalizeFreeRecords(incomingRecords)]
    .forEach(record => {
      const mergeKey = getMemoMergeKey(record);
      const previousRecord = mergedRecordMap.get(mergeKey);

      if (!previousRecord || getComparableDateValue(record.updatedAt) >= getComparableDateValue(previousRecord.updatedAt)) {
        mergedRecordMap.set(mergeKey, record);
      }
    });

  return Array.from(mergedRecordMap.values())
    .sort((leftRecord, rightRecord) => getComparableDateValue(rightRecord.updatedAt) - getComparableDateValue(leftRecord.updatedAt));
};

const mergeGlobalStreak = (baseStreak, incomingStreak) => {
  const normalizedBaseStreak = normalizeGlobalStreak(baseStreak);
  const normalizedIncomingStreak = normalizeGlobalStreak(incomingStreak);
  const baseTimestamp = getComparableDateValue(normalizedBaseStreak.lastDate);
  const incomingTimestamp = getComparableDateValue(normalizedIncomingStreak.lastDate);

  if (incomingTimestamp > baseTimestamp) {
    return normalizedIncomingStreak;
  }

  if (baseTimestamp > incomingTimestamp) {
    return normalizedBaseStreak;
  }

  return normalizedIncomingStreak.current > normalizedBaseStreak.current
    ? normalizedIncomingStreak
    : normalizedBaseStreak;
};

const dedupeItemsById = (items = []) => {
  const seenItemIds = new Set();

  return items.filter(item => {
    const itemId = typeof item?.id === 'string' ? item.id.trim() : '';

    if (!itemId || seenItemIds.has(itemId)) {
      return false;
    }

    seenItemIds.add(itemId);
    return true;
  });
};

const mergeCloudSnapshotsForAuthenticatedUser = ({
  cloudSnapshot,
  localSnapshot,
  authUserId,
  guestCreatorIds = getGuestCreatorIdSet()
}) => {
  const { snapshot: normalizedCloudSnapshot, didRepairOwnership } = repairCloudSnapshotForAuthenticatedUser(
    cloudSnapshot,
    authUserId,
    guestCreatorIds
  );
  const { snapshot: normalizedLocalSnapshot } = repairCloudSnapshotForAuthenticatedUser(
    localSnapshot,
    authUserId,
    guestCreatorIds
  );
  const mergedUserStamps = mergeUserStampMap(
    normalizedCloudSnapshot.userStamps,
    normalizedLocalSnapshot.userStamps
  );
  const mergedItems = mergeItemsWithInitialItems(
    dedupeItemsById([
      ...normalizedLocalSnapshot.items.filter(item => item?.isCustom && item?.creatorId === authUserId),
      ...normalizedCloudSnapshot.items
    ]),
    mergedUserStamps
  );

  return {
    snapshot: {
      items: mergedItems,
      userStamps: mergedUserStamps,
      userFavorites: {
        ...normalizedCloudSnapshot.userFavorites,
        ...normalizedLocalSnapshot.userFavorites
      },
      userMemos: mergeMemoMap(
        normalizedCloudSnapshot.userMemos,
        normalizedLocalSnapshot.userMemos
      ),
      freeRecords: mergeFreeRecords(
        normalizedCloudSnapshot.freeRecords,
        normalizedLocalSnapshot.freeRecords
      ),
      isDarkMode: normalizedCloudSnapshot.isDarkMode,
      globalStreak: mergeGlobalStreak(
        normalizedCloudSnapshot.globalStreak,
        normalizedLocalSnapshot.globalStreak
      ),
      reminderSettings: normalizedCloudSnapshot.reminderSettings
    },
    didRepairOwnership
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

  const [freeRecords, setFreeRecords] = useState(() => {
    const savedFreeRecords = readStoredJson('happy_free_records', []);
    return normalizeFreeRecords(savedFreeRecords);
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
  const [marketingConsent, setMarketingConsent] = useState(() => (
    Boolean(readStoredJson(MARKETING_CONSENT_STORAGE_KEY, false))
  ));
  const [reminderDayKey, setReminderDayKey] = useState(() => getLocalDateKey());

  const [notificationPermission, setNotificationPermission] = useState(() => {
    if (isNativeNotificationPlatform()) {
      return 'default';
    }

    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }

    return window.Notification.permission;
  });
  const [exactAlarmPermission, setExactAlarmPermission] = useState(() => (
    isNativeAndroidNotificationPlatform() ? 'default' : 'unsupported'
  ));
  const [hasLoadedInitialNotificationPermission, setHasLoadedInitialNotificationPermission] = useState(() => (
    !isNativeNotificationPlatform()
  ));
  const pendingReminderEnableRef = useRef(false);

  const [authSession, setAuthSession] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [reviewAuthUser, setReviewAuthUser] = useState(() => readStoredReviewAdminAuthUser());
  const [authProfileNickname, setAuthProfileNickname] = useState('');
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
  const isMigratingMemoImagesRef = useRef(false);
  const cloudSyncTimeoutRef = useRef(null);
  const latestSnapshotStateRef = useRef(null);
  const authUserIdRef = useRef(null);
  const isGuestModeRef = useRef(isGuestMode);
  const pendingGuestDataMigrationRef = useRef(false);
  const isPasswordRecoveryRef = useRef(hasPasswordRecoveryInUrl());
  const postSignOutFeedbackRef = useRef(null);
  const lastHandledNativeAuthCallbackRef = useRef(readLastHandledNativeAuthCallback());
  const effectiveAuthUser = reviewAuthUser || authUser;
  const isReviewAuthUser = Boolean(reviewAuthUser);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    let timeoutId;

    const scheduleReminderDayRefresh = () => {
      timeoutId = window.setTimeout(() => {
        setReminderDayKey(getLocalDateKey());
        scheduleReminderDayRefresh();
      }, getMillisecondsUntilNextMidnight() + 100);
    };

    scheduleReminderDayRefresh();

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  const startReviewAdminSession = (user = createReviewAdminUser()) => {
    setReviewAuthUser(user);
    writeStoredReviewAdminAuthUser(user);
  };

  const clearReviewAdminSession = () => {
    setReviewAuthUser(null);
    clearStoredReviewAdminAuthUser();
  };

  useEffect(() => {
    if (authUser && reviewAuthUser) {
      clearReviewAdminSession();
    }
  }, [authUser, reviewAuthUser]);

  useEffect(() => {
    authUserIdRef.current = authUser?.id || null;
  }, [authUser?.id]);

  useEffect(() => {
    isGuestModeRef.current = isGuestMode;
  }, [isGuestMode]);

  const syncResolvedAuthState = (session, user = session?.user ?? null) => {
    const nextUser = user ?? null;
    const nextSession = session
      ? {
        ...session,
        ...(nextUser ? { user: nextUser } : {})
      }
      : null;
    const nextUserId = nextUser?.id || null;
    const shouldPromoteGuestData = Boolean(
      nextUserId
      && !authUserIdRef.current
      && isGuestModeRef.current
    );

    if (shouldPromoteGuestData) {
      pendingGuestDataMigrationRef.current = true;
    }

    setAuthSession(nextSession);
    setAuthUser(nextUser);
    setAuthProfileNickname(getAuthUserNickname(nextUser));
    writeStoredAuthSessionBackup(nextSession);

    if (!nextUser) {
      setIsSignupCompletionPending(false);
      pendingGuestDataMigrationRef.current = false;
    }

    return {
      session: nextSession,
      user: nextUser
    };
  };

  const syncAuthProfileNickname = useEffectEvent(async (user) => {
    const fallbackNickname = getAuthUserNickname(user);

    if (!supabase || !user?.id) {
      setAuthProfileNickname(fallbackNickname);
      return fallbackNickname;
    }

    const { data, error } = await supabase
      .from(PROFILES_TABLE)
      .select('nickname')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      setAuthProfileNickname(fallbackNickname);
      return fallbackNickname;
    }

    const nextNickname = getAuthUserNickname(user, data?.nickname);
    setAuthProfileNickname(nextNickname);
    return nextNickname;
  });

  const applyNativeAuthCallbackUrl = useEffectEvent(async (urlString) => {
    if (!supabase || !Capacitor.isNativePlatform()) {
      return;
    }

    const normalizedUrl = typeof urlString === 'string' ? urlString.trim() : '';

    if (!normalizedUrl || lastHandledNativeAuthCallbackRef.current === normalizedUrl) {
      return;
    }

    const callbackPath = getNativeAuthCallbackPathFromUrl(urlString);

    if (!callbackPath) {
      return;
    }

    lastHandledNativeAuthCallbackRef.current = normalizedUrl;
    writeLastHandledNativeAuthCallback(normalizedUrl);

    let parsedUrl = null;

    try {
      parsedUrl = new URL(urlString);
    } catch {
      return;
    }

    const searchParams = new URLSearchParams(parsedUrl.search);
    const hashParams = new URLSearchParams(
      parsedUrl.hash.startsWith('#') ? parsedUrl.hash.slice(1) : parsedUrl.hash
    );
    const authParams = new URLSearchParams(searchParams);

    hashParams.forEach((value, key) => {
      authParams.set(key, value);
    });

    const errorDescription = authParams.get('error_description') || authParams.get('error');

    if (errorDescription) {
      setAuthFeedback({
        type: 'error',
        message: getKoreanAuthErrorMessage(
          { message: errorDescription },
          '로그인을 완료하지 못했어요.'
        )
      });
      return;
    }

    const authCode = authParams.get('code');
    const accessToken = authParams.get('access_token');
    const refreshToken = authParams.get('refresh_token');
    const redirectType = authParams.get('type');
    const isPasswordResetCallback = callbackPath === PASSWORD_RESET_PATH || redirectType === 'recovery';

    if (!authCode && (!accessToken || !refreshToken)) {
      if (isPasswordResetCallback) {
        setIsPasswordRecovery(true);
      }
      return;
    }

    setIsAuthLoading(true);

    let nextSession = null;
    let authError = null;

    if (authCode) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(authCode);
      nextSession = data.session ?? null;
      authError = error;
    } else if (accessToken && refreshToken) {
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });
      nextSession = data.session ?? null;
      authError = error;
    }

    if (authError) {
      setIsAuthLoading(false);
      setAuthFeedback(getAuthFeedbackFromError(authError, '로그인을 완료하지 못했어요.'));
      return;
    }

    if (nextSession?.user) {
      syncResolvedAuthState(nextSession, nextSession.user);
      setIsGuestMode(false);
      localStorage.removeItem(AUTH_MODE_STORAGE_KEY);
      await syncAuthProfileNickname(nextSession.user);
    }

    setIsPasswordRecovery(isPasswordResetCallback);

    if (isPasswordResetCallback) {
      setAuthFeedback({
        type: 'success',
        message: '새 비밀번호를 설정해주세요.'
      });
    } else {
      setAuthFeedback(defaultAuthFeedback);
    }

    setIsAuthLoading(false);

    try {
      await Browser.close();
    } catch {
      // Browser.close is a no-op on Android.
    }
  });

  const clearSignedInAuthState = () => {
    syncResolvedAuthState(null, null);
    clearSupabaseAuthStorage();
    setIsGuestMode(false);
    setIsPasswordRecovery(false);
    setIsSignupCompletionPending(false);
    localStorage.removeItem(AUTH_MODE_STORAGE_KEY);
  };

  const ensureTrustedAuthSession = async () => {
    if (!supabase) {
      return { success: false, error: 'Supabase가 연결되지 않았어요.' };
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    let nextSession = sessionData.session ?? null;

    if (!nextSession) {
      const storedSessionBackup = readStoredAuthSessionBackup();

      if (storedSessionBackup) {
        const { data: restoredData, error: restoreError } = await supabase.auth.setSession(storedSessionBackup);

        if (restoreError) {
          clearStoredAuthSessionBackup();
        } else {
          nextSession = restoredData.session ?? null;
        }
      }
    }

    if (!nextSession) {
      clearSignedInAuthState();
      return {
        success: false,
        error: getKoreanAuthErrorMessage(sessionError, '인증 정보가 만료되었어요. 다시 로그인해주세요.'),
        reason: 'missing_session'
      };
    }

    let userResult = await supabase.auth.getUser();

    if (userResult.error && shouldResetAuthSession(userResult.error)) {
      const { data: refreshedData, error: refreshError } = await supabase.auth.refreshSession();

      if (!refreshError && refreshedData.session) {
        nextSession = refreshedData.session;
        userResult = await supabase.auth.getUser();
      }
    }

    if (userResult.error) {
      if (shouldResetAuthSession(userResult.error)) {
        clearSignedInAuthState();
        return {
          success: false,
          error: '인증 정보가 만료되었어요. 다시 로그인해주세요.',
          reason: 'invalid_session'
        };
      }

      return {
        success: true,
        ...syncResolvedAuthState(nextSession, nextSession.user ?? authUser ?? null)
      };
    }

    return {
      success: true,
      ...syncResolvedAuthState(nextSession, userResult.data?.user ?? nextSession.user ?? authUser ?? null)
    };
  };

  useEffect(() => {
    isPasswordRecoveryRef.current = isPasswordRecovery;
  }, [isPasswordRecovery]);

  useEffect(() => {
    if (!authUser?.id) {
      setAuthProfileNickname('');
      return;
    }

    syncAuthProfileNickname(authUser);
  }, [authUser]);

  useEffect(() => {
    if (!authUser || isReviewAuthUser) {
      return;
    }

    setMarketingConsent(getAuthUserOnboardingState(authUser, authProfileNickname).hasAcceptedMarketing);
  }, [authProfileNickname, authUser, isReviewAuthUser]);

  useEffect(() => {
    if (!supabase || !Capacitor.isNativePlatform()) {
      return undefined;
    }

    let isMounted = true;
    let listenerHandle = null;

    const processCallbackUrl = async (urlString) => {
      if (!isMounted || typeof urlString !== 'string' || !urlString.trim()) {
        return;
      }

      await applyNativeAuthCallbackUrl(urlString);
    };

    App.getLaunchUrl().then(result => {
      void processCallbackUrl(result?.url);
    });

    App.addListener('appUrlOpen', data => {
      void processCallbackUrl(data?.url);
    }).then(handle => {
      listenerHandle = handle;
    });

    return () => {
      isMounted = false;
      listenerHandle?.remove();
    };
  }, []);

  useEffect(() => {
    if (!isNativeNotificationPlatform()) {
      return undefined;
    }

    let isMounted = true;

    const syncPermission = async () => {
      const [permission, exactAlarm] = await Promise.all([
        checkNativeNotificationPermission(),
        checkNativeExactAlarmPermission()
      ]);

      if (isMounted) {
        setNotificationPermission(permission);
        setExactAlarmPermission(exactAlarm);
        setHasLoadedInitialNotificationPermission(true);
      }
    };

    syncPermission();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (
      !isNativeNotificationPlatform()
      || !hasLoadedInitialNotificationPermission
      || notificationPermission !== 'default'
      || typeof window === 'undefined'
      || window.localStorage.getItem(INITIAL_NOTIFICATION_PERMISSION_PROMPTED_STORAGE_KEY) === 'true'
    ) {
      return undefined;
    }

    let isMounted = true;

    const promptInitialNotificationPermission = async () => {
      window.localStorage.setItem(INITIAL_NOTIFICATION_PERMISSION_PROMPTED_STORAGE_KEY, 'true');

      const permission = await requestNativeNotificationPermission();

      if (isMounted) {
        setNotificationPermission(permission);
      }
    };

    void promptInitialNotificationPermission();

    return () => {
      isMounted = false;
    };
  }, [hasLoadedInitialNotificationPermission, notificationPermission]);

  useEffect(() => {
    if (!supabase) {
      return undefined;
    }

    let isMounted = true;
    const clearSignedInAuthStateInEffect = () => {
      setAuthSession(null);
      setAuthUser(null);
      setAuthProfileNickname('');
      setIsGuestMode(false);
      setIsPasswordRecovery(false);
      setIsSignupCompletionPending(false);
      pendingGuestDataMigrationRef.current = false;
      localStorage.removeItem(AUTH_MODE_STORAGE_KEY);
      clearSupabaseAuthStorage();
      clearStoredAuthSessionBackup();
    };

    const resetInvalidSession = async (feedback = null) => {
      const nextFeedback = feedback || {
        type: 'error',
        message: '삭제되었거나 만료된 계정이에요. 다시 로그인해주세요.'
      };

      postSignOutFeedbackRef.current = nextFeedback;
      clearSignedInAuthStateInEffect();
      setAuthFeedback(nextFeedback);

      const { error } = await supabase.auth.signOut({ scope: 'local' });

      if (error) {
        postSignOutFeedbackRef.current = null;
      }
    };

    const getTrustedSessionState = async (session) => {
      if (!session) {
        return { session: null, user: null, invalid: false };
      }

      const { data, error } = await supabase.auth.getUser();

      if (error) {
        if (shouldResetAuthSession(error)) {
          return { session: null, user: null, invalid: true };
        }

        return {
          session,
          user: session.user ?? null,
          invalid: false
        };
      }

      if (!data?.user || data.user.deleted_at) {
        return { session: null, user: null, invalid: true };
      }

      return {
        session: {
          ...session,
          user: data.user
        },
        user: data.user,
        invalid: false
      };
    };

    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (error) {
        setAuthFeedback(getAuthFeedbackFromError(error, 'Supabase 세션을 불러오지 못했어요.'));
      }

      let nextSession = data.session ?? null;
      let nextUser = nextSession?.user ?? null;

      if (!nextSession) {
        const storedSessionBackup = readStoredAuthSessionBackup();

        if (storedSessionBackup) {
          const { data: restoredData, error: restoreError } = await supabase.auth.setSession(storedSessionBackup);

          if (!isMounted) {
            return;
          }

          if (restoreError) {
            clearStoredAuthSessionBackup();
          } else {
            nextSession = restoredData.session ?? null;
            nextUser = nextSession?.user ?? null;
          }
        }
      }

      if (nextSession) {
        const trustedSessionState = await getTrustedSessionState(nextSession);

        if (!isMounted) {
          return;
        }

        if (trustedSessionState.invalid) {
          await resetInvalidSession(defaultAuthFeedback);

          if (!isMounted) {
            return;
          }

          setIsAuthLoading(false);
          return;
        }

        nextSession = trustedSessionState.session;
        nextUser = trustedSessionState.user;
      }

      syncResolvedAuthState(nextSession, nextUser ?? null);

      if (nextUser?.id) {
        await syncAuthProfileNickname(nextUser);
      }

      setIsAuthLoading(false);
    };

    loadSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) {
        return;
      }

      const isRecoverySession = event === 'PASSWORD_RECOVERY' || hasPasswordRecoveryInUrl();
      const nextSession = session ?? null;
      const nextUser = session?.user ?? null;

      syncResolvedAuthState(nextSession, nextUser);

      if (nextUser?.id) {
        void syncAuthProfileNickname(nextUser);
      }

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
          message: '재설정 되었습니다.'
        });
      }

      if (event === 'SIGNED_OUT') {
        clearSignedInAuthStateInEffect();
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
      freeRecords,
      isDarkMode,
      globalStreak,
      reminderSettings
    };
  }, [items, userStamps, userFavorites, userMemos, freeRecords, isDarkMode, globalStreak, reminderSettings]);

  const syncRemoteCatalogItems = useEffectEvent(async () => {
    if (!supabase) {
      return { success: false, reason: 'supabase_unavailable' };
    }

    let { data, error } = await supabase
      .from(HAPPINESS_ITEMS_TABLE)
      .select(HAPPINESS_ITEM_SELECT_COLUMNS_WITH_TAGS)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (isMissingTagsColumnError(error)) {
      const fallbackResult = await supabase
        .from(HAPPINESS_ITEMS_TABLE)
        .select(HAPPINESS_ITEM_SELECT_COLUMNS)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      data = fallbackResult.data;
      error = fallbackResult.error;
    }

    if (error) {
      return { success: false, error };
    }

    const remoteItems = Array.isArray(data) ? data : [];
    const nextUserStamps = isRecord(latestSnapshotStateRef.current?.userStamps)
      ? latestSnapshotStateRef.current.userStamps
      : {};

    setItems(prev => mergeRemoteItemsWithLocalItems({
      localItems: prev,
      remoteItems,
      savedStamps: nextUserStamps,
      authUser
    }));

    return { success: true };
  });

  const applyCloudSnapshot = (payload) => {
    const snapshot = normalizeCloudSnapshot(payload);
    isApplyingCloudSnapshotRef.current = true;
    setItems(snapshot.items);
    setUserStamps(snapshot.userStamps);
    setUserFavorites(snapshot.userFavorites);
    setUserMemos(snapshot.userMemos);
    setFreeRecords(snapshot.freeRecords);
    setIsDarkMode(snapshot.isDarkMode);
    setGlobalStreak(snapshot.globalStreak);
    setReminderSettings(snapshot.reminderSettings);
  };

  useEffect(() => {
    if (!isApplyingCloudSnapshotRef.current) {
      return;
    }

    isApplyingCloudSnapshotRef.current = false;
  }, [items, userStamps, userFavorites, userMemos, freeRecords, isDarkMode, globalStreak, reminderSettings]);

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
      const guestCreatorIds = getGuestCreatorIdSet();
      const shouldPromoteGuestData = pendingGuestDataMigrationRef.current === true;
      const { snapshot: promotedLocalSnapshot } = repairCloudSnapshotForAuthenticatedUser(
        latestSnapshotStateRef.current,
        authUser.id,
        guestCreatorIds
      );

      const { data, error } = await supabase
        .from(CLOUD_SNAPSHOT_TABLE)
        .select('payload, updated_at')
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (error) {
        await syncRemoteCatalogItems();

        if (!isMounted) {
          return;
        }

        setCloudSyncStatus({
          type: 'error',
          message: '클라우드 기록 테이블을 아직 만들지 않았거나 접근할 수 없어요.',
          lastSyncedAt: null
        });
        setIsCloudSyncing(false);
        return;
      }

      if (isRecord(data?.payload)) {
        const snapshotResult = shouldPromoteGuestData
          ? mergeCloudSnapshotsForAuthenticatedUser({
              cloudSnapshot: data.payload,
              localSnapshot: promotedLocalSnapshot,
              authUserId: authUser.id,
              guestCreatorIds
            })
          : repairCloudSnapshotForAuthenticatedUser(data.payload, authUser.id, guestCreatorIds);
        const nextSnapshot = snapshotResult.snapshot;
        const shouldPersistSnapshot = shouldPromoteGuestData || snapshotResult.didRepairOwnership;

        applyCloudSnapshot(nextSnapshot);
        hasBootstrappedCloudRef.current = true;

        if (shouldPersistSnapshot) {
          const { error: persistError } = await supabase
            .from(CLOUD_SNAPSHOT_TABLE)
            .upsert({
              user_id: authUser.id,
              payload: nextSnapshot
            }, {
              onConflict: 'user_id'
            });

          if (!isMounted) {
            return;
          }

          if (persistError) {
            setCloudSyncStatus({
              type: 'error',
              message: '계정 기록은 불러왔지만 로컬 기록을 계정에 저장하지 못했어요.',
              lastSyncedAt: typeof data.updated_at === 'string' ? data.updated_at : null
            });
            setIsCloudSyncing(false);
            return;
          }
        }

        pendingGuestDataMigrationRef.current = false;
        await syncRemoteCatalogItems();

        if (!isMounted) {
          return;
        }

        setCloudSyncStatus({
          type: 'success',
          message: shouldPromoteGuestData
            ? '게스트 기록을 계정에 연결하고 클라우드 기록을 불러왔어요.'
            : shouldPersistSnapshot
              ? '계정 기록을 정리해서 다시 저장했어요.'
              : '클라우드에 저장된 기록을 불러왔어요.',
          lastSyncedAt: shouldPersistSnapshot
            ? new Date().toISOString()
            : (typeof data.updated_at === 'string' ? data.updated_at : new Date().toISOString())
        });
        setIsCloudSyncing(false);
        return;
      }

      const payload = shouldPromoteGuestData
        ? promotedLocalSnapshot
        : normalizeCloudSnapshot(latestSnapshotStateRef.current);

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

      applyCloudSnapshot(payload);
      hasBootstrappedCloudRef.current = true;
      pendingGuestDataMigrationRef.current = false;
      await syncRemoteCatalogItems();

      if (!isMounted) {
        return;
      }

      setCloudSyncStatus({
        type: 'success',
        message: shouldPromoteGuestData
          ? '게스트 기록을 계정에 처음 저장했어요.'
          : '로컬 기록을 클라우드에 처음 백업했어요.',
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
    if (!supabase) {
      return undefined;
    }

    let isMounted = true;
    let appStateListener;

    const refreshRemoteCatalog = async () => {
      const result = await syncRemoteCatalogItems();

      if (!isMounted || !result.success) {
        return;
      }
    };

    void refreshRemoteCatalog();

    App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        void refreshRemoteCatalog();
      }
    }).then(handle => {
      appStateListener = handle;
    });

    return () => {
      isMounted = false;

      if (appStateListener) {
        void appStateListener.remove();
      }
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
    localStorage.setItem('happy_free_records', JSON.stringify(freeRecords));
  }, [freeRecords]);

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
    localStorage.setItem(MARKETING_CONSENT_STORAGE_KEY, JSON.stringify(marketingConsent));
  }, [marketingConsent]);

  useEffect(() => {
    if (
      !supabase
      || !authUser?.id
      || !isNativeMemoImageAvailable()
      || isMigratingMemoImagesRef.current
    ) {
      return undefined;
    }

    const localImageJobs = [];

    Object.entries(userMemos).forEach(([itemId, memos]) => {
      if (!Array.isArray(memos)) {
        return;
      }

      memos.map(normalizeMemo).forEach(memo => {
        memo.images
          .filter(image => image.storageType === 'local')
          .forEach(image => {
            localImageJobs.push({
              itemId,
              memoId: memo.id,
              image
            });
          });
      });
    });

    freeRecords.map(normalizeFreeRecord).forEach(record => {
      record.images
        .filter(image => image.storageType === 'local')
        .forEach(image => {
          localImageJobs.push({
            itemId: FREE_RECORD_IMAGE_ITEM_ID,
            memoId: record.id,
            image
          });
        });
    });

    if (localImageJobs.length === 0) {
      return undefined;
    }

    let isCancelled = false;
    isMigratingMemoImagesRef.current = true;

    const migrateLocalImages = async () => {
      const migratedImageMap = new Map();

      for (const job of localImageJobs) {
        try {
          const migratedImage = await uploadLocalMemoImageToCloud({
            image: job.image,
            supabase,
            authUserId: authUser.id,
            itemId: job.itemId,
            memoId: job.memoId
          });

          if (migratedImage) {
            migratedImageMap.set(`${job.itemId}:${job.memoId}:${job.image.id}`, migratedImage);
          }
        } catch {
          // Keep the local image reference if cloud upload is not available yet.
        }
      }

      if (isCancelled || migratedImageMap.size === 0) {
        return;
      }

      setUserMemos(prev => {
        const nextMemoMap = {};
        let didChange = false;

        Object.entries(prev).forEach(([itemId, memos]) => {
          if (!Array.isArray(memos)) {
            return;
          }

          nextMemoMap[itemId] = memos.map(memo => {
            const normalizedMemo = normalizeMemo(memo);
            let didMemoChange = false;
            const nextImages = normalizedMemo.images.map(image => {
              const migratedImage = migratedImageMap.get(`${itemId}:${normalizedMemo.id}:${image.id}`);

              if (!migratedImage) {
                return image;
              }

              didChange = true;
              didMemoChange = true;
              return migratedImage;
            });

            return didMemoChange
              ? {
                ...normalizedMemo,
                images: nextImages,
                updatedAt: new Date().toISOString()
              }
              : normalizedMemo;
          });
        });

        return didChange ? nextMemoMap : prev;
      });

      setFreeRecords(prev => {
        let didChange = false;
        const nextRecords = prev.map(record => {
          const normalizedRecord = normalizeFreeRecord(record);
          let didRecordChange = false;
          const nextImages = normalizedRecord.images.map(image => {
            const migratedImage = migratedImageMap.get(`${FREE_RECORD_IMAGE_ITEM_ID}:${normalizedRecord.id}:${image.id}`);

            if (!migratedImage) {
              return image;
            }

            didChange = true;
            didRecordChange = true;
            return migratedImage;
          });

          return didRecordChange
            ? {
                ...normalizedRecord,
                images: nextImages,
                updatedAt: new Date().toISOString()
              }
            : normalizedRecord;
        });

        return didChange ? nextRecords : prev;
      });
    };

    void migrateLocalImages().finally(() => {
      isMigratingMemoImagesRef.current = false;
    });

    return () => {
      isCancelled = true;
    };
  }, [authUser?.id, userMemos, freeRecords]);

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
        freeRecords,
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
  }, [authUser?.id, items, userStamps, userFavorites, userMemos, freeRecords, isDarkMode, globalStreak, reminderSettings]);

  useEffect(() => {
    if (!isNativeNotificationPlatform()) {
      return undefined;
    }

    let isMounted = true;
    const reminderNotificationContent = {
      notificationTitle: reminderSettings.notificationTitle,
      notificationBody: reminderSettings.notificationBody
    };

    const syncReminders = async () => {
      await syncNativeReminderNotifications(
        reminderSettings.reminders,
        reminderSettings.enabled,
        globalStreak,
        reminderNotificationContent
      );
      const [permission, exactAlarm] = await Promise.all([
        checkNativeNotificationPermission(),
        checkNativeExactAlarmPermission()
      ]);

      if (isMounted) {
        setNotificationPermission(permission);
        setExactAlarmPermission(exactAlarm);

        if (!hasRequiredNativeReminderPermissions(permission) && reminderSettings.enabled) {
          setReminderSettings(prev => (
            prev.enabled
              ? { ...prev, enabled: false }
              : prev
          ));
        }
      }
    };

    syncReminders();

    return () => {
      isMounted = false;
    };
  }, [
    globalStreak,
    reminderDayKey,
    reminderSettings.enabled,
    reminderSettings.notificationBody,
    reminderSettings.notificationTitle,
    reminderSettings.reminders
  ]);

  useEffect(() => {
    if (!isNativeNotificationPlatform()) {
      return undefined;
    }

    let isMounted = true;
    let appStateListener;
    const reminderNotificationContent = {
      notificationTitle: reminderSettings.notificationTitle,
      notificationBody: reminderSettings.notificationBody
    };

    const refreshNativeReminderState = async () => {
      await syncNativeReminderNotifications(
        reminderSettings.reminders,
        reminderSettings.enabled,
        globalStreak,
        reminderNotificationContent
      );
      const [permission, exactAlarm] = await Promise.all([
        checkNativeNotificationPermission(),
        checkNativeExactAlarmPermission()
      ]);

      if (!isMounted) {
        return;
      }

      setNotificationPermission(permission);
      setExactAlarmPermission(exactAlarm);

      if (hasRequiredNativeReminderPermissions(permission) && pendingReminderEnableRef.current) {
        pendingReminderEnableRef.current = false;
        setReminderSettings(prev => (
          prev.enabled
            ? prev
            : applyReminderEnabledState(prev, true)
        ));
        return;
      }

      if (!hasRequiredNativeReminderPermissions(permission) && reminderSettings.enabled) {
        setReminderSettings(prev => (
          prev.enabled
            ? { ...prev, enabled: false }
            : prev
        ));
      }
    };

    App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        void refreshNativeReminderState();
      }
    }).then(handle => {
      appStateListener = handle;
    });

    return () => {
      isMounted = false;

      if (appStateListener) {
        void appStateListener.remove();
      }
    };
  }, [
    globalStreak,
    reminderSettings.enabled,
    reminderSettings.notificationBody,
    reminderSettings.notificationTitle,
    reminderSettings.reminders
  ]);

  useEffect(() => {
    if (
      typeof window === 'undefined'
      || !reminderSettings.enabled
      || reminderSettings.reminders.length === 0
      || notificationPermission !== 'granted'
      || isNativeNotificationPlatform()
    ) {
      return undefined;
    }

    const checkReminder = () => {
      const now = new Date();
      const todayKey = getLocalDateKey(now);
      const currentTimeKey = getCurrentTimeKey(now);
      const reminderNotificationContent = {
        notificationTitle: reminderSettings.notificationTitle,
        notificationBody: reminderSettings.notificationBody
      };
      const dueReminderIds = reminderSettings.reminders
        .filter(reminder => currentTimeKey >= reminder.time && reminder.lastTriggeredDate !== todayKey)
        .map(reminder => reminder.id);

      if (dueReminderIds.length === 0) {
        return;
      }

      const reminderContent = getReminderNotificationContent(globalStreak, now, reminderNotificationContent);
      new window.Notification(reminderContent.title, {
        body: reminderContent.body
      });

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
  }, [
    globalStreak,
    notificationPermission,
    reminderSettings.enabled,
    reminderSettings.notificationBody,
    reminderSettings.notificationTitle,
    reminderSettings.reminders
  ]);

  const addCustomItem = async (title, description, category, visibility = 'private', tags = []) => {
    const isPublic = visibility === 'public';
    const canSyncToCloud = Boolean(supabase && authUser?.id);
    const normalizedTags = normalizeVisibleTags(tags, MAX_RECORD_TAGS);

    if (isPublic && !canSyncToCloud) {
      return { success: false, code: 'AUTH_REQUIRED' };
    }

    const newItem = {
      id: createCustomItemId(),
      title,
      description,
      category: normalizeCategoryName(category),
      isCustom: true,
      creator: 'user',
      creatorId: authUser?.id || getGuestLocalCreatorId(),
      isPublic,
      isCloudBacked: false,
      tags: normalizedTags,
      totalEnjoyCount: 0
    };

    if (canSyncToCloud) {
      const cloudItemPayload = {
        id: newItem.id,
        title: newItem.title,
        description: newItem.description,
        category: newItem.category,
        source: 'custom',
        owner_user_id: authUser.id,
        is_active: true,
        is_public: isPublic,
        tags: normalizedTags
      };
      let { error } = await supabase
        .from(HAPPINESS_ITEMS_TABLE)
        .insert(cloudItemPayload);

      if (isMissingTagsColumnError(error)) {
        const fallbackResult = await supabase
          .from(HAPPINESS_ITEMS_TABLE)
          .insert(omitTagsFromPayload(cloudItemPayload));

        error = fallbackResult.error;
      }

      if (error) {
        if (isPublic) {
          return { success: false, code: 'SAVE_FAILED', error };
        }
      } else {
        newItem.isCloudBacked = true;
      }
    }

    const nextUserStamps = isRecord(latestSnapshotStateRef.current?.userStamps)
      ? latestSnapshotStateRef.current.userStamps
      : {};

    setItems(prev => [normalizeItem(newItem, nextUserStamps), ...prev]);
    return { success: true, item: newItem };
  };

  const updateCustomItemVisibility = async (itemId, visibility = 'private') => {
    const targetItem = items.find(item => item.id === itemId);

    if (!targetItem || !targetItem.isCustom || !isOwnedByCurrentUser(targetItem, authUser)) {
      return { success: false, code: 'NOT_FOUND' };
    }

    const isPublic = visibility === 'public';
    const canSyncToCloud = Boolean(supabase && authUser?.id);

    if (isPublic && !canSyncToCloud) {
      return { success: false, code: 'AUTH_REQUIRED' };
    }

    let nextCloudBacked = targetItem.isCloudBacked === true;
    let nextCreatorId = targetItem.creatorId;

    if (canSyncToCloud) {
      const normalizedTags = normalizeVisibleTags(targetItem.tags, MAX_RECORD_TAGS);

      if (targetItem.isCloudBacked && targetItem.creatorId === authUser.id) {
        let { error } = await supabase
          .from(HAPPINESS_ITEMS_TABLE)
          .update({
            is_public: isPublic,
            tags: normalizedTags
          })
          .eq('id', targetItem.id)
          .eq('source', 'custom')
          .eq('owner_user_id', authUser.id);

        if (isMissingTagsColumnError(error)) {
          const fallbackResult = await supabase
            .from(HAPPINESS_ITEMS_TABLE)
            .update({
              is_public: isPublic
            })
            .eq('id', targetItem.id)
            .eq('source', 'custom')
            .eq('owner_user_id', authUser.id);

          error = fallbackResult.error;
        }

        if (error) {
          return { success: false, code: 'SAVE_FAILED', error };
        }
      } else {
        const cloudItemPayload = {
          id: targetItem.id,
          title: targetItem.title,
          description: targetItem.description,
          category: normalizeCategoryName(targetItem.category),
          source: 'custom',
          owner_user_id: authUser.id,
          is_active: true,
          is_public: isPublic,
          tags: normalizedTags
        };
        let { error } = await supabase
          .from(HAPPINESS_ITEMS_TABLE)
          .upsert(cloudItemPayload, {
            onConflict: 'id'
          });

        if (isMissingTagsColumnError(error)) {
          const fallbackResult = await supabase
            .from(HAPPINESS_ITEMS_TABLE)
            .upsert(omitTagsFromPayload(cloudItemPayload), {
              onConflict: 'id'
            });

          error = fallbackResult.error;
        }

        if (error) {
          return { success: false, code: 'SAVE_FAILED', error };
        }
      }

      nextCloudBacked = true;
      nextCreatorId = authUser.id;
    }

    setItems(prev => prev.map(item => (
      item.id === itemId
        ? {
          ...item,
          isPublic,
          isCloudBacked: nextCloudBacked,
          creatorId: nextCreatorId,
          creator: 'user'
        }
        : item
    )));

    return {
      success: true,
      item: {
        ...targetItem,
        isPublic,
        isCloudBacked: nextCloudBacked,
        creatorId: nextCreatorId,
        creator: 'user'
      }
    };
  };

  const deleteCustomItem = async (itemId) => {
    const targetItem = items.find(item => item.id === itemId);

    if (!targetItem || !targetItem.isCustom || !isOwnedByCurrentUser(targetItem, authUser)) {
      return false;
    }

    if (supabase && authUser?.id && targetItem.creatorId === authUser.id) {
      const { data, error } = await supabase.functions.invoke(DELETE_HAPPINESS_ITEM_FUNCTION_NAME, {
        body: {
          itemId
        }
      });

      if (error) {
        return false;
      }

      if (!data?.success && data?.code !== 'NOT_FOUND') {
        return false;
      }
    }

    const memoImagesForCleanup = Array.isArray(userMemos[itemId])
      ? userMemos[itemId].flatMap(memo => normalizeMemo(memo).images)
      : [];

    if (memoImagesForCleanup.length > 0) {
      void deleteMemoStoredImages({ images: memoImagesForCleanup, supabase });
    }

    setItems(prev => prev.filter(item => item.id !== itemId));

    setUserStamps(prev => {
      if (!(itemId in prev)) {
        return prev;
      }

      const next = { ...prev };
      delete next[itemId];
      return next;
    });

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

  const getMyItems = () => {
    return items.filter(item => isOwnedByCurrentUser(item, authUser));
  };

  const getFavoriteItems = () => {
    return items.filter(item => userFavorites[item.id]);
  };

  const getItemMemos = (itemId) => {
    const savedMemos = userMemos[itemId];
    return Array.isArray(savedMemos) ? savedMemos.map(normalizeMemo) : [];
  };

  const cleanupMemoImages = images => {
    const normalizedImages = normalizeMemoImages(images);

    if (normalizedImages.length === 0) {
      return;
    }

    void deleteMemoStoredImages({ images: normalizedImages, supabase });
  };

  const addMemo = (itemId, content, images = [], options = {}) => {
    const trimmedContent = typeof content === 'string' ? content.trim() : '';
    const normalizedImages = normalizeMemoImages(images);

    if (!trimmedContent && normalizedImages.length === 0) {
      return null;
    }

    const nowIso = new Date().toISOString();
    const nextMemo = {
      id: typeof options.id === 'string' && options.id.trim() ? options.id.trim() : `m_${Date.now()}`,
      content: trimmedContent,
      images: normalizedImages,
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

  const updateMemo = (itemId, memoId, content, images = null) => {
    const trimmedContent = typeof content === 'string' ? content.trim() : '';
    const hasNextImages = Array.isArray(images);
    const normalizedImages = hasNextImages ? normalizeMemoImages(images) : null;

    if (!trimmedContent && (!hasNextImages || normalizedImages.length === 0)) {
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
        const nextImages = hasNextImages ? normalizedImages : memo.images;
        const nextImageIds = new Set(normalizeMemoImages(nextImages).map(image => image.id));
        const removedImages = normalizeMemoImages(memo.images).filter(image => !nextImageIds.has(image.id));

        cleanupMemoImages(removedImages);

        return {
          ...memo,
          content: trimmedContent,
          images: nextImages,
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
      const deletedMemo = currentMemos.find(memo => memo.id === memoId);
      const nextMemos = currentMemos.filter(memo => memo.id !== memoId);

      if (nextMemos.length === currentMemos.length) {
        return prev;
      }

      didDelete = true;
      cleanupMemoImages(deletedMemo?.images);

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

  const getAllRecords = () => {
    const itemById = new Map(items.map(item => [item.id, item]));
    const listRecords = Object.entries(userMemos).flatMap(([itemId, memos]) => {
      if (!Array.isArray(memos)) {
        return [];
      }

      const linkedItem = itemById.get(itemId);

      return memos.map(normalizeMemo)
        .filter(memo => memo.content.trim() || memo.images.length > 0)
        .map(memo => ({
          ...memo,
          recordKey: `list:${itemId}:${memo.id}`,
          sourceType: 'list',
          itemId,
          item: linkedItem || null,
          itemTitle: linkedItem?.title || '삭제된 행복',
          itemDescription: linkedItem?.description || '',
          tags: []
        }));
    });

    const freeRecordEntries = freeRecords.map(record => {
      const normalizedRecord = normalizeFreeRecord(record);

      return {
        ...normalizedRecord,
        recordKey: `free:${normalizedRecord.id}`,
        sourceType: 'free',
        itemId: null,
        item: null,
        itemTitle: '기록',
        itemDescription: ''
      };
    });

    return [...listRecords, ...freeRecordEntries]
      .sort((leftRecord, rightRecord) => (
        getComparableDateValue(rightRecord.updatedAt) - getComparableDateValue(leftRecord.updatedAt)
      ));
  };

  const getFreeRecords = () => freeRecords.map(normalizeFreeRecord);

  const addFreeRecord = (content, images = [], options = {}) => {
    const trimmedContent = typeof content === 'string' ? content.trim() : '';
    const trimmedTitle = typeof options.title === 'string' ? options.title.trim() : '';
    const normalizedImages = normalizeMemoImages(images);
    const normalizedTags = normalizeVisibleTags(options.tags, MAX_RECORD_TAGS);

    if (!trimmedTitle && !trimmedContent && normalizedImages.length === 0) {
      return null;
    }

    const nowIso = new Date().toISOString();
    const nextRecord = {
      id: typeof options.id === 'string' && options.id.trim() ? options.id.trim() : `fr_${Date.now()}`,
      title: trimmedTitle,
      content: trimmedContent,
      images: normalizedImages,
      tags: normalizedTags,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    setFreeRecords(prev => [nextRecord, ...prev.map(normalizeFreeRecord)]);

    return nextRecord;
  };

  const updateFreeRecord = (recordId, content, images = null, options = {}) => {
    const trimmedContent = typeof content === 'string' ? content.trim() : '';
    const trimmedTitle = typeof options.title === 'string' ? options.title.trim() : '';
    const hasNextImages = Array.isArray(images);
    const normalizedImages = hasNextImages ? normalizeMemoImages(images) : null;
    const normalizedTags = normalizeVisibleTags(options.tags, MAX_RECORD_TAGS);

    if (!trimmedTitle && !trimmedContent && (!hasNextImages || normalizedImages.length === 0)) {
      return false;
    }

    let didUpdate = false;

    setFreeRecords(prev => {
      const nextRecords = prev.map(record => {
        const normalizedRecord = normalizeFreeRecord(record);

        if (normalizedRecord.id !== recordId) {
          return normalizedRecord;
        }

        didUpdate = true;
        const nextImages = hasNextImages ? normalizedImages : normalizedRecord.images;
        const nextImageIds = new Set(normalizeMemoImages(nextImages).map(image => image.id));
        const removedImages = normalizeMemoImages(normalizedRecord.images).filter(image => !nextImageIds.has(image.id));

        cleanupMemoImages(removedImages);

        return {
          ...normalizedRecord,
          title: trimmedTitle,
          content: trimmedContent,
          images: nextImages,
          tags: normalizedTags,
          updatedAt: new Date().toISOString()
        };
      });

      return didUpdate ? nextRecords : prev;
    });

    return didUpdate;
  };

  const deleteFreeRecord = (recordId) => {
    let didDelete = false;

    setFreeRecords(prev => {
      const normalizedRecords = prev.map(normalizeFreeRecord);
      const deletedRecord = normalizedRecords.find(record => record.id === recordId);
      const nextRecords = normalizedRecords.filter(record => record.id !== recordId);

      if (nextRecords.length === normalizedRecords.length) {
        return prev;
      }

      didDelete = true;
      cleanupMemoImages(deletedRecord?.images);
      return nextRecords;
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
    clearReviewAdminSession();
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
    setFreeRecords([]);
    setIsDarkMode(false);
    setGlobalStreak({ current: 0, lastDate: null });
    setReminderSettings(defaultReminderSettings);
    setMarketingConsent(false);
    setCloudSyncStatus(defaultCloudSyncStatus);
    setIsCloudSyncing(false);
    hasBootstrappedCloudRef.current = false;
    latestSnapshotStateRef.current = null;
    pendingGuestDataMigrationRef.current = false;
  };

  const clearLocalAppStorage = () => {
    APP_STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
  };

  const enterIsolatedReviewAdminMode = async (user = createReviewAdminUser()) => {
    if (supabase) {
      await supabase.auth.signOut({ scope: 'local' });
    }

    clearSignedInAuthState();
    clearLocalAppStorage();
    resetLocalAppState();
    clearAuthRedirectState();
    setIsGuestMode(false);
    localStorage.removeItem(AUTH_MODE_STORAGE_KEY);
    setAuthFeedback(defaultAuthFeedback);
    startReviewAdminSession(user);
  };

  const exitIsolatedReviewAdminMode = () => {
    clearReviewAdminSession();
    clearSignedInAuthState();
    clearLocalAppStorage();
    resetLocalAppState();
    clearAuthRedirectState();
    setIsGuestMode(false);
    localStorage.removeItem(AUTH_MODE_STORAGE_KEY);
    setAuthFeedback(defaultAuthFeedback);
  };

  const signInWithPassword = async (email, password) => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    if (isReviewAdminCredentials({ usernameOrEmail: normalizedEmail, password: normalizedPassword })) {
      try {
        setIsAuthBusy(true);
        setAuthFeedback(defaultAuthFeedback);

        const reviewAdminUser = await requestReviewAdminSession({
          usernameOrEmail: normalizedEmail,
          password: normalizedPassword
        });

        await enterIsolatedReviewAdminMode(reviewAdminUser);
        setIsAuthBusy(false);
        return { success: true, reason: null };
      } catch (error) {
        setIsAuthBusy(false);
        const nextFeedback = getAuthFeedbackFromError(error, '관리자 로그인 세션을 준비하지 못했어요.');
        setAuthFeedback(nextFeedback);
        return { success: false, error: nextFeedback.message, reason: 'auth' };
      }
    }

    if (!supabase) {
      const nextFeedback = {
        type: 'error',
        message: 'Supabase 환경변수를 먼저 연결해주세요.'
      };

      setAuthFeedback(nextFeedback);
      return { success: false, error: nextFeedback.message };
    }

    if (!normalizedEmail) {
      const nextFeedback = {
        type: 'error',
        message: '이메일을 입력해주세요.'
      };

      setAuthFeedback(nextFeedback);
      return { success: false, error: nextFeedback.message, reason: 'validation' };
    }

    if (!isValidEmailFormat(normalizedEmail)) {
      const nextFeedback = {
        type: 'error',
        message: '이메일 형식을 다시 확인해주세요.'
      };

      setAuthFeedback(nextFeedback);
      return { success: false, error: nextFeedback.message, reason: 'validation' };
    }

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
        message: '비밀번호는 6자 이상이에요.'
      };

      setAuthFeedback(nextFeedback);
      return { success: false, error: nextFeedback.message, reason: 'validation' };
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

    clearReviewAdminSession();
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

    const redirectTo = getAppRedirectUrl(PASSWORD_RESET_PATH);
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
      message: '재설정 되었습니다.'
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

    if (provider === 'google' && Capacitor.isNativePlatform() && isNativeGoogleSignInConfigured()) {
      try {
        const loginResult = await signInWithNativeGoogle();
        const idToken = typeof loginResult?.result?.idToken === 'string'
          ? loginResult.result.idToken.trim()
          : '';
        const accessToken = typeof loginResult?.result?.accessToken?.token === 'string'
          ? loginResult.result.accessToken.token.trim()
          : '';

        if (!idToken) {
          throw new Error('Google ID 토큰을 가져오지 못했어요.');
        }

        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: idToken,
          ...(accessToken ? { access_token: accessToken } : {})
        });

        if (error) {
          throw error;
        }

        if (data.session?.user) {
          syncResolvedAuthState(data.session, data.user ?? data.session.user);
          setIsGuestMode(false);
          localStorage.removeItem(AUTH_MODE_STORAGE_KEY);
        }

        setIsAuthBusy(false);
        return { success: true };
      } catch (error) {
        const nativeGoogleMessage = typeof error?.message === 'string' ? error.message.toLowerCase() : '';

        if (
          nativeGoogleMessage.includes('cancel')
          || nativeGoogleMessage.includes('canceled')
          || nativeGoogleMessage.includes('cancelled')
          || nativeGoogleMessage.includes('1001')
        ) {
          setIsAuthBusy(false);
          const nextFeedback = getAuthFeedbackFromError(error, '로그인이 취소됐어요.');
          setAuthFeedback(nextFeedback);
          return { success: false, error: nextFeedback.message };
        }

        // Fall back to Supabase OAuth below. Native Google can fail on devices
        // whose Google credential or token setup does not match the release build.
      }
    }

    if (provider === 'apple' && Capacitor.isNativePlatform() && isNativeAppleSignInConfigured()) {
      try {
        const loginResult = await signInWithNativeApple();
        const idToken = typeof loginResult?.result?.idToken === 'string'
          ? loginResult.result.idToken.trim()
          : '';

        if (!idToken) {
          throw new Error('Apple ID 토큰을 가져오지 못했어요.');
        }

        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: idToken
        });

        setIsAuthBusy(false);

        if (error) {
          const nextFeedback = getAuthFeedbackFromError(error, 'Apple 로그인으로 연결하지 못했어요.');
          setAuthFeedback(nextFeedback);
          return { success: false, error: nextFeedback.message };
        }

        if (data.session?.user) {
          syncResolvedAuthState(data.session, data.user ?? data.session.user);
          setIsGuestMode(false);
          localStorage.removeItem(AUTH_MODE_STORAGE_KEY);
        }

        return { success: true };
      } catch (error) {
        setIsAuthBusy(false);
        const nextFeedback = getAuthFeedbackFromError(error, 'Apple 로그인으로 연결하지 못했어요.');
        setAuthFeedback(nextFeedback);
        return { success: false, error: nextFeedback.message };
      }
    }

    const redirectTo = getAppRedirectUrl(APP_PATH);
    const isNativePlatform = Capacitor.isNativePlatform();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        ...(redirectTo ? { redirectTo } : {}),
        ...(isNativePlatform ? { skipBrowserRedirect: true } : {})
      }
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

    if (isNativePlatform) {
      if (!data?.url) {
        const nextFeedback = {
          type: 'error',
          message: `${getAuthProviderLabel(provider)} 로그인 주소를 준비하지 못했어요.`
        };
        setAuthFeedback(nextFeedback);
        return { success: false, error: nextFeedback.message };
      }

      await openExternalUrl(data.url);
    }

    return { success: true };
  };

  const signOutFromSupabase = async () => {
    if (reviewAuthUser) {
      exitIsolatedReviewAdminMode();
      return { success: true };
    }

    if (!supabase) {
      return { success: false, error: 'Supabase가 연결되지 않았어요.' };
    }

    const shouldLogoutNativeGoogle = isGoogleIdentityUser(authUser);
    const shouldLogoutNativeApple = isAppleIdentityUser(authUser);
    setIsSignupCompletionPending(false);
    setIsAuthBusy(true);
    setAuthFeedback(defaultAuthFeedback);
    let { error } = await supabase.auth.signOut();

    if (error && (shouldResetAuthSession(error) || isRecoverableAuthFetchError(error))) {
      const { error: localSignOutError } = await supabase.auth.signOut({ scope: 'local' });

      if (!localSignOutError) {
        if (shouldLogoutNativeGoogle) {
          try {
            await signOutFromNativeGoogle();
          } catch {
            // Ignore native provider logout failures.
          }
        }
        if (shouldLogoutNativeApple) {
          try {
            await signOutFromNativeApple();
          } catch {
            // Ignore native provider logout failures.
          }
        }
        setIsAuthBusy(false);
        return { success: true };
      }

      clearSignedInAuthState();

      if (shouldLogoutNativeGoogle) {
        try {
          await signOutFromNativeGoogle();
        } catch {
          // Ignore native provider logout failures.
        }
      }
      if (shouldLogoutNativeApple) {
        try {
          await signOutFromNativeApple();
        } catch {
          // Ignore native provider logout failures.
        }
      }

      setIsAuthBusy(false);
      return { success: true };
    }

    setIsAuthBusy(false);

    if (error) {
      const nextFeedback = getAuthFeedbackFromError(error, '로그아웃하지 못했어요.');
      setAuthFeedback(nextFeedback);
      return { success: false, error: nextFeedback.message };
    }

    if (shouldLogoutNativeGoogle) {
      try {
        await signOutFromNativeGoogle();
      } catch {
        // Ignore native provider logout failures.
      }
    }
    if (shouldLogoutNativeApple) {
      try {
        await signOutFromNativeApple();
      } catch {
        // Ignore native provider logout failures.
      }
    }

    return { success: true };
  };

  const deleteAccount = async () => {
    if (!supabase || !authUser) {
      return { success: false, error: '로그인한 계정이 없어요.' };
    }

    setIsAuthBusy(true);
    setAuthFeedback(defaultAuthFeedback);

    const sessionState = await ensureTrustedAuthSession();

    if (!sessionState.success || !sessionState.user) {
      setIsAuthBusy(false);
      const nextFeedback = {
        type: 'error',
        message: sessionState.error || '인증 정보가 만료되었어요. 다시 로그인해주세요.'
      };
      setAuthFeedback(nextFeedback);
      return { success: false, error: nextFeedback.message };
    }

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
    setAuthFeedback(defaultAuthFeedback);

    const sessionState = await ensureTrustedAuthSession();

    if (!sessionState.success || !sessionState.user) {
      setIsAuthBusy(false);
      return {
        success: false,
        error: sessionState.error || '인증 정보가 만료되었어요. 다시 로그인해주세요.'
      };
    }

    const currentUser = sessionState.user;
    const { error: profileError } = await supabase
      .from(PROFILES_TABLE)
      .upsert({
        user_id: currentUser.id,
        nickname: normalizedNickname
      }, {
        onConflict: 'user_id'
      });

    if (profileError) {
      setIsAuthBusy(false);
      const nextFeedback = getAuthFeedbackFromError(profileError, '닉네임을 저장하지 못했어요.');
      setAuthFeedback(nextFeedback);
      return { success: false, error: nextFeedback.message };
    }

    setAuthProfileNickname(normalizedNickname);

    const { data, error } = await supabase.auth.updateUser({
      data: {
        ...(isRecord(currentUser.user_metadata) ? currentUser.user_metadata : {}),
        nickname: normalizedNickname
      }
    });

    setIsAuthBusy(false);

    if (error && !isRecoverableAuthFetchError(error)) {
      const nextFeedback = getAuthFeedbackFromError(error, '닉네임을 저장하지 못했어요.');
      setAuthFeedback(nextFeedback);
      return { success: false, error: nextFeedback.message };
    }

    if (data.user) {
      setAuthUser(data.user);
      setAuthSession(prev => (prev ? { ...prev, user: data.user } : prev));
    }

    setAuthFeedback(defaultAuthFeedback);

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
    setAuthFeedback(defaultAuthFeedback);

    const sessionState = await ensureTrustedAuthSession();

    if (!sessionState.success || !sessionState.user) {
      setIsAuthBusy(false);
      return {
        success: false,
        error: sessionState.error || '인증 정보가 만료되었어요. 다시 로그인해주세요.'
      };
    }

    const { data, error } = await supabase.auth.updateUser({
      data: {
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

    setMarketingConsent(Boolean(hasAcceptedMarketing));

    return { success: true };
  };

  const updateMarketingConsent = async (enabled) => {
    const nextEnabled = Boolean(enabled);

    if (!supabase || !authUser || isReviewAuthUser) {
      setMarketingConsent(nextEnabled);
      return { success: true };
    }

    setIsAuthBusy(true);
    setAuthFeedback(defaultAuthFeedback);

    const sessionState = await ensureTrustedAuthSession();

    if (!sessionState.success || !sessionState.user) {
      setIsAuthBusy(false);
      return {
        success: false,
        error: sessionState.error || '인증 정보가 만료되었어요. 다시 로그인해주세요.'
      };
    }

    const currentUser = sessionState.user;
    const { data, error } = await supabase.auth.updateUser({
      data: {
        ...(isRecord(currentUser.user_metadata) ? currentUser.user_metadata : {}),
        marketingAccepted: nextEnabled
      }
    });

    setIsAuthBusy(false);

    if (error && !isRecoverableAuthFetchError(error)) {
      const nextFeedback = getAuthFeedbackFromError(error, '마케팅 수신 설정을 저장하지 못했어요.');
      setAuthFeedback(nextFeedback);
      return { success: false, error: nextFeedback.message };
    }

    setMarketingConsent(nextEnabled);

    if (data.user) {
      setAuthUser(data.user);
      setAuthSession(prev => (prev ? { ...prev, user: data.user } : prev));
    }

    setAuthFeedback(defaultAuthFeedback);

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

  const updateReminderNotificationContent = ({ title, body } = {}) => {
    setReminderSettings(prev => ({
      ...prev,
      notificationTitle: typeof title === 'string'
        ? title.slice(0, REMINDER_NOTIFICATION_TITLE_MAX_LENGTH)
        : prev.notificationTitle,
      notificationBody: typeof body === 'string'
        ? body.slice(0, REMINDER_NOTIFICATION_BODY_MAX_LENGTH)
        : prev.notificationBody
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

  const openExactAlarmSettings = async () => {
    const permission = await openNativeExactAlarmSettings();
    setExactAlarmPermission(permission);

    if (
      permission === 'granted'
      && reminderSettings.enabled
    ) {
      await syncNativeReminderNotifications(reminderSettings.reminders, reminderSettings.enabled, globalStreak, reminderSettings);
    }

    return permission;
  };

  const toggleReminder = async (enabled) => {
    let currentPermission = notificationPermission;

    if (enabled && isNativeNotificationPlatform()) {
      const wasDenied = currentPermission === 'denied';
      currentPermission = await requestNotificationPermission();

      if (currentPermission !== 'granted') {
        if (wasDenied || currentPermission === 'denied') {
          pendingReminderEnableRef.current = true;
          await openNativeNotificationSettings();
        }

        return currentPermission;
      }

    } else if (enabled && currentPermission === 'default') {
      currentPermission = await requestNotificationPermission();
    }

    pendingReminderEnableRef.current = false;

    setReminderSettings(prev => applyReminderEnabledState(prev, enabled));

    return currentPermission;
  };

  const effectiveAuthUserOnboarding = {
    ...getAuthUserOnboardingState(effectiveAuthUser, isReviewAuthUser ? '' : authProfileNickname),
    hasAcceptedMarketing: isReviewAuthUser
      ? getAuthUserOnboardingState(effectiveAuthUser, '').hasAcceptedMarketing
      : marketingConsent
  };

  return (
    <HappyContext.Provider value={{
      items,
      userFavorites,
      addCustomItem,
      updateCustomItemVisibility,
      deleteCustomItem,
      getItemMemos,
      isItemOwnedByCurrentUser,
      addMemo,
      updateMemo,
      deleteMemo,
      getAllRecords,
      getFreeRecords,
      addFreeRecord,
      updateFreeRecord,
      deleteFreeRecord,
      getMyItems,
      getFavoriteItems,
      toggleFavorite,
      isDarkMode,
      toggleTheme,
      isSupabaseConfigured,
      authSession,
      authUser: effectiveAuthUser,
      isReviewAuthUser,
      isGuestMode,
      authUserOnboarding: effectiveAuthUserOnboarding,
      authUserNickname: getAuthUserNickname(effectiveAuthUser, isReviewAuthUser ? '' : authProfileNickname),
      authUserDisplayName: getAuthUserDisplayName(effectiveAuthUser, isReviewAuthUser ? '' : authProfileNickname),
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
      marketingConsent,
      updateMarketingConsent,
      globalStreak,
      reminderSettings,
      notificationPermission,
      exactAlarmPermission,
      toggleReminder,
      addReminder,
      updateReminder,
      updateReminderNotificationContent,
      deleteReminder,
      updateReminderTime,
      requestNotificationPermission,
      openExactAlarmSettings
    }}>
      {children}
    </HappyContext.Provider>
  );
};

