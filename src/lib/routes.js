export const APP_PATH = '/app';

export const normalizePath = (value) => {
  if (typeof value !== 'string' || !value.trim()) {
    return '/';
  }

  const normalized = value.replace(/\/+$/, '');
  return normalized || '/';
};

export const isAppPath = (value) => normalizePath(value) === APP_PATH;

export const getAppRedirectUrl = () => {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return `${window.location.origin}${APP_PATH}`;
};
