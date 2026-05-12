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

const ShareIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      d="M4.75 12.1L19.25 5.25L16.2 18.75L12.2 13.5L8.9 16.65L9.45 12.65L4.75 12.1Z"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
    />
    <path
      d="M9.45 12.65L19.25 5.25"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
    />
  </svg>
);

const HappinessCard = ({ item, onClick }) => {
  const { getItemMemos, isItemOwnedByCurrentUser } = useHappy();
  const isOwner = isItemOwnedByCurrentUser(item.id);
  const memoCount = getItemMemos(item.id).length;
  const hasMemo = memoCount > 0;

  return (
    <div className="glass-card happiness-card compact" onClick={() => onClick(item)}>
      <div className="card-top-row">
        <div className="card-header">
          {item.isCustom && isOwner && <span className="custom-badge">MY</span>}
        </div>
        <div className="card-top-actions">
          {hasMemo && (
            <span className="card-note-indicator" aria-label={`memo ${memoCount}`}>
              <NoteIcon />
              <span>{memoCount}</span>
            </span>
          )}
          <button
            type="button"
            className="card-share-btn"
            onClick={event => event.stopPropagation()}
            aria-label="share"
          >
            <ShareIcon />
          </button>
        </div>
      </div>
      <h3 className="card-title">{item.title}</h3>
      <p className="card-desc-short">{item.description}</p>
    </div>
  );
};

export default memo(HappinessCard);
