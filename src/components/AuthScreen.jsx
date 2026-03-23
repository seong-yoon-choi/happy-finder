import React, { useEffect, useState } from 'react';
import { useHappy } from '../store/HappyContext';
import { GoogleIcon } from './AuthProviderIcons';
import './AuthScreen.css';

const socialButtons = [
  { provider: 'google', label: 'Google로 계속하기', Icon: GoogleIcon }
];

const PasswordVisibilityIcon = ({ isVisible = false }) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path
      d="M2.25 12C3.93 8.71 7.38 6.5 12 6.5C16.62 6.5 20.07 8.71 21.75 12C20.07 15.29 16.62 17.5 12 17.5C7.38 17.5 3.93 15.29 2.25 12Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle
      cx="12"
      cy="12"
      r="3"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    {!isVisible && (
      <path
        d="M4 20L20 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    )}
  </svg>
);

const AuthScreen = ({ isOpen, canClose = false, initialMode = 'login', onClose }) => {
  const {
    isSupabaseConfigured,
    isAuthLoading,
    isAuthBusy,
    authFeedback,
    clearAuthFeedback,
    signInWithPassword,
    requestSignUpEmailVerification,
    verifySignUpEmailVerificationCode,
    completeSignUpWithVerificationCode,
    requestPasswordReset,
    completePasswordReset,
    signInWithSocialProvider,
    continueAsGuest,
    isPasswordRecovery
  } = useHappy();

  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailVerificationCode, setEmailVerificationCode] = useState('');
  const [isSignupVerificationRequested, setIsSignupVerificationRequested] = useState(false);
  const [isSignupVerificationConfirmed, setIsSignupVerificationConfirmed] = useState(false);
  const [verificationRequestedEmail, setVerificationRequestedEmail] = useState('');
  const [localFeedback, setLocalFeedback] = useState('');
  const [shouldShowPasswordResetAction, setShouldShowPasswordResetAction] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

  useEffect(() => {
    const syncScreenState = () => {
      if (!isOpen) {
        return;
      }

      if (isPasswordRecovery) {
        setMode('reset-password');
        setPassword('');
        setConfirmPassword('');
        setEmailVerificationCode('');
        setIsSignupVerificationRequested(false);
        setIsSignupVerificationConfirmed(false);
        setVerificationRequestedEmail('');
        setLocalFeedback('');
        setShouldShowPasswordResetAction(false);
        setIsPasswordVisible(false);
        setIsConfirmPasswordVisible(false);
        return;
      }

      if (!initialMode) {
        return;
      }

      setMode(initialMode);
      setPassword('');
      setConfirmPassword('');
      setEmailVerificationCode('');
      setIsSignupVerificationRequested(false);
      setIsSignupVerificationConfirmed(false);
      setVerificationRequestedEmail('');
      setLocalFeedback('');
      setShouldShowPasswordResetAction(false);
      setIsPasswordVisible(false);
      setIsConfirmPasswordVisible(false);
    };

    syncScreenState();
  }, [initialMode, isOpen, isPasswordRecovery]);

  if (!isOpen) {
    return null;
  }

  const isResetRequestMode = mode === 'reset-request';
  const isResetPasswordMode = mode === 'reset-password';
  const isSignupMode = mode === 'signup';
  const isResetMode = isResetRequestMode || isResetPasswordMode;
  const shouldLockSignupEmail = isSignupMode && isSignupVerificationRequested;

  const resetFields = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setEmailVerificationCode('');
    setIsSignupVerificationRequested(false);
    setIsSignupVerificationConfirmed(false);
    setVerificationRequestedEmail('');
    setLocalFeedback('');
    setShouldShowPasswordResetAction(false);
    setIsPasswordVisible(false);
    setIsConfirmPasswordVisible(false);
  };

  const handleClose = () => {
    resetFields();
    setMode('login');
    clearAuthFeedback();
    onClose?.();
  };

  const handleModeChange = nextMode => {
    if (isPasswordRecovery) {
      return;
    }

    setMode(nextMode);
    resetFields();
    clearAuthFeedback();
  };

  const handleRequestSignupVerification = async () => {
    setLocalFeedback('');

    if (!isSignupMode) {
      return;
    }

    const result = await requestSignUpEmailVerification(email, {
      resend: isSignupVerificationRequested
    });

    if (result?.success) {
      setIsSignupVerificationRequested(true);
      setIsSignupVerificationConfirmed(false);
      setVerificationRequestedEmail(result.email || email.trim().toLowerCase());
      setEmailVerificationCode('');
    }
  };

  const handleConfirmSignupVerification = async () => {
    setLocalFeedback('');

    if (isSignupVerificationConfirmed) {
      return true;
    }

    if (!isSignupVerificationRequested) {
      setLocalFeedback('이메일 인증을 먼저 진행해주세요.');
      return false;
    }

    if (!/^\d{6}$/.test(emailVerificationCode.trim())) {
      setLocalFeedback('6자리 인증번호를 입력해주세요.');
      return false;
    }

    if (verificationRequestedEmail && verificationRequestedEmail !== email.trim().toLowerCase()) {
      setLocalFeedback('이메일이 변경되어 인증을 다시 진행해야 해요.');
      return false;
    }

    const result = await verifySignUpEmailVerificationCode(email, emailVerificationCode);

    if (result?.success) {
      setIsSignupVerificationConfirmed(true);
      return true;
    }

    return false;
  };

  const handleSubmit = async event => {
    event.preventDefault();
    setLocalFeedback('');

    if (isSignupMode) {
      if (!isSignupVerificationRequested) {
        setLocalFeedback('이메일 인증을 먼저 진행해주세요.');
        return;
      }

      if (!isSignupVerificationConfirmed) {
        setLocalFeedback('인증번호 확인을 먼저 해주세요.');
        return;
      }

      if (!password.trim()) {
        setLocalFeedback('비밀번호를 입력해주세요.');
        return;
      }

      if (password !== confirmPassword) {
        setLocalFeedback('비밀번호가 서로 달라요.');
        return;
      }

      const result = await completeSignUpWithVerificationCode(password);

      if (result?.success) {
        resetFields();
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

    if (isResetPasswordMode) {
      if (password !== confirmPassword) {
        setLocalFeedback('새 비밀번호가 서로 달라요.');
        return;
      }

      const result = await completePasswordReset(password);

      if (result?.success) {
        resetFields();
      }

      return;
    }

    const result = await signInWithPassword(email, password);
    setShouldShowPasswordResetAction(result?.reason === 'auth');
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

  const headline = (() => {
    if (isSignupMode) {
      return '회원가입하고 행복 기록을 이어가세요';
    }

    if (isResetRequestMode) {
      return '비밀번호 재설정 메일을 보내드릴게요';
    }

    if (isResetPasswordMode) {
      return '새 비밀번호를 설정해주세요';
    }

    return '로그인하고 행복 찾기를 이어가세요';
  })();

  const description = (() => {
    if (isSignupMode) {
      return '이메일 인증번호를 확인한 뒤 가입이 완료되며, 첫 진입 화면에서 닉네임과 약관 동의를 설정할 수 있어요.';
    }

    if (isResetRequestMode) {
      return '가입한 이메일을 입력하면 비밀번호를 다시 설정할 수 있는 링크를 보내드려요.';
    }

    if (isResetPasswordMode) {
      return '재설정 링크로 들어오셨다면 여기에서 새 비밀번호를 바로 저장할 수 있어요.';
    }

    return '로그인하면 기기 변경 후에도 기록을 계속 관리할 수 있어요.';
  })();

  const submitLabel = (() => {
    if (isAuthLoading) {
      return '확인 중...';
    }

    if (isAuthBusy) {
      return '처리 중...';
    }

    if (isSignupMode) {
      return '회원가입하기';
    }

    if (isResetRequestMode) {
      return '재설정 메일 보내기';
    }

    if (isResetPasswordMode) {
      return '새 비밀번호 저장';
    }

    return '로그인하기';
  })();

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

        {!isResetPasswordMode && (
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
              className={`auth-screen-mode-btn ${isSignupMode ? 'active' : ''}`}
              onClick={() => handleModeChange('signup')}
            >
              회원가입
            </button>
          </div>
        )}

        <form className="auth-screen-form" onSubmit={handleSubmit}>
          {!isResetPasswordMode && (
            <>
              <label className="auth-screen-label" htmlFor="auth-email">
                이메일
              </label>
              <div className="auth-screen-email-field-group">
                <input
                  id="auth-email"
                  type="email"
                  name="email"
                  className="auth-screen-input"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  placeholder="이메일 주소를 입력해주세요"
                  autoComplete="email"
                  inputMode="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint={isResetRequestMode ? 'send' : 'next'}
                  disabled={isAuthLoading || !isSupabaseConfigured || shouldLockSignupEmail}
                />

                {isSignupMode && (
                  <button
                    type="button"
                    className="auth-screen-email-verify-link"
                  onClick={handleRequestSignupVerification}
                    disabled={isAuthBusy || isAuthLoading || !isSupabaseConfigured || isSignupVerificationConfirmed}
                  >
                    {isSignupVerificationConfirmed
                      ? '이메일 인증 완료'
                      : isSignupVerificationRequested
                        ? '인증번호 다시 보내기'
                        : '이메일 인증하기'}
                  </button>
                )}
              </div>
            </>
          )}

          {isSignupMode && isSignupVerificationRequested && (
            <>
              <label className="auth-screen-label" htmlFor="auth-email-verification-code">
                인증번호
              </label>
              <input
                id="auth-email-verification-code"
                type="text"
                name="emailVerificationCode"
                className="auth-screen-input"
                value={emailVerificationCode}
                onChange={event => setEmailVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6자리 인증번호를 입력해주세요"
                autoComplete="one-time-code"
                inputMode="numeric"
                maxLength={6}
                enterKeyHint="done"
                disabled={isAuthLoading || !isSupabaseConfigured || isSignupVerificationConfirmed}
              />
              <p className="auth-screen-field-hint">
                {verificationRequestedEmail || email.trim().toLowerCase()}
                {' '}
                {isSignupVerificationConfirmed
                  ? '인증번호가 확인되었습니다. 아래 비밀번호를 입력하고 회원가입을 완료해주세요.'
                  : '이메일로 받은 6자리 인증번호를 입력해주세요.'}
              </p>
              <button
                type="button"
                className="auth-screen-code-confirm-btn"
                onClick={handleConfirmSignupVerification}
                disabled={isAuthBusy || isAuthLoading || !isSupabaseConfigured || isSignupVerificationConfirmed}
              >
                {isSignupVerificationConfirmed ? '인증 완료' : isAuthBusy ? '확인 중...' : '인증번호 확인'}
              </button>
            </>
          )}

          {!isResetRequestMode && (
            <>
              <label className="auth-screen-label" htmlFor="auth-password">
                {isResetPasswordMode ? '새 비밀번호' : '비밀번호'}
              </label>
              <div className="auth-screen-password-field">
                <input
                  id="auth-password"
                  type={isPasswordVisible ? 'text' : 'password'}
                  className="auth-screen-input auth-screen-input-password"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  placeholder={isResetPasswordMode ? '새 비밀번호를 입력해주세요' : '비밀번호를 입력해주세요'}
                  autoComplete={isSignupMode || isResetPasswordMode ? 'new-password' : 'current-password'}
                  disabled={isAuthLoading || !isSupabaseConfigured}
                />
                <button
                  type="button"
                  className="auth-screen-password-toggle"
                  onClick={() => setIsPasswordVisible(prev => !prev)}
                  disabled={isAuthLoading || !isSupabaseConfigured}
                  aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
                >
                  <PasswordVisibilityIcon isVisible={isPasswordVisible} />
                </button>
              </div>
            </>
          )}

          {(isSignupMode || isResetPasswordMode) && (
            <>
              <label className="auth-screen-label" htmlFor="auth-confirm-password">
                비밀번호 확인
              </label>
              <div className="auth-screen-password-field">
                <input
                  id="auth-confirm-password"
                  type={isConfirmPasswordVisible ? 'text' : 'password'}
                  className="auth-screen-input auth-screen-input-password"
                  value={confirmPassword}
                  onChange={event => setConfirmPassword(event.target.value)}
                  placeholder="비밀번호를 한 번 더 입력해주세요"
                  autoComplete="new-password"
                  disabled={isAuthLoading || !isSupabaseConfigured}
                />
                <button
                  type="button"
                  className="auth-screen-password-toggle"
                  onClick={() => setIsConfirmPasswordVisible(prev => !prev)}
                  disabled={isAuthLoading || !isSupabaseConfigured}
                  aria-label={isConfirmPasswordVisible ? 'Hide password confirmation' : 'Show password confirmation'}
                >
                  <PasswordVisibilityIcon isVisible={isConfirmPasswordVisible} />
                </button>
              </div>
            </>
          )}

          {mode === 'login' && shouldShowPasswordResetAction && (
            <button
              type="button"
              className="auth-screen-inline-action"
              onClick={() => handleModeChange('reset-request')}
              disabled={isAuthBusy || isAuthLoading || !isSupabaseConfigured}
            >
              비밀번호를 잊으셨나요?
            </button>
          )}

          <button
            type="submit"
            className="btn-primary auth-screen-submit"
            disabled={isAuthBusy || isAuthLoading || !isSupabaseConfigured}
          >
            {submitLabel}
          </button>
        </form>

        {isResetMode && !isPasswordRecovery && (
          <button
            type="button"
            className="auth-screen-secondary-link"
            onClick={() => handleModeChange('login')}
            disabled={isAuthBusy}
          >
            로그인으로 돌아가기
          </button>
        )}

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

        {!isResetMode && (
          <>
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
          </>
        )}
      </div>
    </div>
  );
};

export default AuthScreen;
