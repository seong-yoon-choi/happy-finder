import React, { lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { useHappy } from '../store/HappyContext';
import HappinessCard from '../components/HappinessCard';
import CategoryTabs from '../components/CategoryTabs';
import CreateHappinessModal from '../components/CreateHappinessModal';
import GrowthStageAvatar from '../components/GrowthStageAvatar';
import LazyLoadBoundary from '../components/LazyLoadBoundary';
import useModalBackNavigation from '../hooks/useModalBackNavigation';
import { TREE_STAGE_MILESTONES, getTreeInfo } from '../utils/progress';
import { getLocalDateKey } from '../utils/date';
import './Profile.css';

const stampedCategories = ['전체', '소확행', '기분전환', '제대로'];
const loadHappinessDetailModal = () => import('../components/HappinessDetailModal');
const HappinessDetailModal = lazy(loadHappinessDetailModal);

const FlameIcon = () => <span className="streak-flame" aria-hidden="true">🔥</span>;

const StageListIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
    <path d="M5 6.5H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M5 10H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M5 13.5H12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="3" cy="6.5" r="0.9" fill="currentColor" />
    <circle cx="3" cy="10" r="0.9" fill="currentColor" />
    <circle cx="3" cy="13.5" r="0.9" fill="currentColor" />
  </svg>
);

const getMillisecondsUntilNextMidnight = (now = new Date()) => {
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return Math.max(nextMidnight.getTime() - now.getTime(), 1000);
};

const GrowthStageListModal = ({ currentStageId, isOpen, onClose }) => {
  const requestClose = useModalBackNavigation({
    isOpen,
    onClose,
    historyKey: 'growth-stage-list'
  });

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="modal-overlay growth-stage-modal-overlay"
      data-block-pull-refresh="true"
      onClick={() => requestClose()}
    >
      <div
        className="glass-panel growth-stage-modal"
        data-block-pull-refresh="true"
        onClick={event => event.stopPropagation()}
      >
        <button
          type="button"
          className="close-btn growth-stage-modal-close"
          onClick={() => requestClose()}
          aria-label="행복 성장 목록 닫기"
        >
          &times;
        </button>

        <div className="growth-stage-modal-header">
          <h2>행복 성장 목록</h2>
          <p>행복을 쌓은 개수에 따라 프로필 이미지가 바뀌어요.</p>
        </div>

        <div className="growth-stage-list">
          {TREE_STAGE_MILESTONES.map(stage => {
            const isCurrent = stage.id === currentStageId;
            const thresholdLabel = `${stage.minStamps.toLocaleString('ko-KR')}개부터`;

            return (
              <div
                key={stage.id}
                className={`growth-stage-item ${isCurrent ? 'current' : ''}`}
                aria-current={isCurrent ? 'true' : undefined}
              >
                <div className="growth-stage-item-avatar">
                  <GrowthStageAvatar stageId={stage.id} label={stage.title} />
                </div>
                <div className="growth-stage-item-copy">
                  <div className="growth-stage-item-title-row">
                    <strong>{stage.title}</strong>
                    {isCurrent && <span>현재</span>}
                  </div>
                  <p>{thresholdLabel}</p>
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          className="btn-primary growth-stage-modal-button"
          onClick={() => requestClose()}
        >
          확인
        </button>
      </div>
    </div>
  );
};

const Profile = () => {
  const {
    totalStamps,
    getStampedItems,
    getMyItems,
    getFavoriteItems,
    globalStreak,
    authUserNickname
  } = useHappy();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('stamped');
  const [selectedStampedCategory, setSelectedStampedCategory] = useState('전체');
  const [selectedCard, setSelectedCard] = useState(null);
  const [showTreeTooltip, setShowTreeTooltip] = useState(false);
  const [isGrowthStageListOpen, setIsGrowthStageListOpen] = useState(false);
  const [todayKey, setTodayKey] = useState(() => getLocalDateKey());

  const stampedItems = getStampedItems();
  const myItems = getMyItems();
  const favoriteItems = getFavoriteItems();

  const filteredStampedItems = useMemo(() => {
    if (selectedStampedCategory === '전체') {
      return stampedItems;
    }

    return stampedItems.filter(item => item.category === selectedStampedCategory);
  }, [selectedStampedCategory, stampedItems]);

  const treeInfo = getTreeInfo(totalStamps);
  const profileTitle = authUserNickname ? `${authUserNickname} 님의 행복 프로필` : '나의 행복 프로필';
  const streakLastDateKey = globalStreak?.lastDate ? getLocalDateKey(globalStreak.lastDate) : null;
  const isStreakFilled = Boolean(globalStreak?.current > 0 && streakLastDateKey === todayKey);

  useEffect(() => {
    let timeoutId;

    const scheduleMidnightRefresh = () => {
      timeoutId = window.setTimeout(() => {
        setTodayKey(getLocalDateKey());
        scheduleMidnightRefresh();
      }, getMillisecondsUntilNextMidnight() + 100);
    };

    scheduleMidnightRefresh();

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  const toggleTreeTooltip = () => {
    setShowTreeTooltip(prev => {
      const nextValue = !prev;

      if (nextValue) {
        window.setTimeout(() => setShowTreeTooltip(false), 3000);
      }

      return nextValue;
    });
  };

  const handleCardClick = useCallback(item => {
    setSelectedCard(item);
  }, []);

  const handleCloseDetailModal = useCallback(() => {
    setSelectedCard(null);
  }, []);

  return (
    <div className="view-container profile-view">
      <header className="profile-header">
        <div className="profile-brand" aria-label="Happy Finder 로고">Happy Finder</div>

        <section className="glass-card profile-overview">
          <button
            type="button"
            className="profile-stage-list-trigger"
            onClick={() => setIsGrowthStageListOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={isGrowthStageListOpen}
          >
            <StageListIcon />
            <span>목록 보기</span>
          </button>

          <div className="profile-overview-top">
            <div className="profile-tree-section" onClick={toggleTreeTooltip}>
              <div className="profile-avatar tree-avatar clickable-avatar">
                <GrowthStageAvatar stageId={treeInfo.id} label={treeInfo.title} />
              </div>
              <div className="tree-title">{treeInfo.title}</div>

              {showTreeTooltip && treeInfo.nextAt && (
                <div className="tree-tooltip">
                  다음 성장까지 {treeInfo.nextAt - totalStamps}개의 행복이 남았어요!
                </div>
              )}

              {showTreeTooltip && !treeInfo.nextAt && (
                <div className="tree-tooltip">
                  최고 단계에 도달했어요. 계속 행복을 찾아보세요!
                </div>
              )}
            </div>

            <div className="profile-overview-copy">
              <h2>{profileTitle}</h2>

              <div className="stamp-summary">
                총 <span className="highlight-number">{totalStamps}</span>번의 행복을 찾았어요!
              </div>

              {globalStreak && globalStreak.current > 0 && (
                <div className={`streak-summary ${isStreakFilled ? 'active' : 'inactive'}`}>
                  <FlameIcon />
                  {isStreakFilled ? (
                    <>행복하기 <span className="highlight-number">{globalStreak.current}</span>일째</>
                  ) : (
                    <>행복해져 보세요</>
                  )}
                </div>
              )}
            </div>
          </div>

          <button
            className="btn-primary create-btn"
            onClick={() => setIsModalOpen(true)}
          >
            + 나만의 행복 만들기
          </button>
        </section>
      </header>

      <div className="profile-tabs">
        <button
          className={`tab-btn ${activeTab === 'stamped' ? 'active' : ''}`}
          onClick={() => setActiveTab('stamped')}
        >
          찾은 행복 ({stampedItems.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'favorites' ? 'active' : ''}`}
          onClick={() => setActiveTab('favorites')}
        >
          즐겨찾기 ({favoriteItems.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'myItems' ? 'active' : ''}`}
          onClick={() => setActiveTab('myItems')}
        >
          만든 행복 ({myItems.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'inquiries' ? 'active' : ''}`}
          style={{ display: 'none' }}
          onClick={() => setActiveTab('inquiries')}
        >
          문의 내역
        </button>
      </div>

      <div className="feed-container">
        {activeTab === 'stamped' && (
          <>
            {stampedItems.length > 0 && (
              <div className="profile-stamped-categories">
                <CategoryTabs
                  selected={selectedStampedCategory}
                  onSelect={setSelectedStampedCategory}
                  categories={stampedCategories}
                />
              </div>
            )}

            {stampedItems.length > 0 ? (
              filteredStampedItems.length > 0 ? (
                filteredStampedItems.map(item => (
                  <HappinessCard
                    key={item.id}
                    item={item}
                    onClick={handleCardClick}
                  />
                ))
              ) : (
                <div className="empty-state">
                  아직 {selectedStampedCategory}에서 찾은 행복이 없어요.
                  <br />
                  다른 카테고리도 확인해보세요!
                </div>
              )
            ) : (
              <div className="empty-state">
                아직 찾은 행복이 없어요.
                <br />
                오늘의 행복 하나를 찾아보세요!
              </div>
            )}
          </>
        )}

        {activeTab === 'favorites' && (
          favoriteItems.length > 0 ? (
            favoriteItems.map(item => (
              <HappinessCard
                key={item.id}
                item={item}
                onClick={handleCardClick}
              />
            ))
          ) : (
            <div className="empty-state">
              즐겨찾기한 행복이 없어요.
              <br />
              마음에 드는 행복을 저장해보세요!
            </div>
          )
        )}

        {activeTab === 'myItems' && (
          myItems.length > 0 ? (
            myItems.map(item => (
              <HappinessCard
                key={item.id}
                item={item}
                onClick={handleCardClick}
              />
            ))
          ) : (
            <div className="empty-state">
              직접 만든 행복이 없어요.
              <br />
              + 버튼으로 나만의 행복을 추가해보세요!
            </div>
          )
        )}

      </div>

      {isModalOpen && (
        <CreateHappinessModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {isGrowthStageListOpen && (
        <GrowthStageListModal
          currentStageId={treeInfo.id}
          isOpen={isGrowthStageListOpen}
          onClose={() => setIsGrowthStageListOpen(false)}
        />
      )}

      {selectedCard && (
        <LazyLoadBoundary
          mode="overlay"
          loadingLabel="행복 상세 화면을 불러오는 중이에요."
          errorTitle="행복 상세 화면을 열지 못했어요."
          errorMessage="잠시 후 다시 시도해주세요."
          onDismiss={handleCloseDetailModal}
          resetKey={`${selectedCard.id}-${activeTab}`}
        >
          <HappinessDetailModal
            item={selectedCard}
            isOpen={!!selectedCard}
            onClose={handleCloseDetailModal}
            showOwnerInsights
            canDelete={activeTab === 'myItems'}
          />
        </LazyLoadBoundary>
      )}
    </div>
  );
};

export default Profile;
