import React, { useState } from 'react';
import { isSupabaseConfigured } from '../lib/supabase';
import { submitWebsiteIntake } from '../lib/websiteIntake';
import './LandingPage.css';

const companyPrinciples = [
  {
    title: '작은 행복을 자주 발견하게',
    description: '거창한 목표보다 오늘 바로 실행할 수 있는 행복 루틴을 서비스의 중심에 둡니다.'
  },
  {
    title: '기록은 가볍고 꾸준하게',
    description: '복잡한 설정 없이 탭 몇 번으로 남길 수 있어야 습관이 됩니다.'
  },
  {
    title: '서비스는 따뜻하지만 운영은 명확하게',
    description: '약관, 개인정보 처리, 문의 응답 흐름을 제품 바깥에서도 분명하게 제공합니다.'
  }
];

const productHighlights = [
  {
    eyebrow: 'Service',
    title: '행복 발견 앱',
    description: '소확행, 주간 행복, 월간 행복을 모으고 나만의 항목도 추가할 수 있습니다.'
  },
  {
    eyebrow: 'Support',
    title: '도메인 첫 화면은 안내 웹',
    description: '앱 설명, 자주 묻는 질문, 약관, 문의와 피드백 접수를 한곳에서 제공합니다.'
  },
  {
    eyebrow: 'Operation',
    title: '출시 이후 운영을 위한 구조',
    description: '사용자 문의와 서비스 피드백을 분리해 받고 운영팀이 확인하기 쉬운 형태로 모읍니다.'
  }
];

const faqItems = [
  {
    question: 'Happy Finder는 어떤 서비스인가요?',
    answer: '일상 속에서 실천 가능한 행복 항목을 발견하고 기록하면서 나만의 행복 패턴을 쌓는 서비스입니다.'
  },
  {
    question: '웹사이트와 앱은 어떻게 다른가요?',
    answer: '도메인 루트에서는 서비스 소개, 약관, FAQ, 문의 접수를 제공하고 실제 기록 기능은 앱 화면에서 사용합니다.'
  },
  {
    question: '문의나 피드백은 어디로 남기면 되나요?',
    answer: '아래 Q&A 문의 폼과 서비스 피드백 폼으로 남기면 운영 측에서 확인할 수 있도록 저장됩니다.'
  },
  {
    question: '로그인 없이도 앱을 볼 수 있나요?',
    answer: '기존 앱 흐름은 유지되며 게스트 모드 또는 로그인 흐름을 통해 진입할 수 있습니다.'
  }
];

const legalLinks = [
  {
    label: '이용약관',
    href: '/terms/',
    description: '서비스 이용 조건과 운영 원칙을 확인합니다.'
  },
  {
    label: '개인정보처리방침',
    href: '/privacy/',
    description: '수집 항목, 처리 목적, 보관과 삭제 기준을 확인합니다.'
  },
  {
    label: '마케팅 수신 동의',
    href: '/marketing/',
    description: '선택 동의 항목과 발송 목적, 보관 기간을 확인합니다.'
  }
];

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
    return '문의 수집 연결이 아직 완료되지 않았습니다. Supabase 환경변수를 먼저 설정해주세요.';
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

const LandingPage = ({ onOpenApp }) => {
  const [qnaForm, setQnaForm] = useState(initialQnaForm);
  const [feedbackForm, setFeedbackForm] = useState(initialFeedbackForm);
  const [qnaStatus, setQnaStatus] = useState(emptyStatus);
  const [feedbackStatus, setFeedbackStatus] = useState(emptyStatus);
  const [isSubmittingQna, setIsSubmittingQna] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

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
        message: '피드백이 저장되었습니다. 출시 품질 개선에 반영할 수 있도록 운영 메모로 남겨두겠습니다.'
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
    <div className="landing-page">
      <div className="landing-page-shell">
        <header className="landing-hero">
          <nav className="landing-nav">
            <a href="/" className="landing-brand" aria-label="Happy Finder 홈">
              Happy Finder
            </a>

            <div className="landing-nav-links">
              <a href="#about">회사 소개</a>
              <a href="#faq">FAQ</a>
              <a href="#contact">문의</a>
              <a href="#legal">약관</a>
              <button type="button" className="landing-app-button" onClick={onOpenApp}>
                앱 열기
              </button>
            </div>
          </nav>

          <div className="landing-hero-grid">
            <div className="landing-hero-copy">
              <span className="landing-kicker">Find small happiness, repeatedly.</span>
              <h1>Happy Finder는 사용자의 하루 안에서 행복을 더 자주 발견하도록 돕는 서비스입니다.</h1>
              <p>
                도메인 첫 화면에서는 서비스와 운영 원칙을 소개하고, 약관과 문의 창구를 분리해 제공합니다.
                실제 기록과 탐색 경험은 앱 화면에서 이어집니다.
              </p>

              <div className="landing-hero-actions">
                <button type="button" className="landing-primary-cta" onClick={onOpenApp}>
                  지금 앱 열기
                </button>
                <a href="#contact" className="landing-secondary-cta">
                  문의 남기기
                </a>
              </div>

              <div className="landing-hero-note">
                {isSupabaseConfigured
                  ? '문의 및 피드백 접수 연결이 활성화되어 있습니다.'
                  : '문의 폼을 저장하려면 Supabase 환경변수와 테이블 설정이 필요합니다.'}
              </div>
            </div>

            <div className="landing-hero-panel">
              <div className="landing-panel-label">Brand Snapshot</div>
              <div className="landing-panel-title">작은 순간을 서비스로 기록하는 팀</div>
              <ul className="landing-panel-list">
                <li>행복 기록 앱과 브랜드 사이트를 한 도메인 안에서 운영</li>
                <li>약관, 개인정보 처리, 마케팅 동의 문서를 웹에서 즉시 열람 가능</li>
                <li>Q&A 문의와 서비스 피드백을 별도 폼으로 받아 운영 흐름 정리</li>
              </ul>
            </div>
          </div>
        </header>

        <main className="landing-main">
          <section id="about" className="landing-section">
            <div className="landing-section-heading">
              <span>About</span>
              <h2>Happy Finder가 서비스를 운영하는 방식</h2>
              <p>앱 바깥에서도 서비스의 목적과 운영 기준이 보이도록 구성했습니다.</p>
            </div>

            <div className="landing-card-grid landing-card-grid-three">
              {companyPrinciples.map(item => (
                <article key={item.title} className="landing-info-card">
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="landing-section">
            <div className="landing-section-heading">
              <span>Product</span>
              <h2>도메인 첫 화면에 필요한 정보 구조</h2>
              <p>출시용 웹에 필요한 소개, 운영, 접수 흐름을 루트 화면에 배치했습니다.</p>
            </div>

            <div className="landing-card-grid">
              {productHighlights.map(item => (
                <article key={item.title} className="landing-feature-card">
                  <span>{item.eyebrow}</span>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
          </section>

          <section id="legal" className="landing-section">
            <div className="landing-section-heading">
              <span>Legal</span>
              <h2>이용 약관과 정책 문서</h2>
              <p>서비스 소개 화면에서 바로 열어볼 수 있도록 공개 문서 링크를 묶었습니다.</p>
            </div>

            <div className="landing-card-grid">
              {legalLinks.map(item => (
                <a key={item.href} className="landing-legal-card" href={item.href}>
                  <strong>{item.label}</strong>
                  <p>{item.description}</p>
                  <span>문서 보기</span>
                </a>
              ))}
            </div>
          </section>

          <section id="faq" className="landing-section">
            <div className="landing-section-heading">
              <span>FAQ</span>
              <h2>자주 묻는 질문</h2>
              <p>서비스 성격과 웹/앱 분리 구조를 빠르게 이해할 수 있도록 정리했습니다.</p>
            </div>

            <div className="landing-faq-list">
              {faqItems.map(item => (
                <details key={item.question} className="landing-faq-item">
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </section>

          <section id="contact" className="landing-section">
            <div className="landing-section-heading">
              <span>Contact</span>
              <h2>Q&A와 피드백 접수</h2>
              <p>운영 문의와 제품 개선 의견을 구분해서 받을 수 있도록 두 개의 폼으로 구성했습니다.</p>
            </div>

            <div className="landing-contact-grid">
              <article className="landing-form-card">
                <div className="landing-form-header">
                  <h3>Q&A 문의</h3>
                  <p>답변이 필요한 운영 문의, 제휴 문의, 정책 문의를 남겨주세요.</p>
                </div>

                <form className="landing-form" onSubmit={handleQnaSubmit}>
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
                      placeholder="운영팀이 이해할 수 있도록 구체적으로 적어주세요."
                      rows="6"
                      maxLength="3000"
                      required
                    />
                  </label>

                  <input
                    type="text"
                    value={qnaForm.website}
                    onChange={handleQnaChange('website')}
                    className="landing-honeypot"
                    tabIndex="-1"
                    autoComplete="off"
                    aria-hidden="true"
                  />

                  {qnaStatus.message && (
                    <div className={`landing-form-status ${qnaStatus.type}`}>
                      {qnaStatus.message}
                    </div>
                  )}

                  <button type="submit" className="landing-submit-button" disabled={isSubmittingQna}>
                    {isSubmittingQna ? '접수 중...' : 'Q&A 접수하기'}
                  </button>
                </form>
              </article>

              <article className="landing-form-card">
                <div className="landing-form-header">
                  <h3>서비스 피드백</h3>
                  <p>제품 개선 아이디어, 사용성 의견, 출시 전 점검 포인트를 남겨주세요.</p>
                </div>

                <form className="landing-form" onSubmit={handleFeedbackSubmit}>
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
                      placeholder="좋았던 점, 아쉬운 점, 꼭 필요하다고 느끼는 기능을 적어주세요."
                      rows="6"
                      maxLength="3000"
                      required
                    />
                  </label>

                  <input
                    type="text"
                    value={feedbackForm.website}
                    onChange={handleFeedbackChange('website')}
                    className="landing-honeypot"
                    tabIndex="-1"
                    autoComplete="off"
                    aria-hidden="true"
                  />

                  {feedbackStatus.message && (
                    <div className={`landing-form-status ${feedbackStatus.type}`}>
                      {feedbackStatus.message}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="landing-submit-button"
                    disabled={isSubmittingFeedback}
                  >
                    {isSubmittingFeedback ? '전송 중...' : '피드백 보내기'}
                  </button>
                </form>
              </article>
            </div>
          </section>
        </main>

        <footer className="landing-footer">
          <div>
            <strong>Happy Finder</strong>
            <p>작은 행복을 더 자주 발견하게 만드는 서비스.</p>
          </div>

          <div className="landing-footer-links">
            <a href="/terms/">이용약관</a>
            <a href="/privacy/">개인정보처리방침</a>
            <a href="/marketing/">마케팅 수신 동의</a>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;
