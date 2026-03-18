export const APP_PATH = '/app';
export const PASSWORD_RESET_PATH = '/password-reset';
export const SUPPORT_PATH = '/support';
export const QNA_PATH = '/qna';
export const FEEDBACK_PATH = '/feedback';

export const normalizePath = (value) => {
  if (typeof value !== 'string' || !value.trim()) {
    return '/';
  }

  const normalized = value.replace(/\/+$/, '');
  return normalized || '/';
};

export const isAppPath = (value) => normalizePath(value) === APP_PATH;
export const isPasswordResetPath = (value) => normalizePath(value) === PASSWORD_RESET_PATH;
export const isSupportPath = (value) => normalizePath(value) === SUPPORT_PATH;
export const isQnaPath = (value) => normalizePath(value) === QNA_PATH;
export const isFeedbackPath = (value) => normalizePath(value) === FEEDBACK_PATH;

export const getRequestedAuthModeFromUrl = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  const authMode = new URLSearchParams(window.location.search).get('auth');
  return authMode === 'reset' ? 'reset-request' : null;
};

export const clearRequestedAuthModeInUrl = () => {
  if (typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.delete('auth');
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
};

export const getAppRedirectUrl = () => {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const overrideRedirectUrl = import.meta.env.VITE_AUTH_REDIRECT_URL;

  if (typeof overrideRedirectUrl === 'string' && overrideRedirectUrl.trim()) {
    return overrideRedirectUrl.trim();
  }

  return `${window.location.origin}${APP_PATH}`;
};

export const getPasswordResetWebUrl = (session) => {
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
  url.pathname = PASSWORD_RESET_PATH;
  url.searchParams.delete('auth');

  const accessToken = typeof session?.access_token === 'string' ? session.access_token : '';
  const refreshToken = typeof session?.refresh_token === 'string' ? session.refresh_token : '';

  if (accessToken && refreshToken) {
    const hashParams = new URLSearchParams();
    hashParams.set('access_token', accessToken);
    hashParams.set('refresh_token', refreshToken);
    url.hash = hashParams.toString();
  } else {
    url.hash = '';
  }

  return url.toString();
};
