import React from 'react';
import { ACCOUNT_DELETE_PATH, SUPPORT_PATH } from '../lib/routes';
import './LandingPage.css';

const quickFacts = [
  {
    label: '기록',
    value: '행복을 바로 남기기',
    description: '행복 리스트에서 오늘의 순간을 바로 기록하고 나만의 행복 항목도 직접 추가할 수 있습니다.'
  },
  {
    label: '관리',
    value: '즐겨찾기와 기록',
    description: '자주 보고 싶은 행복은 즐겨찾기로 저장하고, 각 항목마다 기록을 남겨 나중에 다시 돌아볼 수 있습니다.'
  },
  {
    label: '루틴',
    value: '꾸준히 이어가는 흐름',
    description: '프로필과 리마인더 설정으로 행복 기록을 일상 루틴처럼 이어갈 수 있습니다.'
  }
];

const LandingPage = ({ onOpenAuth, onOpenProfile, onNavigate, isAuthenticated = false }) => {
  const navigateToPath = nextPath => () => onNavigate?.(nextPath);
  const handleAccountAction = isAuthenticated ? onOpenProfile : onOpenAuth;
  const accountActionLabel = isAuthenticated ? '프로필' : '로그인';

  return (
    <div className="landing-page">
      <div className="landing-page-shell">
        <header className="landing-header">
          <nav className="landing-nav">
            <a href="/" className="landing-brand" aria-label="Happy Finder 홈">
              Happy Finder
            </a>

            <div className="landing-nav-links">
              <button type="button" className="landing-nav-link-btn" onClick={navigateToPath(SUPPORT_PATH)}>QnA &amp; Feedback</button>
              <button
                type="button"
                className={`landing-nav-link-btn ${isAuthenticated ? 'is-authenticated' : ''}`}
                onClick={handleAccountAction}
              >
                {accountActionLabel}
              </button>
            </div>
          </nav>

          <div className="landing-hero">
            <div className="landing-hero-copy">
              <p className="landing-eyebrow">Find happiness and smiles in this app.</p>
              <h1>
                일상이 지루하다면
                <br />
                일상이 우울하다면
                <br />
                행복을 찾고 싶다면
                <br />
                <span className="landing-hero-nowrap">Happy Finder를 사용해 보세요!</span>
              </h1>
              <p className="landing-lead">
                Happy Finder는 여러분이 더 쉽고 더 많이 행복을 찾을 수 있도록 도와줍니다.
                오늘의 작은 기쁨을 가볍게 남기고, 다시 꺼내보며 나만의 행복한 루틴을 만들어 보세요.
              </p>
              <p className="landing-lead landing-lead-secondary">
                일상 속 작은 행복을 더 자주 찾고 행복한 순간들을 기록해 보세요.
              </p>

              <div className="landing-hero-actions">
                <button
                  type="button"
                  className={`landing-primary-cta ${isAuthenticated ? 'is-authenticated' : ''}`}
                  onClick={handleAccountAction}
                >
                  {accountActionLabel}
                </button>
              </div>
            </div>

            <aside className="landing-panel landing-hero-side" aria-label="앱 핵심 기능">
              <div className="landing-panel-head">
                <h2>앱에서 바로 할 수 있는 일</h2>
              </div>

              <div className="landing-feature-list">
              {quickFacts.map(item => (
                  <article key={item.label} className="landing-feature-item">
                  <span className="landing-fact-label">{item.label}</span>
                  <strong>{item.value}</strong>
                  <p>{item.description}</p>
                </article>
              ))}
              </div>
            </aside>
          </div>
        </header>

        <footer className="landing-footer">
          <div className="landing-footer-copy">
            <strong>Happy Finder</strong>
            <p>작은 행복을 더 자주 발견하게 만드는 앱.</p>
          </div>

          <div className="landing-footer-links">
            <a href="/terms/index.html">이용약관</a>
            <a href="/privacy/index.html">개인정보처리방침</a>
            <a href="/marketing/index.html">마케팅 수신 동의</a>
            <button type="button" className="landing-footer-link-btn" onClick={navigateToPath(ACCOUNT_DELETE_PATH)}>
              계정 삭제
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;
