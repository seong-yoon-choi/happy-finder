import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { isSupabaseConfigured, supabase } from './supabase';

const APP_VERSION_POLICY_TABLE = 'app_version_policy';
const ANDROID_STORE_URL = import.meta.env.VITE_ANDROID_STORE_URL
  || 'https://play.google.com/store/apps/details?id=net.happyfinder.app';
const IOS_STORE_URL = import.meta.env.VITE_IOS_APP_STORE_URL || '';

const storeUrlFallbacks = {
  android: ANDROID_STORE_URL,
  ios: IOS_STORE_URL
};

const isSupportedPlatform = platform => platform === 'android' || platform === 'ios';

const normalizeVersion = value => (
  typeof value === 'string' ? value.trim() : ''
);

const normalizeBuildNumber = value => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const getVersionParts = value => {
  const normalizedValue = normalizeVersion(value);

  if (!normalizedValue) {
    return [];
  }

  return normalizedValue
    .split(/[.+-]/)
    .map(part => Number.parseInt(part, 10))
    .map(part => (Number.isFinite(part) ? part : 0));
};

export const compareAppVersions = (currentVersion, targetVersion) => {
  const currentParts = getVersionParts(currentVersion);
  const targetParts = getVersionParts(targetVersion);
  const maxLength = Math.max(currentParts.length, targetParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const currentPart = currentParts[index] || 0;
    const targetPart = targetParts[index] || 0;

    if (currentPart < targetPart) {
      return -1;
    }

    if (currentPart > targetPart) {
      return 1;
    }
  }

  return 0;
};

const isBelowTarget = ({ currentVersion, currentBuild }, targetVersion, targetBuild) => {
  const normalizedTargetBuild = normalizeBuildNumber(targetBuild);

  if (normalizedTargetBuild !== null && currentBuild !== null) {
    return currentBuild < normalizedTargetBuild;
  }

  const normalizedTargetVersion = normalizeVersion(targetVersion);

  if (!normalizedTargetVersion) {
    return false;
  }

  return compareAppVersions(currentVersion, normalizedTargetVersion) < 0;
};

const getNativeAppInfo = async () => {
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  const platform = Capacitor.getPlatform();

  if (!isSupportedPlatform(platform)) {
    return null;
  }

  try {
    const info = await CapacitorApp.getInfo();

    return {
      platform,
      currentVersion: normalizeVersion(info?.version),
      currentBuild: normalizeBuildNumber(info?.build)
    };
  } catch {
    return null;
  }
};

const getStoreUrl = (platform, policyStoreUrl) => {
  const policyUrl = normalizeVersion(policyStoreUrl);

  if (policyUrl) {
    return policyUrl;
  }

  return storeUrlFallbacks[platform] || '';
};

export const getAvailableAppUpdate = async () => {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  const appInfo = await getNativeAppInfo();

  if (!appInfo) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from(APP_VERSION_POLICY_TABLE)
      .select(`
        platform,
        latest_version,
        latest_build,
        minimum_version,
        minimum_build,
        force_update,
        store_url,
        title,
        message,
        is_enabled
      `)
      .eq('platform', appInfo.platform)
      .eq('is_enabled', true)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    const storeUrl = getStoreUrl(appInfo.platform, data.store_url);

    if (!storeUrl) {
      return null;
    }

    const isBelowMinimum = isBelowTarget(
      appInfo,
      data.minimum_version,
      data.minimum_build
    );
    const isBehindLatest = isBelowTarget(
      appInfo,
      data.latest_version,
      data.latest_build
    );

    if (!isBelowMinimum && !isBehindLatest) {
      return null;
    }

    return {
      platform: appInfo.platform,
      storeUrl,
      title: data.title || '업데이트가 필요합니다',
      message: data.message || '더 안정적인 이용을 위해 최신 버전으로 업데이트해주세요.',
      isForced: Boolean(isBelowMinimum || (data.force_update && isBehindLatest)),
      currentVersion: appInfo.currentVersion,
      currentBuild: appInfo.currentBuild,
      latestVersion: normalizeVersion(data.latest_version),
      latestBuild: normalizeBuildNumber(data.latest_build)
    };
  } catch {
    return null;
  }
};
