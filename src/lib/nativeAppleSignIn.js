import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';

const trimEnvValue = (value) => (typeof value === 'string' ? value.trim() : '');

const appleClientId = trimEnvValue(import.meta.env.VITE_APPLE_CLIENT_ID) || 'net.happyfinder.app';

let initializePromise = null;

const getPlatformAppleConfig = () => {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') {
    return null;
  }

  return {
    clientId: appleClientId,
    useProperTokenExchange: true
  };
};

export const isNativeAppleSignInConfigured = () => Boolean(getPlatformAppleConfig());

export const initializeNativeAppleSignIn = async () => {
  const appleConfig = getPlatformAppleConfig();

  if (!appleConfig) {
    return { success: false };
  }

  if (!initializePromise) {
    initializePromise = SocialLogin.initialize({
      apple: appleConfig
    }).catch(error => {
      initializePromise = null;
      throw error;
    });
  }

  await initializePromise;
  return { success: true };
};

export const signInWithNativeApple = async () => {
  await initializeNativeAppleSignIn();

  return SocialLogin.login({
    provider: 'apple',
    options: {
      scopes: ['email', 'name']
    }
  });
};

export const signOutFromNativeApple = async () => {
  if (!isNativeAppleSignInConfigured()) {
    return;
  }

  await initializeNativeAppleSignIn();
  await SocialLogin.logout({ provider: 'apple' });
};
