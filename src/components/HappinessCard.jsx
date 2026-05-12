import React, { memo } from 'react';
import { useHappy } from '../store/HappyContext';
import './HappinessCard.css';

const NoteIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      d="M7.25 4.75H14.4L18.75 9.1V18.75C18.75 19.58 18.08 20.25 17.25 20.25H7.25C6.42 20.25 5.75 19.58 5.75 18.75V6.25C5.75 5.42 6.42 4.75 7.25 4.75Z"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
    <path
      d="M14.25 4.9V9.25H18.6M9 13H15M9 16.25H14"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
  </svg>
);

const HappinessCard = ({ item, onClick }) => {
  const { getItemMemos, isItemOwnedByCurrentUser } = useHappy();
  const isOwner = isItemOwnedByCurrentUser(item.id);
  const hasMemo = getItemMemos(item.id).length > 0;

  return (
    <div className="glass-card happiness-card compact" onClick={() => onClick(item)}>
      <div className="card-top-row">
        <div className="card-header">
          {item.isCustom && isOwner && <span className="custom-badge">MY</span>}
        </div>
        {hasMemo && (
          <span className="card-note-indicator" aria-label="작성한 메모 있음">
            <NoteIcon />
          </span>
        )}
      </div>
      <h3 className="card-title">{item.title}</h3>
      <p className="card-desc-short">{item.description}</p>
    </div>
  );
};

export default memo(HappinessCard);
