import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { APP_PATH } from './routes';
import { supabase } from './supabase';

const configuredRedirectUrl = import.meta.env.VITE_AUTH_REDIRECT_URL;

const parseUrl = (value) => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

const getInternalAuthUrl = (incomingUrl) => {
  const parsedUrl = parseUrl(incomingUrl);

  if (!parsedUrl) {
    return null;
  }

  return `${APP_PATH}${parsedUrl.search}${parsedUrl.hash}`;
};

const isMatchingNativeRedirect = (incomingUrl) => {
  const incoming = parseUrl(incomingUrl);
  const configured = parseUrl(configuredRedirectUrl);

  if (!incoming || !configured) {
    return false;
  }

  return incoming.protocol === configured.protocol
    && incoming.hostname === configured.hostname
    && incoming.pathname === configured.pathname;
};

const syncSupabaseSessionFromUrl = async (incomingUrl) => {
  if (!supabase) {
    return;
  }

  const parsedUrl = parseUrl(incomingUrl);

  if (!parsedUrl?.hash) {
    return;
  }

  const hashParams = new URLSearchParams(parsedUrl.hash.slice(1));
  const accessToken = hashParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token');

  if (!accessToken || !refreshToken) {
    return;
  }

  await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken
  });
};

const updateWebViewUrl = (incomingUrl) => {
  if (typeof window === 'undefined') {
    return;
  }

  const nextUrl = getInternalAuthUrl(incomingUrl);

  if (!nextUrl) {
    return;
  }

  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (currentUrl !== nextUrl) {
    window.history.replaceState({}, '', nextUrl);
  }

  window.dispatchEvent(new HashChangeEvent('hashchange'));
  window.dispatchEvent(new PopStateEvent('popstate'));
};

const handleNativeAuthUrl = async (incomingUrl) => {
  if (!incomingUrl || !isMatchingNativeRedirect(incomingUrl)) {
    return;
  }

  await syncSupabaseSessionFromUrl(incomingUrl);
  updateWebViewUrl(incomingUrl);
};

export const initializeNativeAuthBridge = async () => {
  if (Capacitor.getPlatform() === 'web' || !configuredRedirectUrl) {
    return;
  }

  const launchData = await CapacitorApp.getLaunchUrl();

  if (launchData?.url) {
    await handleNativeAuthUrl(launchData.url);
  }

  await CapacitorApp.addListener('appUrlOpen', ({ url }) => {
    void handleNativeAuthUrl(url);
  });
};
