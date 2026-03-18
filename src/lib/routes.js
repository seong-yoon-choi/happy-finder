export const APP_PATH = '/app';
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
export const isSupportPath = (value) => normalizePath(value) === SUPPORT_PATH;
export const isQnaPath = (value) => normalizePath(value) === QNA_PATH;
export const isFeedbackPath = (value) => normalizePath(value) === FEEDBACK_PATH;

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
