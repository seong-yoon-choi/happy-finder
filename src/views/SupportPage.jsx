import React, { useState } from 'react';
import { submitWebsiteIntake } from '../lib/websiteIntake';
import { APP_PATH, FEEDBACK_PATH, QNA_PATH, SUPPORT_PATH, isFeedbackPath } from '../lib/routes';
import './SupportPage.css';

const emptyStatus = {
  type: 'idle',
  message: ''
};

const initialQnaForm = {
  name: '',
  email: '',
  subject: '',
  message: '',
  website: ''
};

const initialFeedbackForm = {
  name: '',
  email: '',
  subject: '',
  score: '5',
  message: '',
  website: ''
};

const getSubmissionErrorMessage = (error, fallbackMessage) => {
  const message = typeof error?.message === 'string' ? error.message.toLowerCase() : '';

  if (!message) {
    return fallbackMessage;
  }

  if (message.includes('supabase_not_configured')) {
    return '문의 저장 연결이 아직 완료되지 않았습니다. Supabase 환경변수를 먼저 설정해주세요.';
  }

  if (message.includes('website_inquiries') && message.includes('does not exist')) {
    return '문의 저장 테이블이 아직 없습니다. Supabase SQL을 먼저 적용해주세요.';
  }

  if (message.includes('row-level security') || message.includes('permission denied')) {
    return '문의 저장 권한 설정이 아직 적용되지 않았습니다. Supabase 정책을 확인해주세요.';
  }

  if (message.includes('invalid_submission')) {
    return '필수 항목을 다시 확인해주세요.';
  }

  return fallbackMessage;
};

const SupportPage = ({ onNavigate, onOpenAuth, pathname }) => {
  const [qnaForm, setQnaForm] = useState(initialQnaForm);
  const [feedbackForm, setFeedbackForm] = useState(initialFeedbackForm);
  const [qnaStatus, setQnaStatus] = useState(emptyStatus);
  const [feedbackStatus, setFeedbackStatus] = useState(emptyStatus);
  const [isSubmittingQna, setIsSubmittingQna] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const activeTab = isFeedbackPath(pathname) ? 'feedback' : 'qna';
  const isFeedbackTab = activeTab === 'feedback';

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
        name: qnaForm.name,
        email: qnaForm.email,
        subject: qnaForm.subject,
        message: qnaForm.message
      });

      setQnaForm(initialQnaForm);
      setQnaStatus({
        type: 'success',
        message: '문의가 접수되었습니다. 남겨주신 이메일로 확인 가능한 내용은 순차적으로 답변드리겠습니다.'
      });
    } catch (error) {
      setQnaStatus({
        type: 'error',
        message: getSubmissionErrorMessage(error, '문의 접수 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.')
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
        name: feedbackForm.name,
        email: feedbackForm.email,
        subject: feedbackForm.subject,
        message: feedbackForm.message,
        score: Number(feedbackForm.score)
      });

      setFeedbackForm(initialFeedbackForm);
      setFeedbackStatus({
        type: 'success',
        message: '피드백이 저장되었습니다. 제품 개선에 반영할 수 있도록 검토하겠습니다.'
      });
    } catch (error) {
      setFeedbackStatus({
        type: 'error',
        message: getSubmissionErrorMessage(error, '피드백 전송 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.')
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
              QnA &amp; Feedback
            </button>
            <button type="button" className="support-nav-link-btn" onClick={onOpenAuth}>
              로그인
            </button>
            <button type="button" className="support-app-button" onClick={handleNavigate(APP_PATH)}>
              앱 열기
            </button>
          </div>
        </nav>

        <header className="support-hero">
          <div className="support-copy">
            <p className="support-kicker">Support</p>
            <div className="support-tab-links" aria-label="문의 및 피드백 유형">
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
            <strong>함께 만들어 나가는 Happy Finder</strong>
            <p>불편한 점이나 Happy Finder를 개선할 더 좋은 아이디어가 있다면 알려주세요!! 더 많은 행복을 함께 만들어 나가요!</p>
          </aside>
        </header>

        <main className="support-main">
          {isFeedbackTab ? (
            <section className="support-panel support-panel-wide">
              <div className="support-form-header support-form-header-split">
                <div>
                  <h2>서비스 피드백</h2>
                  <p>좋았던 점, 불편했던 점, 꼭 필요한 기능 제안을 남겨주세요.</p>
                </div>

                <label className="support-score-inline">
                  <span>만족도</span>
                  <select value={feedbackForm.score} onChange={handleFeedbackChange('score')}>
                    <option value="5">5점</option>
                    <option value="4">4점</option>
                    <option value="3">3점</option>
                    <option value="2">2점</option>
                    <option value="1">1점</option>
                  </select>
                </label>
              </div>

              <form className="support-form" onSubmit={handleFeedbackSubmit}>
                <label>
                  이름
                  <input
                    type="text"
                    value={feedbackForm.name}
                    onChange={handleFeedbackChange('name')}
                    placeholder="선택 입력"
                  />
                </label>

                <label>
                  이메일
                  <input
                    type="email"
                    value={feedbackForm.email}
                    onChange={handleFeedbackChange('email')}
                    placeholder="이메일 주소를 입력해 주세요"
                  />
                </label>

                <label>
                  피드백 제목
                  <input
                    type="text"
                    value={feedbackForm.subject}
                    onChange={handleFeedbackChange('subject')}
                    placeholder="피드백 제목을 입력해 주세요"
                  />
                </label>

                <label>
                  피드백 내용
                  <textarea
                    value={feedbackForm.message}
                    onChange={handleFeedbackChange('message')}
                    placeholder="기능, 사용성, 디자인, 보완점 중 무엇이든 적어주세요."
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
                <p>앱 사용, 계정, 정책, 제휴 관련 문의를 남겨주세요.</p>
              </div>

              <form className="support-form" onSubmit={handleQnaSubmit}>
                <label>
                  이름
                  <input
                    type="text"
                    value={qnaForm.name}
                    onChange={handleQnaChange('name')}
                    placeholder="홍길동"
                  />
                </label>

                <label>
                  이메일
                  <input
                    type="email"
                    value={qnaForm.email}
                    onChange={handleQnaChange('email')}
                    placeholder="이메일 주소를 입력해 주세요"
                    required
                  />
                </label>

                <label>
                  제목
                  <input
                    type="text"
                    value={qnaForm.subject}
                    onChange={handleQnaChange('subject')}
                    placeholder="문의 제목을 입력해주세요"
                  />
                </label>

                <label>
                  문의 내용
                  <textarea
                    value={qnaForm.message}
                    onChange={handleQnaChange('message')}
                    placeholder="문의 내용을 구체적으로 적어주시면 더 정확한 답변을 받으실 수 있습니다."
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
      </div>
    </div>
  );
};

export default SupportPage;
