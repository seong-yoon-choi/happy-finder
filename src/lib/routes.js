import { Capacitor } from '@capacitor/core';

export const APP_PATH = '/app';
export const HAPPINESS_DETAIL_PATH_PREFIX = `${APP_PATH}/happiness`;
export const PROFILE_PATH = '/profile';
export const PASSWORD_RESET_PATH = '/password-reset';
export const ACCOUNT_DELETE_PATH = '/account-delete';
export const ADMIN_INQUIRIES_PATH = '/admin/inquiries';
export const SUPPORT_PATH = '/support';
export const QNA_PATH = '/qna';
export const FEEDBACK_PATH = '/feedback';

const isNativeRuntime = () => Capacitor.isNativePlatform();

const getNativeAuthCallbackBaseUrl = () => {
  const overrideRedirectUrl = import.meta.env.VITE_AUTH_REDIRECT_URL;

  if (typeof overrideRedirectUrl !== 'string' || !overrideRedirectUrl.trim()) {
    return null;
  }

  try {
    return new URL(overrideRedirectUrl.trim());
  } catch {
    return null;
  }
};

const getAuthParamsFromUrl = (url) => {
  const authParams = new URLSearchParams(url.search);
  const hashParams = new URLSearchParams(
    url.hash.startsWith('#') ? url.hash.slice(1) : url.hash
  );

  hashParams.forEach((value, key) => {
    authParams.set(key, value);
  });

  return authParams;
};

export const normalizePath = (value) => {
  if (typeof value !== 'string' || !value.trim()) {
    return '/';
  }

  const normalized = value.replace(/\/+$/, '');
  return normalized || '/';
};

export const isAppPath = (value) => normalizePath(value) === APP_PATH;
export const getHappinessItemPath = (itemId) => {
  const normalizedItemId = typeof itemId === 'string' ? itemId.trim() : '';

  return normalizedItemId
    ? `${HAPPINESS_DETAIL_PATH_PREFIX}/${encodeURIComponent(normalizedItemId)}`
    : APP_PATH;
};
export const getHappinessItemIdFromPath = (value) => {
  const normalizedPath = normalizePath(value);
  const detailPrefix = `${HAPPINESS_DETAIL_PATH_PREFIX}/`;

  if (!normalizedPath.startsWith(detailPrefix)) {
    return null;
  }

  const encodedItemId = normalizedPath.slice(detailPrefix.length).split('/')[0];

  if (!encodedItemId) {
    return null;
  }

  try {
    return decodeURIComponent(encodedItemId);
  } catch {
    return encodedItemId;
  }
};
export const isHappinessItemPath = (value) => Boolean(getHappinessItemIdFromPath(value));
export const isProfilePath = (value) => normalizePath(value) === PROFILE_PATH;
export const isPasswordResetPath = (value) => normalizePath(value) === PASSWORD_RESET_PATH;
export const isAccountDeletePath = (value) => normalizePath(value) === ACCOUNT_DELETE_PATH;
export const isAdminInquiriesPath = (value) => normalizePath(value) === ADMIN_INQUIRIES_PATH;
export const isSupportPath = (value) => normalizePath(value) === SUPPORT_PATH;
export const isQnaPath = (value) => normalizePath(value) === QNA_PATH;
export const isFeedbackPath = (value) => normalizePath(value) === FEEDBACK_PATH;

export const getRequestedAuthModeFromUrl = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  const authMode = new URLSearchParams(window.location.search).get('auth');

  if (authMode === 'login' || authMode === 'signup') {
    return authMode;
  }

  if (authMode === 'reset') {
    return 'reset-request';
  }

  return null;
};

export const getRequestedPostAuthPathFromUrl = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawNextPath = new URLSearchParams(window.location.search).get('next');

  if (typeof rawNextPath !== 'string' || !rawNextPath.trim()) {
    return null;
  }

  try {
    const nextUrl = new URL(rawNextPath, window.location.origin);

    if (nextUrl.origin !== window.location.origin) {
      return null;
    }

    return normalizePath(nextUrl.pathname);
  } catch {
    return null;
  }
};

export const clearRequestedAuthModeInUrl = () => {
  if (typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.delete('auth');
  url.searchParams.delete('next');
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
};

export const getNativeAuthCallbackPathFromUrl = (urlString) => {
  if (typeof urlString !== 'string' || !urlString.trim()) {
    return null;
  }

  const callbackBaseUrl = getNativeAuthCallbackBaseUrl();

  if (!callbackBaseUrl) {
    return null;
  }

  try {
    const url = new URL(urlString);

    if (url.protocol !== callbackBaseUrl.protocol || url.host !== callbackBaseUrl.host) {
      return null;
    }

    const normalizedCallbackPath = normalizePath(callbackBaseUrl.pathname);
    const normalizedIncomingPath = normalizePath(url.pathname);

    if (normalizedIncomingPath !== normalizedCallbackPath) {
      return normalizedIncomingPath;
    }

    const authParams = getAuthParamsFromUrl(url);
    return authParams.get('type') === 'recovery' ? PASSWORD_RESET_PATH : APP_PATH;
  } catch {
    return null;
  }
};

export const getNativeAppPathFromUrl = (urlString) => {
  const authCallbackPath = getNativeAuthCallbackPathFromUrl(urlString);

  if (authCallbackPath) {
    return authCallbackPath;
  }

  if (typeof urlString !== 'string' || !urlString.trim()) {
    return null;
  }

  const overrideWebUrl = import.meta.env.VITE_AUTH_WEB_URL;

  if (typeof overrideWebUrl !== 'string' || !overrideWebUrl.trim()) {
    return null;
  }

  try {
    const incomingUrl = new URL(urlString);
    const publicWebUrl = new URL(overrideWebUrl.trim());

    if (incomingUrl.protocol !== publicWebUrl.protocol || incomingUrl.host !== publicWebUrl.host) {
      return null;
    }

    const normalizedIncomingPath = normalizePath(incomingUrl.pathname);

    if (isAppPath(normalizedIncomingPath) || isHappinessItemPath(normalizedIncomingPath)) {
      return normalizedIncomingPath;
    }
  } catch {
    return null;
  }

  return null;
};

export const getAppRedirectUrl = (pathname = APP_PATH) => {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const normalizedRequestedPath = normalizePath(pathname);
  const normalizedTargetPath = (
    !isNativeRuntime() && normalizedRequestedPath === APP_PATH
      ? '/'
      : normalizedRequestedPath
  );

  const callbackBaseUrl = getNativeAuthCallbackBaseUrl();

  if (isNativeRuntime() && callbackBaseUrl) {
    return callbackBaseUrl.toString();
  }

  const isHttpOrigin = window.location.origin.startsWith('http');

  if (isHttpOrigin) {
    return `${window.location.origin}${normalizedTargetPath}`;
  }

  return `${window.location.origin}${normalizedTargetPath}`;
};

export const getPublicWebUrl = (pathname = '/') => {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const overrideWebUrl = import.meta.env.VITE_AUTH_WEB_URL;
  const appBaseUrl = typeof overrideWebUrl === 'string' && overrideWebUrl.trim()
    ? overrideWebUrl.trim()
    : !isNativeRuntime() && window.location.origin.startsWith('http')
      ? window.location.origin
      : undefined;

  if (!appBaseUrl) {
    return undefined;
  }

  const url = new URL(appBaseUrl);
  url.pathname = normalizePath(pathname);
  url.search = '';
  url.hash = '';
  return url.toString();
};

export const getPasswordResetWebUrl = () => {
  const urlString = getPublicWebUrl(PROFILE_PATH);

  if (!urlString) {
    return undefined;
  }

  const url = new URL(urlString);
  url.searchParams.set('auth', 'login');
  url.searchParams.set('next', PASSWORD_RESET_PATH);
  url.hash = '';

  return url.toString();
};
