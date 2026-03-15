import React, { useState } from 'react';
import { submitWebsiteIntake } from '../lib/websiteIntake';
import { SUPPORT_PATH } from '../lib/routes';
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

const SupportPage = ({ onNavigate }) => {
  const [qnaForm, setQnaForm] = useState(initialQnaForm);
  const [feedbackForm, setFeedbackForm] = useState(initialFeedbackForm);
  const [qnaStatus, setQnaStatus] = useState(emptyStatus);
  const [feedbackStatus, setFeedbackStatus] = useState(emptyStatus);
  const [isSubmittingQna, setIsSubmittingQna] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

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
            <button type="button" onClick={handleNavigate(SUPPORT_PATH)}>
              문의
            </button>
            <a href="/terms/index.html">이용약관</a>
            <a href="/privacy/index.html">개인정보</a>
            <button type="button" className="support-home-btn" onClick={handleNavigate('/')}>
              홈으로
            </button>
          </div>
        </nav>

        <header className="support-hero">
          <div className="support-copy">
            <p className="support-kicker">Support</p>
            <h1>Q&amp;A와 피드백을 한곳에서 받습니다.</h1>
            <p>앱 사용 중 궁금한 점과 개선 의견을 아래에서 바로 남겨주세요.</p>
          </div>

          <aside className="support-side-note">
            <strong>작성 팁</strong>
            <p>문제 상황은 구체적으로, 피드백은 좋았던 점과 아쉬운 점을 함께 적어주면 확인이 더 빨라집니다.</p>
          </aside>
        </header>

        <main className="support-main">
          <div className="support-forms-grid">
            <section className="support-panel">
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
                    placeholder="hello@happyfinder.kr"
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
                    placeholder="문의 내용을 구체적으로 적어주시면 더 빠르게 확인할 수 있습니다."
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

            <section className="support-panel">
              <div className="support-form-header">
                <h2>서비스 피드백</h2>
                <p>좋았던 점, 불편했던 점, 꼭 필요한 기능 제안을 남겨주세요.</p>
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
                    placeholder="답변이 필요하면 입력해주세요"
                  />
                </label>

                <label>
                  현재 만족도
                  <select value={feedbackForm.score} onChange={handleFeedbackChange('score')}>
                    <option value="5">5점 매우 만족</option>
                    <option value="4">4점 만족</option>
                    <option value="3">3점 보통</option>
                    <option value="2">2점 아쉬움</option>
                    <option value="1">1점 불편함</option>
                  </select>
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
          </div>
        </main>
      </div>
    </div>
  );
};

export default SupportPage;
