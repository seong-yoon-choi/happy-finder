import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';

const trimEnvValue = (value) => (typeof value === 'string' ? value.trim() : '');

const googleWebClientId = trimEnvValue(import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID);
const googleIosClientId = trimEnvValue(import.meta.env.VITE_GOOGLE_IOS_CLIENT_ID);

let initializePromise = null;

const getPlatformGoogleConfig = () => {
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  const platform = Capacitor.getPlatform();

  if (platform === 'android') {
    return googleWebClientId
      ? {
        webClientId: googleWebClientId,
        mode: 'online'
      }
      : null;
  }

  if (platform === 'ios') {
    return googleWebClientId && googleIosClientId
      ? {
        webClientId: googleWebClientId,
        iOSClientId: googleIosClientId,
        iOSServerClientId: googleWebClientId,
        mode: 'online'
      }
      : null;
  }

  return null;
};

export const isNativeGoogleSignInConfigured = () => Boolean(getPlatformGoogleConfig());

export const getMissingNativeGoogleSignInConfig = () => {
  if (!Capacitor.isNativePlatform()) {
    return [];
  }

  const platform = Capacitor.getPlatform();

  if (platform === 'android') {
    return googleWebClientId ? [] : ['VITE_GOOGLE_WEB_CLIENT_ID'];
  }

  if (platform === 'ios') {
    const missing = [];

    if (!googleWebClientId) {
      missing.push('VITE_GOOGLE_WEB_CLIENT_ID');
    }

    if (!googleIosClientId) {
      missing.push('VITE_GOOGLE_IOS_CLIENT_ID');
    }

    return missing;
  }

  return [];
};

export const initializeNativeGoogleSignIn = async () => {
  const googleConfig = getPlatformGoogleConfig();

  if (!googleConfig) {
    return { success: false, missing: getMissingNativeGoogleSignInConfig() };
  }

  if (!initializePromise) {
    initializePromise = SocialLogin.initialize({
      google: googleConfig
    }).catch(error => {
      initializePromise = null;
      throw error;
    });
  }

  await initializePromise;
  return { success: true };
};

export const signInWithNativeGoogle = async () => {
  await initializeNativeGoogleSignIn();

  return SocialLogin.login({
    provider: 'google',
    options: {
      filterByAuthorizedAccounts: false
    }
  });
};

export const signOutFromNativeGoogle = async () => {
  if (!isNativeGoogleSignInConfigured()) {
    return;
  }

  await initializeNativeGoogleSignIn();
  await SocialLogin.logout({ provider: 'google' });
};
