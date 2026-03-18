import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

export const openExternalUrl = async (url) => {
  if (typeof window === 'undefined' || typeof url !== 'string' || !url.trim()) {
    return false;
  }

  const normalizedUrl = url.trim();

  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url: normalizedUrl });
    return true;
  }

  const openedWindow = window.open(normalizedUrl, '_blank', 'noopener,noreferrer');
  return Boolean(openedWindow);
};
