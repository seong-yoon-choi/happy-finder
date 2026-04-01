import React, { useMemo, useState } from 'react';
import InquiryHistorySection from '../components/InquiryHistorySection';
import { ADMIN_INQUIRIES_PATH, PASSWORD_RESET_PATH } from '../lib/routes';
import { useHappy } from '../store/HappyContext';
import './WebProfilePage.css';

const ChevronIcon = ({ isOpen = false }) => (
  <span className={`web-profile-chevron ${isOpen ? 'open' : ''}`.trim()} aria-hidden="true">
    <svg viewBox="0 0 20 20" fill="none" focusable="false">
      <path
        d="M5 7.5L10 12.5L15 7.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </span>
);

const WebProfilePage = ({ onNavigate, onOpenAuth }) => {
  const {
    authUser,
    authUserNickname,
    isReviewAuthUser,
    isAuthLoading,
    isAuthBusy,
    authFeedback,
    deleteAccount,
    signOutFromSupabase
  } = useHappy();
  const [confirmationEmail, setConfirmationEmail] = useState('');
  const [isDeleteCompleted, setIsDeleteCompleted] = useState(false);
  const [isDeleteSectionOpen, setIsDeleteSectionOpen] = useState(false);

  const normalizedEmail = confirmationEmail.trim().toLowerCase();
  const accountEmail = typeof authUser?.email === 'string' ? authUser.email : '';
  const expectedEmail = accountEmail.toLowerCase();
  const isConfirmationMatched = Boolean(expectedEmail && normalizedEmail === expectedEmail);
  const displayName = useMemo(() => {
    if (typeof authUserNickname === 'string' && authUserNickname.trim()) {
      return authUserNickname.trim();
    }

    if (accountEmail) {
      return accountEmail;
    }

    return 'Happy Finder 사용자';
  }, [accountEmail, authUserNickname]);

  const handleDeleteAccount = async () => {
    if (!isConfirmationMatched) {
      return;
    }

    const result = await deleteAccount();

    if (result?.success) {
      setIsDeleteCompleted(true);
      setIsDeleteSectionOpen(false);
      setConfirmationEmail('');
    }
  };

  const handleSignOut = async () => {
    const result = await signOutFromSupabase();

    if (result?.success) {
      setConfirmationEmail('');
      setIsDeleteSectionOpen(false);
      onNavigate?.('/');
    }
  };

  const handleOpenPasswordReset = () => {
    if (typeof window !== 'undefined') {
      window.location.assign(PASSWORD_RESET_PATH);
      return;
    }

    onNavigate?.(PASSWORD_RESET_PATH);
  };

  const handleToggleDeleteSection = () => {
    setIsDeleteSectionOpen(prev => {
      const next = !prev;

      if (!next) {
        setConfirmationEmail('');
      }

      return next;
    });
  };

  return (
    <div className="web-profile-route">
      <div className="web-profile-page">
        <div className="web-profile-header">
          <div className="web-profile-copy">
            <span className="web-profile-eyebrow">PROFILE</span>
            <h1>웹 프로필</h1>
            <p>공개 웹에서 계정 상태를 확인하고, 필요한 계정 작업을 진행할 수 있어요.</p>
          </div>

          <div className="web-profile-header-actions">
            {authUser && isReviewAuthUser && (
              <button
                type="button"
                className="web-profile-secondary-btn web-profile-header-btn"
                onClick={() => onNavigate?.(ADMIN_INQUIRIES_PATH)}
              >
                관리자 페이지로 이동
              </button>
            )}

            <button
              type="button"
              className="web-profile-secondary-btn web-profile-back-btn"
              onClick={() => onNavigate?.('/')}
            >
              뒤로가기
            </button>
          </div>
        </div>

        {isAuthLoading ? (
          <div className="web-profile-note">
            로그인 상태를 확인하고 있어요.
          </div>
        ) : isDeleteCompleted ? (
          <div className="web-profile-success">
            <strong>계정 삭제가 완료됐어요.</strong>
            <p>Happy Finder에 저장된 계정과 연결 데이터가 삭제됐어요.</p>
            <div className="web-profile-actions">
              <button
                type="button"
                className="web-profile-primary-btn"
                onClick={() => onNavigate?.('/')}
              >
                홈으로 이동
              </button>
            </div>
          </div>
        ) : !authUser ? (
          <div className="web-profile-empty">
            <p>프로필 페이지를 보려면 먼저 로그인해주세요.</p>
            <div className="web-profile-actions">
              <button
                type="button"
                className="web-profile-primary-btn"
                onClick={onOpenAuth}
              >
                로그인하기
              </button>
              <button
                type="button"
                className="web-profile-secondary-btn"
                onClick={() => onNavigate?.('/')}
              >
                홈으로 돌아가기
              </button>
            </div>
          </div>
        ) : (
          <>
            <section className="web-profile-card web-profile-summary">
              <div>
                <span className="web-profile-badge">ACCOUNT</span>
                <h2>{displayName}</h2>
                <p>{accountEmail}</p>
              </div>

              <div className="web-profile-actions">
                <button
                  type="button"
                  className="web-profile-secondary-btn"
                  onClick={handleOpenPasswordReset}
                  disabled={isAuthBusy}
                >
                  비밀번호 재설정
                </button>
                <button
                  type="button"
                  className="web-profile-secondary-btn"
                  onClick={handleSignOut}
                  disabled={isAuthBusy}
                >
                  {isAuthBusy ? '처리 중...' : '로그아웃'}
                </button>
              </div>
            </section>

            <section className="web-profile-card">
              <InquiryHistorySection variant="web" />
            </section>

            <section className="web-profile-card web-profile-danger">
              <button
                type="button"
                className={`web-profile-danger-toggle ${isDeleteSectionOpen ? 'open' : ''}`}
                onClick={handleToggleDeleteSection}
                aria-expanded={isDeleteSectionOpen}
              >
                <span>계정 삭제</span>
                <ChevronIcon isOpen={isDeleteSectionOpen} />
              </button>

              {isDeleteSectionOpen && (
                <>
                  <div className="web-profile-section-head">
                    <p>현재 이메일을 다시 입력하면 계정 삭제를 진행할 수 있어요.</p>
                  </div>

                  <div className="web-profile-account-box">
                    <strong>{accountEmail}</strong>
                    <span>삭제 후에는 계정과 저장 기록을 되돌릴 수 없어요.</span>
                  </div>

                  <label className="web-profile-field">
                    <span>이메일 확인</span>
                    <input
                      type="email"
                      value={confirmationEmail}
                      onChange={event => setConfirmationEmail(event.target.value)}
                      placeholder={accountEmail || '이메일 주소'}
                      autoComplete="email"
                      disabled={isAuthBusy}
                    />
                  </label>

                  {authFeedback.message && (
                    <div className={`web-profile-feedback ${authFeedback.type === 'error' ? 'error' : 'success'}`}>
                      {authFeedback.message}
                    </div>
                  )}

                  <div className="web-profile-actions">
                    <button
                      type="button"
                      className="web-profile-danger-btn"
                      onClick={handleDeleteAccount}
                      disabled={isAuthBusy || !isConfirmationMatched}
                    >
                      {isAuthBusy ? '처리 중...' : '계정 삭제'}
                    </button>
                  </div>
                </>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default WebProfilePage;
