import React, { lazy, useEffect, useEffectEvent, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { HappyProvider, useHappy } from './store/HappyContext';
import NavBar from './components/NavBar';
import AuthScreen from './components/AuthScreen';
import ExitConfirmModal from './components/ExitConfirmModal';
import AppUpdateModal from './components/AppUpdateModal';
import LazyLoadBoundary from './components/LazyLoadBoundary';
import PullToRefreshShell from './components/PullToRefreshShell';
import Home from './views/Home';
import { getAvailableAppUpdate } from './lib/appVersionPolicy';
import { openExternalUrl } from './lib/externalBrowser';
import LandingPage from './views/LandingPage';
import openingAnimationSrc from './assets/opening-clover.webp';
import {
  APP_PATH,
  PROFILE_PATH,
  SUPPORT_PATH,
  isAdminInquiriesPath,
  clearRequestedAuthModeInUrl,
  getNativeAuthCallbackPathFromUrl,
  getRequestedPostAuthPathFromUrl,
  getRequestedAuthModeFromUrl,
  getPublicWebUrl,
  isAccountDeletePath,
  isAppPath,
  isPasswordResetPath,
  isFeedbackPath,
  isProfilePath,
  isQnaPath,
  isSupportPath,
  normalizePath
} from './lib/routes';
import './App.css';

const SettingsModal = lazy(() => import('./components/SettingsModal'));
const NicknameModal = lazy(() => import('./components/NicknameModal'));
const FirstLoginSetupModal = lazy(() => import('./components/FirstLoginSetupModal'));
const Records = lazy(() => import('./views/Records'));
const Analysis = lazy(() => import('./views/Analysis'));
const Profile = lazy(() => import('./views/Profile'));
const AdminInquiriesPage = lazy(() => import('./views/AdminInquiriesPage'));
const AccountDeletePage = lazy(() => import('./views/AccountDeletePage'));
const PasswordResetPage = lazy(() => import('./views/PasswordResetPage'));
const SupportPage = lazy(() => import('./views/SupportPage'));
const WebProfilePage = lazy(() => import('./views/WebProfilePage'));
const PULL_TO_REFRESH_VIEW_STORAGE_KEY = 'happy_pull_refresh_view';
const APP_VIEW_KEYS = ['home', 'records', 'analysis', 'profile'];
const OPENING_ANIMATION_DURATION_MS = 5000;

const isNativeRuntime = () => Capacitor.isNativePlatform();

function OpeningAnimation() {
  const [isVisible, setIsVisible] = useState(() => isNativeRuntime());
  const [isAnimationReady, setIsAnimationReady] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (!isVisible) {
      return undefined;
    }

    let isMounted = true;
    const openingImage = new Image();

    openingImage.onload = () => {
      if (isMounted) {
        setIsAnimationReady(true);
      }
    };
    openingImage.onerror = () => {
      if (isMounted) {
        setIsVisible(false);
      }
    };
    openingImage.src = openingAnimationSrc;

    return () => {
      isMounted = false;
    };
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible || !isAnimationReady) {
      return undefined;
    }

    const finishTimer = window.setTimeout(() => {
      setIsLeaving(true);
    }, OPENING_ANIMATION_DURATION_MS);

    return () => {
      window.clearTimeout(finishTimer);
    };
  }, [isAnimationReady, isVisible]);

  useEffect(() => {
    if (!isLeaving) {
      return undefined;
    }

    const hideTimer = window.setTimeout(() => {
      setIsVisible(false);
    }, 320);

    return () => {
      window.clearTimeout(hideTimer);
    };
  }, [isLeaving]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`opening-video ${isLeaving ? 'opening-video--leaving' : ''}`} aria-hidden="true">
      {!isAnimationReady && (
        <div className="opening-video__loader">
          <span className="opening-video__spinner" />
          <span className="opening-video__brand">Happy Finder</span>
        </div>
      )}
      {isAnimationReady && (
        <img
          key="opening-animation-ready"
          className="opening-video__media"
          src={openingAnimationSrc}
          alt=""
          decoding="async"
          onError={() => setIsVisible(false)}
        />
      )}
    </div>
  );
}

const consumePreservedAppView = () => {
  if (typeof window === 'undefined') {
    return 'home';
  }

  const preservedView = window.sessionStorage.getItem(PULL_TO_REFRESH_VIEW_STORAGE_KEY);
  window.sessionStorage.removeItem(PULL_TO_REFRESH_VIEW_STORAGE_KEY);

  return APP_VIEW_KEYS.includes(preservedView) ? preservedView : 'home';
};

const preserveAppViewForRefresh = view => {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(
    PULL_TO_REFRESH_VIEW_STORAGE_KEY,
    APP_VIEW_KEYS.includes(view) ? view : 'home'
  );
};

const resolveRuntimePath = rawPathname => {
  const normalizedPathname = normalizePath(rawPathname);

  if (!isNativeRuntime()) {
    if (isAppPath(normalizedPathname)) {
      return '/';
    }

    return normalizedPathname;
  }

  if (
    isAppPath(normalizedPathname)
    || isPasswordResetPath(normalizedPathname)
    || isAccountDeletePath(normalizedPathname)
    || isAdminInquiriesPath(normalizedPathname)
  ) {
    return normalizedPathname;
  }

  return APP_PATH;
};

const navigateToPath = (nextPath, onNavigate) => {
  if (typeof window === 'undefined') {
    return;
  }

  const normalizedNextPath = resolveRuntimePath(nextPath);

  if (normalizePath(window.location.pathname) === normalizedNextPath) {
    return;
  }

  window.history.pushState({}, '', normalizedNextPath);
  window.scrollTo({ top: 0, left: 0 });
  onNavigate(normalizedNextPath);
};

function AppContent() {
  const initialRequestedMode = getRequestedAuthModeFromUrl();
  const [currentView, setCurrentView] = useState(() => consumePreservedAppView());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);
  const [isAuthScreenRequested, setIsAuthScreenRequested] = useState(() => Boolean(initialRequestedMode));
  const [authScreenMode, setAuthScreenMode] = useState(() => initialRequestedMode || 'login');
  const [isAgreementModalRequested, setIsAgreementModalRequested] = useState(false);
  const [dismissedAgreementUserId, setDismissedAgreementUserId] = useState(null);
  const [isNicknameModalRequested, setIsNicknameModalRequested] = useState(false);
  const [appUpdatePrompt, setAppUpdatePrompt] = useState(null);
  const [isAppUpdateDismissed, setIsAppUpdateDismissed] = useState(false);

  const {
    authUser,
    authUserNickname,
    authUserOnboarding,
    isGuestMode,
    isSignupCompletionPending,
    isPasswordRecovery
  } = useHappy();

  const isForcedAuthScreen = !authUser && !isGuestMode;
  const isAuthScreenClosable = !isForcedAuthScreen && !isPasswordRecovery && !isSignupCompletionPending;
  const isAuthScreenOpen = (
    isForcedAuthScreen
    || isPasswordRecovery
    || isSignupCompletionPending
    || (isAuthScreenRequested && !authUser)
  );
  const needsAgreementSetup = Boolean(
    authUser
      && !isGuestMode
      && !isSignupCompletionPending
      && (
        !authUserOnboarding.isOver14
        || !authUserOnboarding.hasAcceptedTerms
        || !authUserOnboarding.hasAcceptedPrivacy
      )
  );
  const needsNicknameSetup = Boolean(
    authUser
      && !isGuestMode
      && !isSignupCompletionPending
      && !needsAgreementSetup
      && !authUserOnboarding.nickname
  );
  const activeAgreementUserId = needsAgreementSetup && authUser?.id ? authUser.id : null;
  const isAgreementModalDismissed = Boolean(activeAgreementUserId && dismissedAgreementUserId === activeAgreementUserId);
  const isAgreementModalOpen = Boolean(authUser) && !isGuestMode && (
    (needsAgreementSetup && !isAgreementModalDismissed)
    || isAgreementModalRequested
  );
  const isAgreementModalClosable = !needsAgreementSetup;
  const isNicknameModalOpen = Boolean(authUser) && !isGuestMode && (
    needsNicknameSetup
    || (isNicknameModalRequested && !needsAgreementSetup)
  );
  const isNicknameModalClosable = !needsNicknameSetup;
  const isAppUpdatePromptOpen = Boolean(appUpdatePrompt && !isAppUpdateDismissed);
  const isPullToRefreshEnabled = (
    !isSettingsOpen
    && !isExitConfirmOpen
    && !isAppUpdatePromptOpen
    && !isAuthScreenOpen
    && !isAgreementModalOpen
    && !isNicknameModalOpen
  );

  const resetAuthScreenRequest = () => {
    clearRequestedAuthModeInUrl();
    setIsAuthScreenRequested(false);
    setAuthScreenMode('login');
  };

  useEffect(() => {
    if (authUser && isAuthScreenRequested) {
      queueMicrotask(() => {
        resetAuthScreenRequest();
      });
    }
  }, [authUser, isAuthScreenRequested]);

  const openAuthScreen = (mode = 'login') => {
    setAuthScreenMode(mode);
    setIsAuthScreenRequested(true);
  };

  const closeAuthScreen = () => {
    resetAuthScreenRequest();
  };

  const openAgreementModal = () => {
    setDismissedAgreementUserId(null);
    setIsAgreementModalRequested(true);
  };

  const closeAgreementModal = () => {
    setIsAgreementModalRequested(false);
    if (needsAgreementSetup && authUser?.id) {
      setDismissedAgreementUserId(authUser.id);
    }
  };

  const openNicknameModal = () => {
    setIsNicknameModalRequested(true);
  };

  const closeNicknameModal = () => {
    setIsNicknameModalRequested(false);
  };

  const handleNativeBackButton = useEffectEvent(event => {
    if (isAppUpdatePromptOpen) {
      if (!appUpdatePrompt?.isForced) {
        setIsAppUpdateDismissed(true);
      }

      return;
    }

    if (isExitConfirmOpen) {
      if (event.canGoBack) {
        window.history.back();
        return;
      }

      setIsExitConfirmOpen(false);
      return;
    }

    if (isAuthScreenOpen && !isAuthScreenClosable) {
      if (isForcedAuthScreen) {
        setIsExitConfirmOpen(true);
      }

      return;
    }

    if (event.canGoBack) {
      window.history.back();
      return;
    }

    if (isAgreementModalOpen && !isAgreementModalClosable) {
      return;
    }

    if (isNicknameModalOpen && !isNicknameModalClosable) {
      return;
    }

    if (currentView !== 'home') {
      setCurrentView('home');
      return;
    }

    setIsExitConfirmOpen(true);
  });

  useEffect(() => {
    if (!isNativeRuntime() || Capacitor.getPlatform() !== 'android') {
      return undefined;
    }

    let listenerHandle = null;

    CapacitorApp.addListener('backButton', event => {
      handleNativeBackButton(event);
    }).then(handle => {
      listenerHandle = handle;
    });

    return () => {
      listenerHandle?.remove();
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    getAvailableAppUpdate().then(nextUpdatePrompt => {
      if (isCancelled || !nextUpdatePrompt) {
        return;
      }

      setAppUpdatePrompt(nextUpdatePrompt);
      setIsAppUpdateDismissed(false);
    });

    return () => {
      isCancelled = true;
    };
  }, []);

  const handlePullRefresh = () => {
    preserveAppViewForRefresh(currentView);
    window.location.reload();
  };

  const handleConfirmExit = () => {
    setIsExitConfirmOpen(false);
    void CapacitorApp.exitApp();
  };

  const handleOpenSupport = async () => {
    const supportUrl = getPublicWebUrl(SUPPORT_PATH);

    if (!supportUrl) {
      return;
    }

    await openExternalUrl(supportUrl);
  };

  const handleCloseAppUpdatePrompt = () => {
    if (appUpdatePrompt?.isForced) {
      return;
    }

    setIsAppUpdateDismissed(true);
  };

  const handleUpdateApp = async () => {
    if (!appUpdatePrompt?.storeUrl) {
      return;
    }

    await openExternalUrl(appUpdatePrompt.storeUrl);
  };

  return (
    <div className="app-container">
      <PullToRefreshShell enabled={isPullToRefreshEnabled} onRefresh={handlePullRefresh}>
        <div className="app-top-actions">
          <button
            type="button"
            className="support-trigger-btn"
            onClick={handleOpenSupport}
            aria-label="QnA Feedback 열기"
          >
            <span className="support-trigger-label" aria-hidden="true">Q</span>
          </button>
          <button
            type="button"
            className="settings-trigger-btn"
            onClick={() => setIsSettingsOpen(true)}
            aria-label="설정 열기"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="settings-trigger-icon">
              <path
                fill="currentColor"
                d="M19.14 12.94c.04-.31.06-.62.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.16 7.16 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.49-.42h-3.84a.5.5 0 0 0-.49.42l-.36 2.54c-.58.23-1.13.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.62-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.39.31.6.22l2.39-.96c.5.4 1.05.71 1.63.94l.36 2.54c.04.24.24.42.49.42h3.84c.25 0 .45-.18.49-.42l.36-2.54c.58-.23 1.13-.54 1.63-.94l2.39.96c.22.09.47 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z"
              />
            </svg>
          </button>
        </div>

        {currentView === 'home' && <Home />}
        {currentView === 'records' && (
          <LazyLoadBoundary
            mode="page"
            loadingLabel="기록 화면을 불러오는 중이에요."
            errorTitle="기록 화면을 열지 못했어요."
            errorMessage="잠시 후 다시 시도해주세요."
            resetKey="records-view"
          >
            <Records />
          </LazyLoadBoundary>
        )}
        {currentView === 'analysis' && (
          <LazyLoadBoundary
            mode="page"
            loadingLabel="분석 화면을 불러오는 중이에요."
            errorTitle="분석 화면을 열지 못했어요."
            errorMessage="잠시 후 다시 시도해주세요."
            resetKey="analysis-view"
          >
            <Analysis />
          </LazyLoadBoundary>
        )}
        {currentView === 'profile' && (
          <LazyLoadBoundary
            mode="page"
            loadingLabel="프로필 화면을 불러오는 중이에요."
            errorTitle="프로필 화면을 열지 못했어요."
            errorMessage="잠시 후 다시 시도해주세요."
            resetKey="profile-view"
          >
            <Profile />
          </LazyLoadBoundary>
        )}

        <NavBar currentView={currentView} onViewChange={setCurrentView} />
      </PullToRefreshShell>
      <ExitConfirmModal
        isOpen={isExitConfirmOpen}
        onClose={() => setIsExitConfirmOpen(false)}
        onConfirm={handleConfirmExit}
      />
      <AppUpdateModal
        isOpen={isAppUpdatePromptOpen}
        isForced={appUpdatePrompt?.isForced}
        title={appUpdatePrompt?.title}
        message={appUpdatePrompt?.message}
        onClose={handleCloseAppUpdatePrompt}
        onUpdate={handleUpdateApp}
      />

      {isSettingsOpen && (
        <LazyLoadBoundary
          mode="overlay"
          loadingLabel="설정을 불러오는 중이에요."
          errorTitle="설정을 열지 못했어요."
          errorMessage="네트워크나 앱 상태를 확인한 뒤 다시 시도해주세요."
          onDismiss={() => setIsSettingsOpen(false)}
          resetKey="settings-modal"
        >
          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            onOpenAuth={openAuthScreen}
            onOpenAgreement={openAgreementModal}
            onOpenNicknameEditor={openNicknameModal}
          />
        </LazyLoadBoundary>
      )}

      <AuthScreen
        isOpen={isAuthScreenOpen}
        canClose={isAuthScreenClosable}
        initialMode={authScreenMode}
        onClose={closeAuthScreen}
      />

      {isAgreementModalOpen && (
        <LazyLoadBoundary
          mode="overlay"
          loadingLabel="동의 화면을 준비하고 있어요."
          errorTitle="동의 화면을 불러오지 못했어요."
          errorMessage="앱을 새로고침한 뒤 다시 시도해주세요."
          onDismiss={!needsAgreementSetup ? closeAgreementModal : undefined}
          resetKey={`first-login-${authUser?.id || 'guest'}-${authUserNickname || 'empty'}`}
        >
          <FirstLoginSetupModal
            key={`first-login-${authUser?.id || 'guest'}-${authUserNickname || 'empty'}`}
            isOpen={isAgreementModalOpen}
            canClose={!needsAgreementSetup}
            onClose={closeAgreementModal}
            onComplete={closeAgreementModal}
            initialValues={authUserOnboarding}
            lockRequiredAgreements={!needsAgreementSetup}
          />
        </LazyLoadBoundary>
      )}

      {isNicknameModalOpen && (
        <LazyLoadBoundary
          mode="overlay"
          loadingLabel="닉네임 화면을 준비하고 있어요."
          errorTitle="닉네임 화면을 불러오지 못했어요."
          errorMessage="잠시 후 다시 시도해주세요."
          onDismiss={!needsNicknameSetup ? closeNicknameModal : undefined}
          resetKey={`edit-${authUser?.id || 'guest'}-${authUserNickname || 'empty'}-${needsNicknameSetup ? 'forced' : 'manual'}`}
        >
          <NicknameModal
            key={`edit-${authUser?.id || 'guest'}-${authUserNickname || 'empty'}-${isNicknameModalOpen ? 'open' : 'closed'}-${needsNicknameSetup ? 'forced' : 'manual'}`}
            isOpen={isNicknameModalOpen}
            canClose={!needsNicknameSetup}
            onClose={closeNicknameModal}
            title={needsNicknameSetup ? '닉네임 설정' : '닉네임 바꾸기'}
            description={needsNicknameSetup ? '프로필에 표시할 닉네임을 입력해주세요.' : '프로필에 표시할 닉네임을 새로 입력해주세요.'}
            submitLabel={needsNicknameSetup ? '저장하고 시작하기' : '저장하기'}
            initialValue={authUserNickname}
          />
        </LazyLoadBoundary>
      )}
    </div>
  );
}

function PublicSiteContent({ pathname, onNavigate }) {
  const initialRequestedMode = getRequestedAuthModeFromUrl();
  const requestedPostAuthPath = getRequestedPostAuthPathFromUrl();
  const [isAuthScreenRequested, setIsAuthScreenRequested] = useState(() => Boolean(initialRequestedMode));
  const [authScreenMode, setAuthScreenMode] = useState(() => initialRequestedMode || 'login');
  const { authUser, isPasswordRecovery, isAuthBusy, signOutFromSupabase } = useHappy();
  const isAuthenticated = Boolean(authUser);

  const isProfileRoute = isProfilePath(pathname);
  const isSupportRoute = isSupportPath(pathname) || isQnaPath(pathname) || isFeedbackPath(pathname);
  const isAuthScreenOpen = isPasswordRecovery || (isAuthScreenRequested && !isAuthenticated);

  const resetAuthScreenRequest = () => {
    clearRequestedAuthModeInUrl();
    setIsAuthScreenRequested(false);
    setAuthScreenMode('login');
  };

  useEffect(() => {
    if (!authUser) {
      return;
    }

    queueMicrotask(() => {
      if (requestedPostAuthPath && normalizePath(pathname) !== requestedPostAuthPath) {
        navigateToPath(requestedPostAuthPath, onNavigate);
        resetAuthScreenRequest();
        return;
      }

      if (!isAuthScreenRequested) {
        return;
      }

      resetAuthScreenRequest();
    });
  }, [authUser, isAuthScreenRequested, onNavigate, pathname, requestedPostAuthPath]);

  const openAuthScreen = (mode = 'login') => {
    setAuthScreenMode(mode);
    setIsAuthScreenRequested(true);
  };

  const closeAuthScreen = () => {
    resetAuthScreenRequest();
  };

  const handlePublicSignOut = async () => {
    await signOutFromSupabase();
  };

  return (
    <>
      {isProfileRoute ? (
        <LazyLoadBoundary
          mode="page"
          loadingLabel="프로필 페이지를 불러오는 중이에요."
          errorTitle="프로필 페이지를 열지 못했어요."
          errorMessage="잠시 후 다시 시도해주세요."
          resetKey="web-profile-page"
        >
          <WebProfilePage
            onNavigate={onNavigate}
            onOpenAuth={() => openAuthScreen('login')}
          />
        </LazyLoadBoundary>
      ) : isSupportRoute ? (
        <LazyLoadBoundary
          mode="page"
          loadingLabel="고객지원 페이지를 불러오는 중이에요."
          errorTitle="고객지원 페이지를 열지 못했어요."
          errorMessage="잠시 후 다시 시도해주세요."
          resetKey={`support-${pathname}`}
        >
          <SupportPage
            pathname={pathname}
            onNavigate={onNavigate}
            onOpenAuth={() => openAuthScreen('login')}
            onOpenProfile={() => onNavigate(PROFILE_PATH)}
            onSignOut={handlePublicSignOut}
            isAuthBusy={isAuthBusy}
            isAuthenticated={isAuthenticated}
          />
        </LazyLoadBoundary>
      ) : (
        <LandingPage
          onOpenAuth={() => openAuthScreen('login')}
          onOpenProfile={() => onNavigate(PROFILE_PATH)}
          onSignOut={handlePublicSignOut}
          isAuthBusy={isAuthBusy}
          onNavigate={onNavigate}
          isAuthenticated={isAuthenticated}
        />
      )}

      <AuthScreen
        isOpen={isAuthScreenOpen}
        canClose={!isPasswordRecovery}
        initialMode={authScreenMode}
        onClose={closeAuthScreen}
      />
    </>
  );
}

function PasswordResetRoute() {
  return (
    <LazyLoadBoundary
      mode="page"
      loadingLabel="비밀번호 재설정 화면을 불러오는 중이에요."
      errorTitle="비밀번호 재설정 화면을 열지 못했어요."
      errorMessage="잠시 후 다시 시도해주세요."
      resetKey="password-reset-route"
    >
      <PasswordResetPage />
    </LazyLoadBoundary>
  );
}

function AccountDeleteRoute() {
  return (
    <LazyLoadBoundary
      mode="page"
      loadingLabel="계정 삭제 페이지를 불러오는 중이에요."
      errorTitle="계정 삭제 페이지를 열지 못했어요."
      errorMessage="잠시 후 다시 시도해주세요."
      resetKey="account-delete-route"
    >
      <AccountDeletePage />
    </LazyLoadBoundary>
  );
}

function AdminInquiriesRoute() {
  return (
    <LazyLoadBoundary
      mode="page"
      loadingLabel="문의 관리 페이지를 불러오는 중이에요."
      errorTitle="문의 관리 페이지를 열지 못했어요."
      errorMessage="잠시 후 다시 시도해주세요."
      resetKey="admin-inquiries-route"
    >
      <AdminInquiriesPage />
    </LazyLoadBoundary>
  );
}

function App() {
  const [pathname, setPathname] = useState(() => {
    if (typeof window === 'undefined') {
      return '/';
    }

    return resolveRuntimePath(window.location.pathname);
  });

  useEffect(() => {
    const resolvedPathname = resolveRuntimePath(window.location.pathname);

    if (resolvedPathname !== normalizePath(window.location.pathname)) {
      window.history.replaceState({}, '', resolvedPathname);
    }

    const handlePopState = () => {
      const nextPathname = resolveRuntimePath(window.location.pathname);

      if (nextPathname !== normalizePath(window.location.pathname)) {
        window.history.replaceState({}, '', nextPathname);
      }

      window.scrollTo({ top: 0, left: 0 });
      setPathname(nextPathname);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    if (!isNativeRuntime()) {
      return undefined;
    }

    let listenerHandle = null;

    const applyNativeCallbackPath = (urlString) => {
      const callbackPath = getNativeAuthCallbackPathFromUrl(urlString);

      if (!callbackPath) {
        return;
      }

      const nextPathname = resolveRuntimePath(callbackPath);

      window.history.replaceState({}, '', nextPathname);
      window.scrollTo({ top: 0, left: 0 });
      setPathname(nextPathname);
    };

    CapacitorApp.getLaunchUrl().then(result => {
      applyNativeCallbackPath(result?.url);
    });

    CapacitorApp.addListener('appUrlOpen', data => {
      applyNativeCallbackPath(data?.url);
    }).then(handle => {
      listenerHandle = handle;
    });

    return () => {
      listenerHandle?.remove();
    };
  }, []);

  if (isSupportPath(pathname) || isQnaPath(pathname) || isFeedbackPath(pathname) || isProfilePath(pathname)) {
    return (
      <HappyProvider>
        <PublicSiteContent
          pathname={pathname}
          onNavigate={nextPath => navigateToPath(nextPath, setPathname)}
        />
      </HappyProvider>
    );
  }

  if (isPasswordResetPath(pathname)) {
    return (
      <HappyProvider>
        <PasswordResetRoute />
      </HappyProvider>
    );
  }

  if (isAccountDeletePath(pathname)) {
    return (
      <HappyProvider>
        <AccountDeleteRoute />
      </HappyProvider>
    );
  }

  if (isAdminInquiriesPath(pathname)) {
    return (
      <HappyProvider>
        <AdminInquiriesRoute />
      </HappyProvider>
    );
  }

  if (!isAppPath(pathname)) {
    return (
      <HappyProvider>
        <PublicSiteContent
          pathname={pathname}
          onNavigate={nextPath => navigateToPath(nextPath, setPathname)}
        />
      </HappyProvider>
    );
  }

  return (
    <HappyProvider>
      <OpeningAnimation />
      <div className="app-shell">
        <AppContent />
      </div>
    </HappyProvider>
  );
}

export default App;
