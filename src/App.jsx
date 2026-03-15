import React, { startTransition, useEffect, useState } from 'react';
import { HappyProvider, useHappy } from './store/HappyContext';
import NavBar from './components/NavBar';
import CelebrationModal from './components/CelebrationModal';
import SettingsModal from './components/SettingsModal';
import AuthScreen from './components/AuthScreen';
import NicknameModal from './components/NicknameModal';
import FirstLoginSetupModal from './components/FirstLoginSetupModal';
import Home from './views/Home';
import Profile from './views/Profile';
import LandingPage from './views/LandingPage';
import SupportPage from './views/SupportPage';
import {
  APP_PATH,
  isAppPath,
  isFeedbackPath,
  isQnaPath,
  isSupportPath,
  normalizePath
} from './lib/routes';
import './App.css';

const navigateToPath = (nextPath, onNavigate) => {
  if (typeof window === 'undefined') {
    return;
  }

  const normalizedNextPath = normalizePath(nextPath);

  if (normalizePath(window.location.pathname) === normalizedNextPath) {
    return;
  }

  window.history.pushState({}, '', normalizedNextPath);
  window.scrollTo({ top: 0, left: 0 });
  startTransition(() => onNavigate(normalizedNextPath));
};

function AppContent() {
  const [currentView, setCurrentView] = useState('home');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthScreenRequested, setIsAuthScreenRequested] = useState(false);
  const [isAgreementModalRequested, setIsAgreementModalRequested] = useState(false);
  const [isAgreementModalDismissed, setIsAgreementModalDismissed] = useState(false);
  const [isNicknameModalRequested, setIsNicknameModalRequested] = useState(false);

  const {
    activeCelebration,
    dismissCelebration,
    authUser,
    authUserNickname,
    authUserOnboarding,
    isGuestMode
  } = useHappy();

  const isForcedAuthScreen = !authUser && !isGuestMode;
  const isAuthScreenOpen = isForcedAuthScreen || (isAuthScreenRequested && !authUser);
  const needsAgreementSetup = Boolean(
    authUser
      && !isGuestMode
      && (
        !authUserOnboarding.isOver14
        || !authUserOnboarding.hasAcceptedTerms
        || !authUserOnboarding.hasAcceptedPrivacy
      )
  );
  const needsNicknameSetup = Boolean(
    authUser
      && !isGuestMode
      && !needsAgreementSetup
      && !authUserOnboarding.nickname
  );
  const isAgreementModalOpen = Boolean(authUser) && !isGuestMode && (
    (needsAgreementSetup && !isAgreementModalDismissed)
    || isAgreementModalRequested
  );
  const isNicknameModalOpen = Boolean(authUser) && !isGuestMode && (
    needsNicknameSetup
    || (isNicknameModalRequested && !needsAgreementSetup)
  );

  useEffect(() => {
    setIsAgreementModalDismissed(false);
  }, [authUser?.id]);

  useEffect(() => {
    if (!needsAgreementSetup) {
      setIsAgreementModalDismissed(false);
    }
  }, [needsAgreementSetup]);

  const openAuthScreen = () => {
    setIsAuthScreenRequested(true);
  };

  const closeAuthScreen = () => {
    setIsAuthScreenRequested(false);
  };

  const openAgreementModal = () => {
    setIsAgreementModalDismissed(false);
    setIsAgreementModalRequested(true);
  };

  const closeAgreementModal = () => {
    setIsAgreementModalRequested(false);
    setIsAgreementModalDismissed(true);
  };

  const openNicknameModal = () => {
    setIsNicknameModalRequested(true);
  };

  const closeNicknameModal = () => {
    setIsNicknameModalRequested(false);
  };

  return (
    <div className="app-container">
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

      {currentView === 'home' && <Home />}
      {currentView === 'profile' && <Profile />}

      <NavBar currentView={currentView} onViewChange={setCurrentView} />
      <CelebrationModal celebration={activeCelebration} onClose={dismissCelebration} />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onOpenAuth={openAuthScreen}
        onOpenAgreement={openAgreementModal}
        onOpenNicknameEditor={openNicknameModal}
      />

      <AuthScreen
        isOpen={isAuthScreenOpen}
        canClose={!isForcedAuthScreen}
        onClose={closeAuthScreen}
      />

      <FirstLoginSetupModal
        key={`first-login-${authUser?.id || 'guest'}-${authUserNickname || 'empty'}`}
        isOpen={isAgreementModalOpen}
        canClose
        onClose={closeAgreementModal}
        onComplete={closeAgreementModal}
        initialValues={authUserOnboarding}
      />

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
    </div>
  );
}

function App() {
  const [pathname, setPathname] = useState(() => {
    if (typeof window === 'undefined') {
      return '/';
    }

    return normalizePath(window.location.pathname);
  });

  useEffect(() => {
    const handlePopState = () => {
      window.scrollTo({ top: 0, left: 0 });
      startTransition(() => setPathname(normalizePath(window.location.pathname)));
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  if (isSupportPath(pathname) || isQnaPath(pathname) || isFeedbackPath(pathname)) {
    return <SupportPage onNavigate={nextPath => navigateToPath(nextPath, setPathname)} />;
  }

  if (!isAppPath(pathname)) {
    return (
      <LandingPage
        onOpenApp={() => navigateToPath(APP_PATH, setPathname)}
        onNavigate={nextPath => navigateToPath(nextPath, setPathname)}
      />
    );
  }

  return (
    <HappyProvider>
      <div className="app-shell">
        <AppContent />
      </div>
    </HappyProvider>
  );
}

export default App;
