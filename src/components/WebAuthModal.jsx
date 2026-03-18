import React, { useEffect, useState } from 'react';
import { useHappy } from '../store/HappyContext';
import { GoogleIcon } from './AuthProviderIcons';
import './WebAuthModal.css';

const socialButtons = [
  { provider: 'google', label: 'Google로 계속하기', Icon: GoogleIcon }
];

const WebAuthModal = ({ isOpen, onClose }) => {
  const {
    isSupabaseConfigured,
    isAuthLoading,
    isAuthBusy,
    authFeedback,
    clearAuthFeedback,
    signInWithPassword,
    signUpWithPassword,
    requestPasswordReset,
    signInWithSocialProvider,
    continueAsGuest
  } = useHappy();

  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localFeedback, setLocalFeedback] = useState('');

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setMode(prev => (prev === 'reset-request' ? prev : 'login'));
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const isSignupMode = mode === 'signup';
  const isResetRequestMode = mode === 'reset-request';

  const resetFields = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setLocalFeedback('');
  };

  const handleClose = () => {
    resetFields();
    setMode('login');
    clearAuthFeedback();
    onClose?.();
  };

  const handleModeChange = nextMode => {
    setMode(nextMode);
    resetFields();
    clearAuthFeedback();
  };

  const handleSubmit = async event => {
    event.preventDefault();
    setLocalFeedback('');

    if (isSignupMode) {
      if (password !== confirmPassword) {
        setLocalFeedback('비밀번호가 서로 달라요.');
        return;
      }

      const result = await signUpWithPassword(email, password);

      if (result?.success) {
        setMode('login');
        setPassword('');
        setConfirmPassword('');
      }

      return;
    }

    if (isResetRequestMode) {
      const result = await requestPasswordReset(email);

      if (result?.success) {
        setMode('login');
        setPassword('');
        setConfirmPassword('');
      }

      return;
    }

    const result = await signInWithPassword(email, password);

    if (result?.success) {
      handleClose();
    }
  };

  const handleContinueAsGuest = () => {
    resetFields();
    continueAsGuest();
    onClose?.();
  };

  const handleSocialLogin = async provider => {
    setLocalFeedback('');
    await signInWithSocialProvider(provider);
  };

  const headline = isSignupMode
    ? '회원가입'
    : isResetRequestMode
      ? '비밀번호 재설정'
      : '로그인';
  const description = isSignupMode
    ? '이메일로 계정을 만들고 시작하세요.'
    : isResetRequestMode
      ? '가입한 이메일을 입력하면 재설정 링크를 보내드려요.'
      : '기존 계정으로 바로 로그인하세요.';
  const submitLabel = isAuthLoading
    ? '확인 중...'
    : isAuthBusy
      ? '처리 중...'
      : isSignupMode
        ? '회원가입하기'
        : isResetRequestMode
          ? '재설정 메일 보내기'
          : '로그인하기';

  return (
    <div className="web-auth-overlay" onClick={handleClose}>
      <div className="web-auth-shell" onClick={event => event.stopPropagation()}>
        <section className="web-auth-panel">
          <button
            type="button"
            className="web-auth-close"
            onClick={handleClose}
            aria-label="웹 로그인 닫기"
          >
            &times;
          </button>

          <div className="web-auth-header">
            <h1>{headline}</h1>
            <p>{description}</p>
          </div>

          {!isResetRequestMode && (
            <div className="web-auth-mode-tabs">
              <button
                type="button"
                className={`web-auth-mode-btn ${mode === 'login' ? 'active' : ''}`}
                onClick={() => handleModeChange('login')}
              >
                로그인
              </button>
              <button
                type="button"
                className={`web-auth-mode-btn ${isSignupMode ? 'active' : ''}`}
                onClick={() => handleModeChange('signup')}
              >
                회원가입
              </button>
            </div>
          )}

          <form className="web-auth-form" onSubmit={handleSubmit}>
            <label className="web-auth-label" htmlFor="web-auth-email">
              이메일
            </label>
            <input
              id="web-auth-email"
              type="email"
              className="web-auth-input"
              value={email}
              onChange={event => setEmail(event.target.value)}
              placeholder="이메일 주소를 입력해주세요"
              autoComplete="email"
              disabled={isAuthLoading || !isSupabaseConfigured}
            />

            {!isResetRequestMode && (
              <>
                <label className="web-auth-label" htmlFor="web-auth-password">
                  비밀번호
                </label>
                <input
                  id="web-auth-password"
                  type="password"
                  className="web-auth-input"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  placeholder="비밀번호를 입력해주세요"
                  autoComplete={isSignupMode ? 'new-password' : 'current-password'}
                  disabled={isAuthLoading || !isSupabaseConfigured}
                />
              </>
            )}

            {isSignupMode && (
              <>
                <label className="web-auth-label" htmlFor="web-auth-confirm-password">
                  비밀번호 확인
                </label>
                <input
                  id="web-auth-confirm-password"
                  type="password"
                  className="web-auth-input"
                  value={confirmPassword}
                  onChange={event => setConfirmPassword(event.target.value)}
                  placeholder="비밀번호를 한 번 더 입력해주세요"
                  autoComplete="new-password"
                  disabled={isAuthLoading || !isSupabaseConfigured}
                />
              </>
            )}

            {mode === 'login' && (
              <button
                type="button"
                className="web-auth-inline-action"
                onClick={() => handleModeChange('reset-request')}
                disabled={isAuthBusy || isAuthLoading || !isSupabaseConfigured}
              >
                비밀번호를 잊으셨나요?
              </button>
            )}

            <button
              type="submit"
              className="web-auth-submit"
              disabled={isAuthBusy || isAuthLoading || !isSupabaseConfigured}
            >
              {submitLabel}
            </button>
          </form>

          {isResetRequestMode && (
            <button
              type="button"
              className="web-auth-secondary-link"
              onClick={() => handleModeChange('login')}
              disabled={isAuthBusy}
            >
              로그인으로 돌아가기
            </button>
          )}

          {!isSupabaseConfigured && (
            <div className="web-auth-note">
              Supabase 환경변수가 아직 연결되지 않았어요. 연결 전에는 게스트로만 시작할 수 있어요.
            </div>
          )}

          {localFeedback && (
            <div className="web-auth-feedback error">
              {localFeedback}
            </div>
          )}

          {authFeedback.message && (
            <div className={`web-auth-feedback ${authFeedback.type === 'error' ? 'error' : 'success'}`}>
              {authFeedback.message}
            </div>
          )}

          {!isResetRequestMode && (
            <>
              <div className="web-auth-divider">
                <span>또는</span>
              </div>

              <div className="web-auth-socials">
                {socialButtons.map(({ provider, label, Icon }) => (
                  <button
                    key={provider}
                    type="button"
                    className={`web-auth-social-btn ${provider}`}
                    onClick={() => handleSocialLogin(provider)}
                    disabled={isAuthBusy || isAuthLoading || !isSupabaseConfigured}
                  >
                    <span className="web-auth-social-icon" aria-hidden="true">
                      {React.createElement(Icon)}
                    </span>
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              <button type="button" className="web-auth-guest-btn" onClick={handleContinueAsGuest}>
                게스트로 시작하기
              </button>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default WebAuthModal;
