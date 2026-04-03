import React, { memo } from 'react';
import { useHappy } from '../store/HappyContext';
import './HappinessCard.css';

const HappinessCard = ({ item, onClick }) => {
  const { getItemStats, getItemMemos, isItemOwnedByCurrentUser } = useHappy();
  const { myCount } = getItemStats(item.id);
  const memoCount = getItemMemos(item.id).length;
  const hasCardMeta = myCount > 0 || memoCount > 0;
  const isOwner = isItemOwnedByCurrentUser(item.id);

  return (
    <div className="glass-card happiness-card compact" onClick={() => onClick(item)}>
      <div className="card-top-row">
        <div className="card-header">
          <span className="category-badge">{item.category}</span>
          {item.isCustom && isOwner && <span className="custom-badge">MY</span>}
        </div>

        {hasCardMeta && (
          <div className="card-corner-stats">
            {myCount > 0 && (
              <div className="card-corner-stat stamps" aria-label={`행복 기록 ${myCount}번`}>
                <span aria-hidden="true">❤️</span>
                <span>{myCount}</span>
              </div>
            )}
            {memoCount > 0 && (
              <div className="card-corner-stat memos" aria-label={`메모 ${memoCount}개`}>
                <span aria-hidden="true">✏️</span>
                <span>{memoCount}</span>
              </div>
            )}
          </div>
        )}
      </div>
      <h3 className="card-title">{item.title}</h3>
      <p className="card-desc-short">{item.description}</p>
    </div>
  );
};

export default memo(HappinessCard);
