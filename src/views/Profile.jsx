import React, { lazy, useCallback, useState } from 'react';
import { useHappy } from '../store/HappyContext';
import HappinessCard from '../components/HappinessCard';
import CreateHappinessModal from '../components/CreateHappinessModal';
import LazyLoadBoundary from '../components/LazyLoadBoundary';
import './Profile.css';

const loadHappinessDetailModal = () => import('../components/HappinessDetailModal');
const HappinessDetailModal = lazy(loadHappinessDetailModal);

const Profile = () => {
  const {
    getMyItems,
    getFavoriteItems,
    authUserNickname
  } = useHappy();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('favorites');
  const [selectedCard, setSelectedCard] = useState(null);
  const [shouldOpenRecord, setShouldOpenRecord] = useState(false);

  const myItems = getMyItems();
  const favoriteItems = getFavoriteItems();
  const profileTitle = authUserNickname ? `${authUserNickname} 님의 행복 프로필` : '나의 행복 프로필';

  const handleCardClick = useCallback(item => {
    setShouldOpenRecord(false);
    setSelectedCard(item);
  }, []);

  const handleCardRecord = useCallback(item => {
    setShouldOpenRecord(true);
    setSelectedCard(item);
  }, []);

  const handleCloseDetailModal = useCallback(() => {
    setSelectedCard(null);
    setShouldOpenRecord(false);
  }, []);

  const activeItems = activeTab === 'favorites' ? favoriteItems : myItems;

  return (
    <div className="view-container profile-view">
      <header className="profile-header">
        <div className="profile-brand" aria-label="Happy Finder 로고">Happy Finder</div>

        <section className="glass-card profile-overview">
          <div className="profile-overview-simple">
            <h2>{profileTitle}</h2>
            <p>내 행복과 직접 만든 행복을 모아 관리해요.</p>

            <div className="profile-summary-chips" aria-label="내 행복 요약">
              <div className="profile-summary-chip">
                <span>내 행복</span>
                <strong>{favoriteItems.length}</strong>
              </div>
              <div className="profile-summary-chip">
                <span>만든 행복</span>
                <strong>{myItems.length}</strong>
              </div>
            </div>
          </div>

          <button
            className="btn-primary create-btn"
            onClick={() => setIsModalOpen(true)}
          >
            + 내 행복 만들기
          </button>
        </section>
      </header>

      <div className="profile-tabs">
        <button
          className={`tab-btn ${activeTab === 'favorites' ? 'active' : ''}`}
          onClick={() => setActiveTab('favorites')}
        >
          내 행복 ({favoriteItems.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'myItems' ? 'active' : ''}`}
          onClick={() => setActiveTab('myItems')}
        >
          만든 행복 ({myItems.length})
        </button>
      </div>

      <div className="feed-container">
        {activeItems.length > 0 ? (
          activeItems.map(item => (
            <HappinessCard
              key={item.id}
              item={item}
              onClick={handleCardClick}
              onRecord={handleCardRecord}
            />
          ))
        ) : (
          <div className="empty-state">
            {activeTab === 'favorites' ? (
              <>
                내 행복으로 추가한 항목이 없어요.
                <br />
                마음에 드는 행복을 하트로 저장해보세요.
              </>
            ) : (
              <>
                직접 만든 행복이 없어요.
                <br />
                + 버튼으로 내 행복을 만들어보세요.
              </>
            )}
          </div>
        )}
      </div>

      {isModalOpen && (
        <CreateHappinessModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {selectedCard && (
        <LazyLoadBoundary
          mode="overlay"
          loadingLabel="행복 상세 화면을 불러오는 중이에요."
          errorTitle="행복 상세 화면을 열지 못했어요."
          errorMessage="잠시 후 다시 시도해주세요."
          onDismiss={handleCloseDetailModal}
          resetKey={`${selectedCard.id}-${activeTab}-${shouldOpenRecord ? 'record' : 'detail'}`}
        >
          <HappinessDetailModal
            item={selectedCard}
            isOpen={!!selectedCard}
            onClose={handleCloseDetailModal}
            canDelete={activeTab === 'myItems'}
            autoOpenMemoComposer={shouldOpenRecord}
          />
        </LazyLoadBoundary>
      )}
    </div>
  );
};

export default Profile;
