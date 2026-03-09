import React, { useState } from 'react';
import { useHappy } from '../store/HappyContext';
import { GoogleIcon } from './AuthProviderIcons';
import './AuthScreen.css';

const socialButtons = [
  { provider: 'google', label: 'Google로 계속하기', Icon: GoogleIcon }
];

const AuthScreen = ({ isOpen, canClose = false, onClose }) => {
  const {
    isSupabaseConfigured,
    isAuthLoading,
    isAuthBusy,
    authFeedback,
    clearAuthFeedback,
    signInWithPassword,
    signUpWithPassword,
    signInWithSocialProvider,
    continueAsGuest
  } = useHappy();

  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localFeedback, setLocalFeedback] = useState('');

  if (!isOpen) {
    return null;
  }

  const resetFields = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setLocalFeedback('');
  };

  const handleClose = () => {
    resetFields();
    clearAuthFeedback();
    onClose?.();
  };

  const handleModeChange = (nextMode) => {
    setMode(nextMode);
    resetFields();
    clearAuthFeedback();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLocalFeedback('');

    if (mode === 'signup') {
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

    await signInWithPassword(email, password);
  };

  const handleContinueAsGuest = () => {
    resetFields();
    continueAsGuest();
    onClose?.();
  };

  const handleSocialLogin = async (provider) => {
    setLocalFeedback('');
    await signInWithSocialProvider(provider);
  };

  const headline = mode === 'signup'
    ? '회원가입하고 행복 기록을 이어가세요'
    : '로그인하고 행복 찾기를 이어가요';
  const description = mode === 'signup'
    ? '가입 후 첫 진입 화면에서 닉네임과 동의를 한 번에 설정할 수 있어요.'
    : '로그인하면 기기 변경 후에도 기록을 계속 관리할 수 있어요.';

  return (
    <div className="auth-screen-overlay">
      <div className="glass-panel auth-screen-panel">
        {canClose && (
          <button type="button" className="auth-screen-close" onClick={handleClose} aria-label="로그인 창 닫기">
            &times;
          </button>
        )}

        <div className="auth-screen-copy">
          <span className="auth-screen-eyebrow">HAPPY FINDER</span>
          <h1>{headline}</h1>
          <p>{description}</p>
        </div>

        <div className="auth-screen-mode-tabs">
          <button
            type="button"
            className={`auth-screen-mode-btn ${mode === 'login' ? 'active' : ''}`}
            onClick={() => handleModeChange('login')}
          >
            로그인
          </button>
          <button
            type="button"
            className={`auth-screen-mode-btn ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => handleModeChange('signup')}
          >
            회원가입
          </button>
        </div>

        <form className="auth-screen-form" onSubmit={handleSubmit}>
          <label className="auth-screen-label" htmlFor="auth-email">
            이메일
          </label>
          <input
            id="auth-email"
            type="email"
            className="auth-screen-input"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="이메일 주소를 입력해주세요"
            autoComplete="email"
            disabled={isAuthLoading || !isSupabaseConfigured}
          />

          <label className="auth-screen-label" htmlFor="auth-password">
            비밀번호
          </label>
          <input
            id="auth-password"
            type="password"
            className="auth-screen-input"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="비밀번호를 입력해주세요"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            disabled={isAuthLoading || !isSupabaseConfigured}
          />

          {mode === 'signup' && (
            <>
              <label className="auth-screen-label" htmlFor="auth-confirm-password">
                비밀번호 확인
              </label>
              <input
                id="auth-confirm-password"
                type="password"
                className="auth-screen-input"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="비밀번호를 한 번 더 입력해주세요"
                autoComplete="new-password"
                disabled={isAuthLoading || !isSupabaseConfigured}
              />
            </>
          )}

          <button
            type="submit"
            className="btn-primary auth-screen-submit"
            disabled={isAuthBusy || isAuthLoading || !isSupabaseConfigured}
          >
            {isAuthLoading
              ? '확인 중...'
              : isAuthBusy
                ? '처리 중...'
                : (mode === 'signup' ? '회원가입하기' : '로그인하기')}
          </button>
        </form>

        {!isSupabaseConfigured && (
          <div className="auth-screen-note">
            Supabase 환경변수가 연결되지 않았어요. 연결 전에는 게스트로만 시작할 수 있어요.
          </div>
        )}

        {localFeedback && (
          <div className="auth-screen-feedback error">
            {localFeedback}
          </div>
        )}

        {authFeedback.message && (
          <div className={`auth-screen-feedback ${authFeedback.type === 'error' ? 'error' : 'success'}`}>
            {authFeedback.message}
          </div>
        )}

        <div className="auth-screen-divider auth-screen-divider-form">
          <span>또는</span>
        </div>

        <div className="auth-screen-socials">
          {socialButtons.map(({ provider, label, Icon }) => (
            <button
              key={provider}
              type="button"
              className={`auth-screen-social-btn ${provider}`}
              onClick={() => handleSocialLogin(provider)}
              disabled={isAuthBusy || isAuthLoading || !isSupabaseConfigured}
            >
              <span className={`auth-screen-social-icon ${provider}`} aria-hidden="true">
                {React.createElement(Icon)}
              </span>
              <span className="auth-screen-social-text">{label}</span>
            </button>
          ))}
        </div>

        <button type="button" className="auth-screen-guest-btn" onClick={handleContinueAsGuest}>
          게스트로 로그인하기
        </button>
      </div>
    </div>
  );
};

export default AuthScreen;
