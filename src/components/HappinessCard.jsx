import React, { memo } from 'react';
import { useHappy } from '../store/HappyContext';
import './HappinessCard.css';

const ReportIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path
      d="M12 5.75V12.75"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
    <path
      d="M12 18C12.6904 18 13.25 17.4404 13.25 16.75C13.25 16.0596 12.6904 15.5 12 15.5C11.3096 15.5 10.75 16.0596 10.75 16.75C10.75 17.4404 11.3096 18 12 18Z"
      fill="currentColor"
    />
  </svg>
);

const HappinessCard = ({ item, onClick, onReportClick }) => {
  const { getItemStats, getItemMemos, isItemOwnedByCurrentUser } = useHappy();
  const { myCount } = getItemStats(item.id);
  const memoCount = getItemMemos(item.id).length;
  const hasCardMeta = myCount > 0 || memoCount > 0;
  const isOwner = isItemOwnedByCurrentUser(item.id);
  const canReport = item.isCloudBacked === true;

  const handleReportClick = event => {
    event.stopPropagation();

    if (!canReport) {
      return;
    }

    onReportClick?.(item);
  };

  return (
    <div className="glass-card happiness-card compact" onClick={() => onClick(item)}>
      <div className="card-top-row">
        <div className="card-header">
          <span className="category-badge">{item.category}</span>
          {item.isCustom && isOwner && <span className="custom-badge">MY</span>}
        </div>

        <div className="card-side-actions">
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

          <button
            type="button"
            className={`card-report-btn ${canReport ? '' : 'disabled'}`.trim()}
            onClick={handleReportClick}
            disabled={!canReport}
            aria-label="리스트 신고"
            title={canReport ? '신고하기' : '저장된 리스트만 신고할 수 있어요.'}
          >
            <ReportIcon />
            <span>신고</span>
          </button>
        </div>
      </div>

      <h3 className="card-title">{item.title}</h3>
      <p className="card-desc-short">{item.description}</p>
    </div>
  );
};

export default memo(HappinessCard);
