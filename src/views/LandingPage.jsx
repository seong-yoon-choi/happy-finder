import React from 'react';
import { ACCOUNT_DELETE_PATH, SUPPORT_PATH } from '../lib/routes';
import './LandingPage.css';

const quickFacts = [
  {
    label: '기록',
    value: '내 행복을 바로 남기기',
    description: '다른 사람의 행복 경험을 따라 해보고, 오늘 내가 느낀 순간도 사진과 글로 남길 수 있습니다.'
  },
  {
    label: '관리',
    value: '즐겨찾기와 기록',
    description: '마음에 드는 행복은 즐겨찾기로 저장하고, 각 항목마다 내 경험을 덧붙여 다시 돌아볼 수 있습니다.'
  },
  {
    label: '루틴',
    value: '꾸준히 이어가는 흐름',
    description: '작은 행복을 자주 보고 기록하면서 나에게 잘 맞는 행복의 패턴을 만들어갈 수 있습니다.'
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
              <p className="landing-eyebrow">Share small happiness in everyday life.</p>
              <h1>
                다른 사람들은
                <br />
                언제 행복했을까요?
                <br />
                나도 그 행복을
                <br />
                <span className="landing-hero-nowrap">일상에 가져와 보세요.</span>
              </h1>
              <p className="landing-lead">
                Happy Finder는 사람들이 언제 행복했는지 보여주고,
                오늘의 작은 기쁨을 사진과 글로 남길 수 있게 도와줍니다.
              </p>
              <p className="landing-lead landing-lead-secondary">
                마음에 드는 행복은 저장하고, 직접 해본 순간은 기록하며 나만의 행복 패턴을 만들어 보세요.
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
            <p>사람들의 행복 경험을 내 일상으로 가져오는 앱.</p>
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
