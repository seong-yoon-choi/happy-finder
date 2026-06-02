import React from 'react';
import { ACCOUNT_DELETE_PATH, SUPPORT_PATH } from '../lib/routes';
import './LandingPage.css';

const featureCards = [
  {
    label: '둘러보기',
    title: '다른 사람의 행복을 살펴보기',
    description: '누군가가 행복했던 순간을 보고, 내 일상에서도 따라 해보고 싶은 작은 행동을 발견할 수 있습니다.'
  },
  {
    label: '기록',
    title: '오늘의 행복을 남기기',
    description: '사진, 제목, 내용으로 오늘 좋았던 순간을 빠르게 남기고 기록 탭에서 다시 돌아볼 수 있습니다.'
  },
  {
    label: '공감',
    title: '따뜻한 흔적을 남기기',
    description: '내가 공감한 행복과 내가 만든 행복에 남겨진 공감이 쌓이며 서로의 작은 기쁨을 이어줍니다.'
  },
  {
    label: '분석',
    title: '나의 행복 패턴 보기',
    description: '태그, 기록, 메모, 공감, 즐겨찾기를 바탕으로 내가 어떤 행복을 자주 만나는지 확인할 수 있습니다.'
  }
];

const appSummaryPoints = [
  {
    title: '행복 둘러보기',
    description: '다른 사람이 행복했던 순간을 보고 나에게 맞는 작은 행동을 발견합니다.'
  },
  {
    title: '기록과 메모',
    description: '오늘 좋았던 일, 다시 해보고 싶은 행동, 사진과 감정을 함께 남깁니다.'
  },
  {
    title: '공감과 분석',
    description: '공감, 즐겨찾기, 메모, 기록이 쌓이면 나의 행복 패턴을 확인할 수 있습니다.'
  }
];

const LandingPage = ({
  onOpenAuth,
  onOpenProfile,
  onSignOut,
  onNavigate,
  isAuthBusy = false,
  isAuthenticated = false
}) => {
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
              <button type="button" className="landing-nav-link-btn" onClick={navigateToPath(SUPPORT_PATH)}>문의·피드백</button>
              <button
                type="button"
                className={`landing-nav-link-btn ${isAuthenticated ? 'is-authenticated' : ''}`}
                onClick={handleAccountAction}
              >
                {accountActionLabel}
              </button>
              {isAuthenticated && (
                <button
                  type="button"
                  className="landing-nav-link-btn landing-nav-logout-btn"
                  onClick={onSignOut}
                  disabled={isAuthBusy}
                >
                  {isAuthBusy ? '처리 중...' : '로그아웃'}
                </button>
              )}
            </div>
          </nav>

          <div className="landing-hero">
            <div className="landing-hero-copy">
              <div className="landing-hero-mark">
                <img src="/happy-finder-icon.svg" alt="" />
                <span>Happy Finder</span>
              </div>
              <h1>
                일상 속 작은 행복을
                <br />
                발견하고 기록하세요
              </h1>
              <p className="landing-lead">
                다른 사람들은 언제 행복했는지 둘러보고, 나도 해보고 싶은 순간을 저장하고,
                오늘의 행복은 사진과 글로 남겨보세요.
              </p>

              <div className="landing-hero-actions">
                <button
                  type="button"
                  className={`landing-primary-cta ${isAuthenticated ? 'is-authenticated' : ''}`}
                  onClick={handleAccountAction}
                >
                  {accountActionLabel}
                </button>
                <button
                  type="button"
                  className="landing-secondary-cta"
                  onClick={navigateToPath(SUPPORT_PATH)}
                >
                  문의하기
                </button>
              </div>

              <div className="landing-hero-metrics" aria-label="앱 핵심 흐름">
                <span>기록</span>
                <span>공감</span>
                <span>메모</span>
                <span>분석</span>
              </div>
            </div>

            <aside className="landing-app-summary" aria-label="Happy Finder 앱 설명">
              <div className="landing-summary-image">
                <img src="/happiness-sample-journal.svg" alt="" />
              </div>
              <div className="landing-summary-copy">
                <span>APP OVERVIEW</span>
                <h2>작은 행복을 발견하고, 모아두고, 다시 돌아보는 앱</h2>
                <p>
                  Happy Finder는 거창한 변화보다 일상에서 스쳐 지나가는 작은 기쁨에 집중합니다.
                  다른 사람의 행복을 참고하고, 내 행복을 기록하며, 반복되는 패턴을 자연스럽게 찾아보세요.
                </p>
              </div>

              <div className="landing-summary-list">
                {appSummaryPoints.map(item => (
                  <article key={item.title} className="landing-summary-item">
                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
                  </article>
                ))}
              </div>
            </aside>
          </div>
        </header>

        <section className="landing-section" aria-labelledby="landing-feature-title">
          <div className="landing-section-head">
            <span>APP FLOW</span>
            <h2 id="landing-feature-title">Happy Finder에서 이어지는 흐름</h2>
          </div>
          <div className="landing-feature-list">
            {featureCards.map(item => (
              <article key={item.label} className="landing-feature-item">
                <span className="landing-fact-label">{item.label}</span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <footer className="landing-footer">
          <div className="landing-footer-copy">
            <strong>Happy Finder</strong>
            <p>작은 행복을 발견하고, 기록하고, 다시 돌아보는 앱.</p>
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
