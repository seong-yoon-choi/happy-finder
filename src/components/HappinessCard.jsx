import React, { memo } from 'react';
import { useHappy } from '../store/HappyContext';
import './HappinessCard.css';

const HappinessCard = ({ item, onClick }) => {
  const { isItemOwnedByCurrentUser } = useHappy();
  const isOwner = isItemOwnedByCurrentUser(item.id);

  return (
    <div className="glass-card happiness-card compact" onClick={() => onClick(item)}>
      <div className="card-top-row">
        <div className="card-header">
          {item.isCustom && isOwner && <span className="custom-badge">MY</span>}
        </div>
      </div>
      <h3 className="card-title">{item.title}</h3>
      <p className="card-desc-short">{item.description}</p>
    </div>
  );
};

export default memo(HappinessCard);
