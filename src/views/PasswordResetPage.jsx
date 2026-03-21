import React, { useEffect, useState } from 'react';
import { useHappy } from '../store/HappyContext';
import { supabase } from '../lib/supabase';
import './PasswordResetPage.css';

const WEB_HOME_PATH = '/';

const readTransferredSession = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawHash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;
  const hashParams = new URLSearchParams(rawHash);
  const accessToken = hashParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token');

  if (!accessToken || !refreshToken) {
    return null;
  }

  return {
    access_token: accessToken,
    refresh_token: refreshToken
  };
};

const clearTransferredSessionFromUrl = () => {
  if (typeof window === 'undefined' || !window.location.hash) {
    return;
  }

  const nextUrl = `${window.location.pathname}${window.location.search}`;
  window.history.replaceState({}, '', nextUrl);
};

const PasswordResetPage = () => {
  const {
    authUser,
    isAuthLoading,
    isAuthBusy,
    authFeedback,
    clearAuthFeedback,
    completePasswordReset
  } = useHappy();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [isPreparingSession, setIsPreparingSession] = useState(false);

  useEffect(() => {
    clearAuthFeedback();
  }, [clearAuthFeedback]);

  useEffect(() => {
    const transferredSession = readTransferredSession();

    if (!transferredSession) {
      return undefined;
    }

    if (authUser) {
      clearTransferredSessionFromUrl();
      return undefined;
    }

    let isMounted = true;

    const applyTransferredSession = async () => {
      if (!supabase) {
        if (isMounted) {
          setLocalError('비밀번호 재설정 화면을 열 수 없어요. Supabase 설정을 먼저 확인해주세요.');
        }
        clearTransferredSessionFromUrl();
        return;
      }

      setIsPreparingSession(true);
      const { error } = await supabase.auth.setSession(transferredSession);
      clearTransferredSessionFromUrl();

      if (!isMounted) {
        return;
      }

      if (error) {
        setLocalError('비밀번호 재설정 화면을 준비하지 못했어요. 설정에서 다시 열어주세요.');
      }

      setIsPreparingSession(false);
    };

    applyTransferredSession();

    return () => {
      isMounted = false;
    };
  }, [authUser]);

  const handlePasswordChange = setter => (event) => {
    setLocalError('');
    setter(event.target.value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (newPassword !== confirmPassword) {
      setLocalError('새 비밀번호가 서로 달라요.');
      return;
    }

    setLocalError('');
    const result = await completePasswordReset(newPassword);

    if (result?.success) {
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const isPageLoading = isAuthLoading || isPreparingSession;

  return (
    <div className="password-reset-route">
      <div className="password-reset-page">
        <div className="password-reset-copy">
          <span className="password-reset-eyebrow">ACCOUNT</span>
          <h1>비밀번호 재설정</h1>
          <p>현재 페이지는 그대로 두고 이 창에서 새 비밀번호만 바꾸면 됩니다.</p>
        </div>

        {isPageLoading ? (
          <div className="password-reset-note">
            로그인 상태를 확인하고 있어요.
          </div>
        ) : authUser ? (
          <>
            <div className="password-reset-account">
              <strong>{authUser.email}</strong>
              <span>로그인된 계정에서 바로 새 비밀번호를 저장합니다.</span>
            </div>

            <form className="password-reset-form" onSubmit={handleSubmit}>
              <label className="password-reset-field">
                <span>새 비밀번호</span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={handlePasswordChange(setNewPassword)}
                  placeholder="새 비밀번호를 입력해주세요"
                  autoComplete="new-password"
                  disabled={isAuthBusy}
                />
              </label>

              <label className="password-reset-field">
                <span>새 비밀번호 확인</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={handlePasswordChange(setConfirmPassword)}
                  placeholder="같은 비밀번호를 한 번 더 입력해주세요"
                  autoComplete="new-password"
                  disabled={isAuthBusy}
                />
              </label>

              {localError && (
                <div className="password-reset-feedback error">
                  {localError}
                </div>
              )}

              {authFeedback.message && (
                <div className={`password-reset-feedback ${authFeedback.type === 'error' ? 'error' : 'success'}`}>
                  {authFeedback.message}
                </div>
              )}

              <button
                type="submit"
                className="password-reset-submit"
                disabled={isAuthBusy}
              >
                {isAuthBusy ? '저장 중...' : '새 비밀번호 저장'}
              </button>
            </form>
          </>
        ) : (
          <div className="password-reset-empty">
            <p>이 페이지는 로그인된 상태에서 열어야 해요. 설정에서 비밀번호 재설정을 다시 눌러주세요.</p>
            <a href={WEB_HOME_PATH} className="password-reset-link">
              홈으로 돌아가기
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default PasswordResetPage;
