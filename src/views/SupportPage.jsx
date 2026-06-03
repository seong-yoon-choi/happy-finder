import React, { useMemo, useState } from 'react';
import { useHappy } from '../store/HappyContext';
import { submitWebsiteIntake } from '../lib/websiteIntake';
import { ACCOUNT_DELETE_PATH, FEEDBACK_PATH, QNA_PATH, SUPPORT_PATH, isFeedbackPath } from '../lib/routes';
import './SupportPage.css';

const emptyStatus = {
  type: 'idle',
  message: ''
};

const initialQnaForm = {
  email: '',
  subject: '',
  message: '',
  website: ''
};

const initialFeedbackForm = {
  email: '',
  subject: '',
  message: '',
  website: ''
};

const getSubmissionErrorMessage = (error, fallbackMessage) => {
  const message = typeof error?.message === 'string' ? error.message.toLowerCase() : '';

  if (!message) {
    return fallbackMessage;
  }

  if (message.includes('supabase_not_configured')) {
    return '문의 저장 연결이 아직 완료되지 않았어요. Supabase 환경변수를 먼저 설정해주세요.';
  }

  if (message.includes('website_inquiries') && message.includes('does not exist')) {
    return '문의 테이블이 아직 없어요. Supabase SQL을 먼저 적용해주세요.';
  }

  if (message.includes('row-level security') || message.includes('permission denied')) {
    return '문의 저장 권한 설정이 아직 적용되지 않았어요. Supabase 정책을 확인해주세요.';
  }

  if (message.includes('invalid_submission')) {
    return '필수 입력 항목을 다시 확인해주세요.';
  }

  return fallbackMessage;
};

const SupportPage = ({
  onNavigate,
  onOpenAuth,
  onOpenProfile,
  onSignOut,
  pathname,
  isAuthBusy = false,
  isAuthenticated = false
}) => {
  const { authUser, isReviewAuthUser } = useHappy();
  const [qnaForm, setQnaForm] = useState(initialQnaForm);
  const [feedbackForm, setFeedbackForm] = useState(initialFeedbackForm);
  const [qnaStatus, setQnaStatus] = useState(emptyStatus);
  const [feedbackStatus, setFeedbackStatus] = useState(emptyStatus);
  const [isSubmittingQna, setIsSubmittingQna] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const activeTab = isFeedbackPath(pathname) ? 'feedback' : 'qna';
  const isFeedbackTab = activeTab === 'feedback';
  const handleAccountAction = isAuthenticated ? onOpenProfile : onOpenAuth;
  const accountActionLabel = isAuthenticated ? '프로필' : '로그인';
  const accountEmail = useMemo(() => {
    if (typeof authUser?.email !== 'string') {
      return '';
    }

    return authUser.email.trim().toLowerCase();
  }, [authUser?.email]);
  const linkedAccountUserId = !isReviewAuthUser && typeof authUser?.id === 'string'
    ? authUser.id.trim()
    : '';
  const linkedAccountEmail = !isReviewAuthUser ? accountEmail : '';
  const shouldShowAccountLinkNote = Boolean(linkedAccountUserId);

  const handleNavigate = nextPath => () => onNavigate?.(nextPath);

  const handleQnaChange = field => event => {
    const nextValue = event.target.value;
    setQnaForm(prev => ({ ...prev, [field]: nextValue }));
  };

  const handleFeedbackChange = field => event => {
    const nextValue = event.target.value;
    setFeedbackForm(prev => ({ ...prev, [field]: nextValue }));
  };

  const handleQnaSubmit = async event => {
    event.preventDefault();

    if (qnaForm.website.trim()) {
      return;
    }

    setIsSubmittingQna(true);
    setQnaStatus(emptyStatus);

    try {
      await submitWebsiteIntake({
        submissionType: 'qna',
        email: qnaForm.email,
        accountUserId: linkedAccountUserId,
        accountEmail: linkedAccountEmail,
        subject: qnaForm.subject,
        message: qnaForm.message
      });

      setQnaForm(initialQnaForm);
      setQnaStatus({
        type: 'success',
        message: shouldShowAccountLinkNote
          ? '문의가 접수됐어요. 답변은 입력한 이메일로 안내드리고, 프로필 문의 내역에도 표시될게요.'
          : '문의가 접수됐어요. 확인 후 필요한 경우 입력한 이메일을 참고해 안내드릴게요.'
      });
    } catch (error) {
      setQnaStatus({
        type: 'error',
        message: getSubmissionErrorMessage(error, '문의 접수 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.')
      });
    } finally {
      setIsSubmittingQna(false);
    }
  };

  const handleFeedbackSubmit = async event => {
    event.preventDefault();

    if (feedbackForm.website.trim()) {
      return;
    }

    setIsSubmittingFeedback(true);
    setFeedbackStatus(emptyStatus);

    try {
      await submitWebsiteIntake({
        submissionType: 'feedback',
        email: feedbackForm.email,
        accountUserId: linkedAccountUserId,
        accountEmail: linkedAccountEmail,
        subject: feedbackForm.subject,
        message: feedbackForm.message
      });

      setFeedbackForm(initialFeedbackForm);
      setFeedbackStatus({
        type: 'success',
        message: '피드백이 전달됐어요. 더 나은 Happy Finder를 만드는 데 참고할게요.'
      });
    } catch (error) {
      setFeedbackStatus({
        type: 'error',
        message: getSubmissionErrorMessage(error, '피드백 전송 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.')
      });
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  return (
    <div className="support-page">
      <div className="support-page-shell">
        <nav className="support-nav">
          <button type="button" className="support-brand" onClick={handleNavigate('/')}>
            Happy Finder
          </button>

          <div className="support-nav-links">
            <button type="button" className="support-nav-link-btn" onClick={handleNavigate(SUPPORT_PATH)}>
              문의·피드백
            </button>
            <button
              type="button"
              className={`support-nav-link-btn ${isAuthenticated ? 'is-authenticated' : ''}`}
              onClick={handleAccountAction}
            >
              {accountActionLabel}
            </button>
            {isAuthenticated && (
              <button
                type="button"
                className="support-nav-link-btn support-nav-logout-btn"
                onClick={onSignOut}
                disabled={isAuthBusy}
              >
                {isAuthBusy ? '처리 중...' : '로그아웃'}
              </button>
            )}
          </div>
        </nav>

        <header className="support-hero">
          <div className="support-copy">
            <p className="support-kicker">SUPPORT</p>
            <h1>
              <span>Happy Finder에 전하고 싶은</span>
              <span>이야기를 남겨주세요</span>
            </h1>
            <p>
              앱 사용 중 궁금한 점, 오류, 개선 아이디어를 보내주시면 확인 후 필요한 내용을 안내드립니다.
            </p>
            <div className="support-tab-links" aria-label="문의 유형 선택">
              <button
                type="button"
                aria-pressed={!isFeedbackTab}
                className={`support-tab-link ${!isFeedbackTab ? 'is-active' : ''}`}
                onClick={handleNavigate(QNA_PATH)}
              >
                QnA
              </button>
              <button
                type="button"
                aria-pressed={isFeedbackTab}
                className={`support-tab-link ${isFeedbackTab ? 'is-active' : ''}`}
                onClick={handleNavigate(FEEDBACK_PATH)}
              >
                Feedback
              </button>
            </div>
          </div>

          <aside className="support-side-note">
            <strong>더 나은 행복 기록을 위해 확인할게요</strong>
            <p>계정, 기록, 공감, 분석, 알림, 웹 이용과 관련된 내용을 구체적으로 남겨주세요.</p>
          </aside>
        </header>

        <main className="support-main">
          {isFeedbackTab ? (
            <section className="support-panel support-panel-wide">
              <div className="support-form-header">
                <h2>서비스 피드백</h2>
                <p>좋았던 부분, 아쉬웠던 부분, 출시 전 더 다듬으면 좋을 기능을 자유롭게 적어주세요.</p>
              </div>

              <form className="support-form" onSubmit={handleFeedbackSubmit}>
                <label>
                  이메일
                  <input
                    type="email"
                    value={feedbackForm.email}
                    onChange={handleFeedbackChange('email')}
                    placeholder="답변 받을 이메일을 입력해 주세요"
                    required
                  />
                  {shouldShowAccountLinkNote && (
                    <span className="support-field-note">
                      프로필 문의 내역은 지금 로그인한 계정에 저장돼요.
                    </span>
                  )}
                </label>

                <label>
                  제목
                  <input
                    type="text"
                    value={feedbackForm.subject}
                    onChange={handleFeedbackChange('subject')}
                    placeholder="피드백 제목을 입력해주세요"
                    required
                  />
                </label>

                <label>
                  문의 내용
                  <textarea
                    value={feedbackForm.message}
                    onChange={handleFeedbackChange('message')}
                    placeholder="기능, 사용 경험, 개선 아이디어를 자세히 적어주세요."
                    rows="8"
                    maxLength="3000"
                    required
                  />
                </label>

                <input
                  type="text"
                  value={feedbackForm.website}
                  onChange={handleFeedbackChange('website')}
                  className="support-honeypot"
                  tabIndex="-1"
                  autoComplete="off"
                  aria-hidden="true"
                />

                {feedbackStatus.message && (
                  <div className={`support-form-status ${feedbackStatus.type}`}>
                    {feedbackStatus.message}
                  </div>
                )}

                <button type="submit" className="support-submit-button" disabled={isSubmittingFeedback}>
                  {isSubmittingFeedback ? '전송 중...' : '피드백 보내기'}
                </button>
              </form>
            </section>
          ) : (
            <section className="support-panel support-panel-wide">
              <div className="support-form-header">
                <h2>Q&amp;A 문의</h2>
                <p>사용 방법, 로그인, 계정, 정책, 오류 관련 문의를 남겨주세요.</p>
              </div>

              <form className="support-form" onSubmit={handleQnaSubmit}>
                <label>
                  이메일
                  <input
                    type="email"
                    value={qnaForm.email}
                    onChange={handleQnaChange('email')}
                    placeholder="답변 받을 이메일을 입력해 주세요"
                    required
                  />
                  {shouldShowAccountLinkNote && (
                    <span className="support-field-note">
                      프로필 문의 내역은 지금 로그인한 계정에 저장돼요.
                    </span>
                  )}
                </label>

                <label>
                  제목
                  <input
                    type="text"
                    value={qnaForm.subject}
                    onChange={handleQnaChange('subject')}
                    placeholder="문의 제목을 입력해주세요"
                    required
                  />
                </label>

                <label>
                  문의 내용
                  <textarea
                    value={qnaForm.message}
                    onChange={handleQnaChange('message')}
                    placeholder="문의 내용을 구체적으로 적어주시면 더 정확하게 확인할 수 있어요."
                    rows="8"
                    maxLength="3000"
                    required
                  />
                </label>

                <input
                  type="text"
                  value={qnaForm.website}
                  onChange={handleQnaChange('website')}
                  className="support-honeypot"
                  tabIndex="-1"
                  autoComplete="off"
                  aria-hidden="true"
                />

                {qnaStatus.message && (
                  <div className={`support-form-status ${qnaStatus.type}`}>
                    {qnaStatus.message}
                  </div>
                )}

                <button type="submit" className="support-submit-button" disabled={isSubmittingQna}>
                  {isSubmittingQna ? '접수 중...' : 'Q&A 접수하기'}
                </button>
              </form>
            </section>
          )}
        </main>

        <footer className="support-footer">
          <a href="/terms/index.html">이용약관</a>
          <a href="/privacy/index.html">개인정보처리방침</a>
          <a href="/marketing/index.html">마케팅 수신 동의</a>
          <button type="button" className="support-footer-link-btn" onClick={handleNavigate(ACCOUNT_DELETE_PATH)}>
            계정 삭제
          </button>
        </footer>
      </div>
    </div>
  );
};

export default SupportPage;
