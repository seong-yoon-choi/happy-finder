import React, { lazy, useCallback, useMemo, useState } from 'react';
import CreateHappinessModal from '../components/CreateHappinessModal';
import HappinessCard from '../components/HappinessCard';
import LazyLoadBoundary from '../components/LazyLoadBoundary';
import { useHappy } from '../store/HappyContext';
import './Home.css';

const loadHappinessDetailModal = () => import('../components/HappinessDetailModal');
const HappinessDetailModal = lazy(loadHappinessDetailModal);

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path
      d="M10.8 18.1C14.8317 18.1 18.1 14.8317 18.1 10.8C18.1 6.76832 14.8317 3.5 10.8 3.5C6.76832 3.5 3.5 6.76832 3.5 10.8C3.5 14.8317 6.76832 18.1 10.8 18.1Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M16.1 16.1L20.5 20.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const TagIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path d="M5 7H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M8 12H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M10 17H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path d="M12 5V19" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M5 12H19" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

const getSessionShuffleRank = (itemId, seed) => {
  const source = `${seed}:${itemId}`;
  let hash = 2166136261;

  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

const Home = () => {
  const [selectedCard, setSelectedCard] = useState(null);
  const [shouldOpenRecord, setShouldOpenRecord] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [sessionShuffleSeed] = useState(() => `${Date.now()}-${Math.random()}`);
  const { items, authUserNickname } = useHappy();

  const viewerPossessiveLabel = authUserNickname ? `${authUserNickname} 님의` : '나의';

  const currentItems = useMemo(() => {
    return [...items].sort((leftItem, rightItem) => {
      const rankDiff = getSessionShuffleRank(leftItem.id, sessionShuffleSeed)
        - getSessionShuffleRank(rightItem.id, sessionShuffleSeed);

      if (rankDiff !== 0) {
        return rankDiff;
      }

      return leftItem.id.localeCompare(rightItem.id);
    });
  }, [items, sessionShuffleSeed]);

  const handleCardClick = useCallback(item => {
    setShouldOpenRecord(true);
    setSelectedCard(item);
  }, []);

  const handleCloseDetailModal = useCallback(() => {
    setSelectedCard(null);
    setShouldOpenRecord(false);
  }, []);

  return (
    <div className="view-container home-view">
      <header className="home-header">
        <h1>Happy Finder</h1>
        <p>오늘 {viewerPossessiveLabel} 행복은 무엇인가요?</p>
      </header>

      <div className="home-tools" aria-label="행복 목록 도구">
        <button
          type="button"
          className="home-tool-search"
          disabled
          aria-label="검색"
        >
          <SearchIcon />
          <span>검색</span>
        </button>
        <button
          type="button"
          className="home-tool-tag"
          disabled
          aria-label="태그 선택"
        >
          <TagIcon />
        </button>
        <button
          type="button"
          className="home-tool-add"
          aria-label="행복 추가"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <PlusIcon />
        </button>
      </div>

      <div className="feed-container">
        {currentItems.length > 0 ? (
          currentItems.map(item => (
            <HappinessCard
              key={item.id}
              item={item}
              onClick={handleCardClick}
            />
          ))
        ) : (
          <div className="empty-state">
            <div className="empty-icon">🍀</div>
            <p>아직 행복이 없어요.<br />직접 행복을 만들어볼까요?</p>
          </div>
        )}
      </div>

      {selectedCard && (
        <LazyLoadBoundary
          mode="overlay"
          loadingLabel="행복 상세 화면을 불러오는 중이에요."
          errorTitle="행복 상세 화면을 열지 못했어요."
          errorMessage="잠시 후 다시 시도해주세요."
          onDismiss={handleCloseDetailModal}
          resetKey={`${selectedCard.id}-${shouldOpenRecord ? 'record' : 'detail'}`}
        >
          <HappinessDetailModal
            item={selectedCard}
            isOpen={!!selectedCard}
            onClose={handleCloseDetailModal}
            showOwnerInsights={false}
            canDelete={false}
            autoOpenMemoComposer={shouldOpenRecord}
          />
        </LazyLoadBoundary>
      )}

      {isCreateModalOpen && (
        <CreateHappinessModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />
      )}
    </div>
  );
};

export default Home;
