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
              <img className="landing-brand-icon" src="/happy-finder-icon.svg" alt="" aria-hidden="true" />
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

            <aside className="landing-app-summary" aria-label="행복 분석 미리보기">
              <div className="landing-summary-copy">
                <span>ANALYSIS PREVIEW</span>
                <h2>나의 데이터들로 내 성향을 분석해 보세요</h2>
                <p>
                  기록, 메모, 공감, 즐겨찾기가 쌓이면 내가 어떤 행복을 자주 만나는지 그래프와 리포트로 확인할 수 있습니다.
                </p>
              </div>

              <div className="landing-analysis-preview">
                <div className="landing-analysis-summary">
                  <span>이번 주 행복 지수</span>
                  <strong>??</strong>
                </div>

                <div className="landing-analysis-chart" aria-hidden="true">
                  <div className="landing-analysis-grid" />
                  <svg viewBox="0 0 260 116" focusable="false">
                    <path
                      className="landing-analysis-area"
                      d="M16 92L55 76L94 82L133 52L172 66L211 38L244 48L244 106L16 106Z"
                    />
                    <path
                      className="landing-analysis-line"
                      d="M16 92L55 76L94 82L133 52L172 66L211 38L244 48"
                    />
                    {[16, 55, 94, 133, 172, 211, 244].map((x, index) => {
                      const yValues = [92, 76, 82, 52, 66, 38, 48];
                      return <circle key={x} cx={x} cy={yValues[index]} r="5" />;
                    })}
                  </svg>
                </div>

                <div className="landing-analysis-bars">
                  <div>
                    <span>혼자</span>
                    <i><b style={{ width: '62%' }} /></i>
                    <em>??%</em>
                  </div>
                  <div>
                    <span>실내</span>
                    <i><b style={{ width: '48%' }} /></i>
                    <em>??%</em>
                  </div>
                  <div>
                    <span>길게</span>
                    <i><b style={{ width: '74%' }} /></i>
                    <em>??%</em>
                  </div>
                </div>
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
