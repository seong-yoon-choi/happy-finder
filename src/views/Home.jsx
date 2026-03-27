import React, { lazy, useCallback, useMemo, useState } from 'react';
import CategoryTabs from '../components/CategoryTabs';
import HappinessCard from '../components/HappinessCard';
import LazyLoadBoundary from '../components/LazyLoadBoundary';
import { useHappy } from '../store/HappyContext';
import './Home.css';

const homeCategories = ['랜덤행복', '소확행', '기분전환', '제대로'];
const loadHappinessDetailModal = () => import('../components/HappinessDetailModal');
const HappinessDetailModal = lazy(loadHappinessDetailModal);

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
  const [selectedCategory, setSelectedCategory] = useState('랜덤행복');
  const [selectedCard, setSelectedCard] = useState(null);
  const [sessionShuffleSeed] = useState(() => `${Date.now()}-${Math.random()}`);
  const { items, authUserNickname } = useHappy();

  const viewerPossessiveLabel = authUserNickname ? `${authUserNickname} 님의` : '나의';

  const currentItems = useMemo(() => {
    const sourceItems = selectedCategory === '랜덤행복'
      ? items
      : items.filter(item => item.category === selectedCategory);

    return [...sourceItems].sort((leftItem, rightItem) => {
      const rankDiff = getSessionShuffleRank(leftItem.id, sessionShuffleSeed)
        - getSessionShuffleRank(rightItem.id, sessionShuffleSeed);

      if (rankDiff !== 0) {
        return rankDiff;
      }

      return leftItem.id.localeCompare(rightItem.id);
    });
  }, [items, selectedCategory, sessionShuffleSeed]);

  const handleCardClick = useCallback(item => {
    setSelectedCard(item);
  }, []);

  const handleCloseDetailModal = useCallback(() => {
    setSelectedCard(null);
  }, []);

  return (
    <div className="view-container home-view">
      <header className="home-header">
        <h1>Happy Finder</h1>
        <p>오늘 {viewerPossessiveLabel} 행복은 무엇인가요?</p>
      </header>

      <CategoryTabs
        selected={selectedCategory}
        onSelect={setSelectedCategory}
        categories={homeCategories}
      />

      <div className="feed-container">
        {currentItems.length > 0 ? (
          currentItems.map(item => (
            <HappinessCard key={item.id} item={item} onClick={handleCardClick} />
          ))
        ) : (
          <div className="empty-state">
            <div className="empty-icon">🍀</div>
            <p>아직 이 카테고리에는 행복이 없어요.<br />직접 행복을 만들어볼까요?</p>
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
          resetKey={selectedCard.id}
        >
          <HappinessDetailModal
            item={selectedCard}
            isOpen={!!selectedCard}
            onClose={handleCloseDetailModal}
            showOwnerInsights={false}
            canDelete={false}
          />
        </LazyLoadBoundary>
      )}
    </div>
  );
};

export default Home;
