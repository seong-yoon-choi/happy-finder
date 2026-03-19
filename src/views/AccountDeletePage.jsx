import React, { useEffect, useState } from 'react';
import AuthScreen from '../components/AuthScreen';
import { useHappy } from '../store/HappyContext';
import { APP_PATH } from '../lib/routes';
import './AccountDeletePage.css';

const AccountDeletePage = () => {
  const {
    authUser,
    isAuthLoading,
    isAuthBusy,
    authFeedback,
    clearAuthFeedback,
    deleteAccount
  } = useHappy();
  const [isAuthScreenOpen, setIsAuthScreenOpen] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState('');
  const [isDeleteCompleted, setIsDeleteCompleted] = useState(false);

  useEffect(() => {
    clearAuthFeedback();
  }, [clearAuthFeedback]);

  useEffect(() => {
    if (!authUser) {
      return;
    }

    setIsAuthScreenOpen(false);
    setConfirmationEmail('');
  }, [authUser]);

  const normalizedEmail = confirmationEmail.trim().toLowerCase();
  const expectedEmail = typeof authUser?.email === 'string' ? authUser.email.toLowerCase() : '';
  const isConfirmationMatched = Boolean(expectedEmail && normalizedEmail === expectedEmail);

  const handleDeleteAccount = async () => {
    if (!isConfirmationMatched) {
      return;
    }

    const result = await deleteAccount();

    if (result?.success) {
      setIsDeleteCompleted(true);
      setConfirmationEmail('');
    }
  };

  return (
    <div className="account-delete-route">
      <div className="account-delete-page">
        <div className="account-delete-copy">
          <span className="account-delete-eyebrow">ACCOUNT</span>
          <h1>계정 삭제</h1>
          <p>앱 밖에서도 계정과 저장 데이터를 삭제할 수 있는 전용 페이지입니다.</p>
        </div>

        {isAuthLoading ? (
          <div className="account-delete-note">
            로그인 상태를 확인하고 있어요.
          </div>
        ) : isDeleteCompleted ? (
          <div className="account-delete-success">
            <strong>계정 삭제가 완료됐어요.</strong>
            <p>Happy Finder에 저장된 계정과 연결 데이터가 삭제됐습니다.</p>
            <a href={APP_PATH} className="account-delete-link">
              앱으로 돌아가기
            </a>
          </div>
        ) : authUser ? (
          <>
            <div className="account-delete-account">
              <strong>{authUser.email}</strong>
              <span>아래 입력칸에 현재 이메일 주소를 그대로 입력하면 삭제를 진행합니다.</span>
            </div>

            <label className="account-delete-field">
              <span>이메일 확인</span>
              <input
                type="email"
                value={confirmationEmail}
                onChange={event => setConfirmationEmail(event.target.value)}
                placeholder={authUser.email || '이메일 주소'}
                autoComplete="email"
                disabled={isAuthBusy}
              />
            </label>

            {authFeedback.message && (
              <div className={`account-delete-feedback ${authFeedback.type === 'error' ? 'error' : 'success'}`}>
                {authFeedback.message}
              </div>
            )}

            <div className="account-delete-actions">
              <a href={APP_PATH} className="account-delete-secondary-link">
                취소
              </a>
              <button
                type="button"
                className="account-delete-danger-btn"
                onClick={handleDeleteAccount}
                disabled={isAuthBusy || !isConfirmationMatched}
              >
                {isAuthBusy ? '삭제 중...' : '계정 삭제'}
              </button>
            </div>
          </>
        ) : (
          <div className="account-delete-empty">
            <p>계정 삭제를 진행하려면 먼저 로그인해야 합니다.</p>
            <div className="account-delete-actions">
              <button
                type="button"
                className="account-delete-primary-btn"
                onClick={() => setIsAuthScreenOpen(true)}
              >
                로그인하기
              </button>
              <a href={APP_PATH} className="account-delete-secondary-link">
                앱으로 돌아가기
              </a>
            </div>
          </div>
        )}
      </div>

      <AuthScreen
        isOpen={isAuthScreenOpen}
        canClose
        initialMode="login"
        onClose={() => setIsAuthScreenOpen(false)}
      />
    </div>
  );
};

export default AccountDeletePage;
