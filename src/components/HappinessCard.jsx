import React, { memo } from 'react';
import { useHappy } from '../store/HappyContext';
import './HappinessCard.css';

const HappinessCard = ({ item, onClick, onRecord }) => {
  const { userFavorites, toggleFavorite, isItemOwnedByCurrentUser } = useHappy();
  const isOwner = isItemOwnedByCurrentUser(item.id);
  const isMyHappy = Boolean(userFavorites[item.id]);

  const handleRecordClick = event => {
    event.stopPropagation();
    if (onRecord) {
      onRecord(item);
      return;
    }

    onClick(item);
  };

  const handleMyHappyClick = event => {
    event.stopPropagation();
    toggleFavorite(item.id);
  };

  return (
    <div className="glass-card happiness-card compact" onClick={() => onClick(item)}>
      <div className="card-top-row">
        <div className="card-header">
          {item.isCustom && isOwner && <span className="custom-badge">MY</span>}
          {item.isCustom && item.isPublic && <span className="public-badge">공개</span>}
        </div>
      </div>
      <h3 className="card-title">{item.title}</h3>
      <p className="card-desc-short">{item.description}</p>
      <div className="card-action-row">
        <button
          type="button"
          className="card-record-btn"
          onClick={handleRecordClick}
        >
          기록하기
        </button>
        <button
          type="button"
          className={`card-my-happy-btn ${isMyHappy ? 'active' : ''}`}
          onClick={handleMyHappyClick}
          aria-label={isMyHappy ? '내 행복에서 제거' : '내 행복에 추가'}
          aria-pressed={isMyHappy}
        >
          {isMyHappy ? '♥' : '♡'}
        </button>
      </div>
    </div>
  );
};

export default memo(HappinessCard);
