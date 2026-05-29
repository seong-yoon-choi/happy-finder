import React, { lazy, useCallback, useState } from 'react';
import { useHappy } from '../store/HappyContext';
import HappinessCard from '../components/HappinessCard';
import CreateHappinessModal from '../components/CreateHappinessModal';
import LazyLoadBoundary from '../components/LazyLoadBoundary';
import './Profile.css';

const loadHappinessDetailModal = () => import('../components/HappinessDetailModal');
const HappinessDetailModal = lazy(loadHappinessDetailModal);

const ProfileFavoriteIcon = ({ isActive = false }) => (
  <svg viewBox="0 0 24 24" fill={isActive ? 'currentColor' : 'none'} aria-hidden="true" focusable="false">
    <path
      d="M12 3.9L14.5 9.06L20.18 9.89L16.07 13.88L17.04 19.5L12 16.8L6.96 19.5L7.93 13.88L3.82 9.89L9.5 9.06L12 3.9Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  </svg>
);

const ProfileEmpathyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <circle
      cx="12"
      cy="12"
      r="8.25"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    <circle cx="9.15" cy="10.4" r="1" fill="currentColor" />
    <circle cx="14.85" cy="10.4" r="1" fill="currentColor" />
    <path
      d="M8.8 13.7C10.2 15.65 13.8 15.65 15.2 13.7"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.8"
    />
  </svg>
);

const ProfileCreatedIcon = () => (
  <span aria-hidden="true">+</span>
);

const Profile = () => {
  const {
    items,
    userEmpathies,
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
  const empathizedItems = items.filter(item => userEmpathies?.[item.id]);
  const profileTitle = authUserNickname ? `${authUserNickname} 님의 행복 프로필` : '나의 행복 프로필';
  const activeItems = activeTab === 'favorites'
    ? favoriteItems
    : activeTab === 'empathies' ? empathizedItems : myItems;

  const emptyStateByTab = {
    favorites: (
      <>
        등록된 즐겨찾기가 존재하지 않아요
        <br />
        마음에 드는 즐겨찾기를 등록해 보세요
      </>
    ),
    empathies: (
      <>
        아직 공감한 행복이 존재하지 않아요
        <br />
        마음이 닿는 행복에 공감을 남겨보세요
      </>
    ),
    myItems: (
      <>
        아직 내 행복이 존재하지 않아요
        <br />
        나만의 행복을 만들어 보세요
      </>
    )
  };

  const handleCardClick = useCallback(item => {
    setShouldOpenRecord(true);
    setSelectedCard(item);
  }, []);

  const handleCloseDetailModal = useCallback(() => {
    setSelectedCard(null);
    setShouldOpenRecord(false);
  }, []);

  return (
    <div className="view-container profile-view">
      <header className="profile-header">
        <div className="profile-brand" aria-label="Happy Finder 로고">Happy Finder</div>

        <section className="glass-card profile-overview">
          <div className="profile-overview-simple">
            <h2>{profileTitle}</h2>
            <p>즐겨찾기, 공감한 행복, 직접 만든 행복을 모아 관리해요.</p>
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
          type="button"
          className={`profile-tab-btn ${activeTab === 'favorites' ? 'active' : ''}`}
          onClick={() => setActiveTab('favorites')}
          aria-pressed={activeTab === 'favorites'}
        >
          <span className="profile-tab-icon" aria-hidden="true">
            <ProfileFavoriteIcon isActive={activeTab === 'favorites'} />
          </span>
          <span className="profile-tab-label">즐겨찾기</span>
          <strong>{favoriteItems.length}</strong>
        </button>

        <button
          type="button"
          className={`profile-tab-btn ${activeTab === 'empathies' ? 'active' : ''}`}
          onClick={() => setActiveTab('empathies')}
          aria-pressed={activeTab === 'empathies'}
        >
          <span className="profile-tab-icon" aria-hidden="true">
            <ProfileEmpathyIcon />
          </span>
          <span className="profile-tab-label">내가 공감한 행복</span>
          <strong>{empathizedItems.length}</strong>
        </button>

        <button
          type="button"
          className={`profile-tab-btn ${activeTab === 'myItems' ? 'active' : ''}`}
          onClick={() => setActiveTab('myItems')}
          aria-pressed={activeTab === 'myItems'}
        >
          <span className="profile-tab-icon profile-tab-icon-text">
            <ProfileCreatedIcon />
          </span>
          <span className="profile-tab-label">만든 행복</span>
          <strong>{myItems.length}</strong>
        </button>
      </div>

      <div className="feed-container">
        {activeItems.length > 0 ? (
          activeItems.map(item => (
            <HappinessCard
              key={item.id}
              item={item}
              onClick={handleCardClick}
            />
          ))
        ) : (
          <div className="empty-state">
            {emptyStateByTab[activeTab]}
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
