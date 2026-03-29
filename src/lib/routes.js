export const APP_PATH = '/app';
export const PROFILE_PATH = '/profile';
export const PASSWORD_RESET_PATH = '/password-reset';
export const ACCOUNT_DELETE_PATH = '/account-delete';
export const ADMIN_INQUIRIES_PATH = '/admin/inquiries';
export const SUPPORT_PATH = '/support';
export const QNA_PATH = '/qna';
export const FEEDBACK_PATH = '/feedback';

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

export const normalizePath = (value) => {
  if (typeof value !== 'string' || !value.trim()) {
    return '/';
  }

  const normalized = value.replace(/\/+$/, '');
  return normalized || '/';
};

export const isAppPath = (value) => normalizePath(value) === APP_PATH;
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

    return normalizePath(url.pathname);
  } catch {
    return null;
  }
};

export const getAppRedirectUrl = (pathname = APP_PATH) => {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const normalizedTargetPath = normalizePath(pathname);
  const isHttpOrigin = window.location.origin.startsWith('http');

  if (isHttpOrigin) {
    return `${window.location.origin}${normalizedTargetPath}`;
  }

  const callbackBaseUrl = getNativeAuthCallbackBaseUrl();

  if (callbackBaseUrl) {
    const url = new URL(callbackBaseUrl.toString());
    url.pathname = normalizedTargetPath;
    url.search = '';
    url.hash = '';
    return url.toString();
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
    : window.location.origin.startsWith('http')
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
