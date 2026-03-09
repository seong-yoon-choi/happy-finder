import React, { useState, useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useHappy } from '../store/HappyContext';
import { getLocalDateKey } from '../utils/date';
import './HappinessDetailModal.css';

const memoDateTimeFormatter = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit'
});

const fireCelebration = () => {
  const burstCount = 8;
  let remainingBursts = burstCount;
  const defaults = { startVelocity: 25, spread: 360, ticks: 60, zIndex: 10000 };
  const origins = [
    { x: 0.2, y: 0.1 },
    { x: 0.8, y: 0.1 }
  ];

  const interval = setInterval(() => {
    if (remainingBursts <= 0) {
      clearInterval(interval);
      return;
    }

    const particleCount = 16 + (remainingBursts * 3);

    origins.forEach(origin => {
      confetti({
        ...defaults,
        particleCount,
        origin
      });
    });

    remainingBursts -= 1;
  }, 250);
};

const HappinessDetailModal = ({ item, isOpen, onClose, showOwnerInsights = false, canDelete = false }) => {
  const {
    userStamps,
    userFavorites,
    addStamp,
    toggleFavorite,
    deleteCustomItem,
    getItemStats,
    isItemOwnedByCurrentUser,
    getItemMemos,
    addMemo,
    updateMemo,
    deleteMemo,
    authUserNickname
  } = useHappy();

  const [progress, setProgress] = useState(0);
  const [isPressing, setIsPressing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [showMemoComposer, setShowMemoComposer] = useState(false);
  const [memoText, setMemoText] = useState('');
  const [editingMemoId, setEditingMemoId] = useState(null);
  const [editingMemoText, setEditingMemoText] = useState('');

  const requestRef = useRef();
  const startTimeRef = useRef();
  const duration = 1500;

  useEffect(() => {
    return () => {
      cancelAnimationFrame(requestRef.current);
    };
  }, []);

  if (!isOpen || !item) {
    return null;
  }

  const stampData = userStamps[item.id];
  const alreadyStampedCount = stampData ? (typeof stampData === 'number' ? stampData : stampData.count) : 0;
  const { othersCount } = getItemStats(item.id);
  const isOwner = isItemOwnedByCurrentUser(item.id);
  const itemMemos = getItemMemos(item.id);

  const todayKey = getLocalDateKey();
  const alreadyStampedToday = stampData && getLocalDateKey(stampData.lastStampedDate) === todayKey;

  const animate = time => {
    if (!startTimeRef.current) {
      startTimeRef.current = time;
    }

    const elapsed = time - startTimeRef.current;
    const newProgress = Math.min((elapsed / duration) * 100, 100);

    setProgress(newProgress);

    if (newProgress < 100) {
      requestRef.current = requestAnimationFrame(animate);
      return;
    }

    setIsPressing(false);
    addStamp(item.id);
    setShowSuccess(true);
    setShowMemoComposer(true);
    setMemoText('');
    fireCelebration();
  };

  const handlePressStart = event => {
    if (event.cancelable) {
      event.preventDefault();
    }

    if (alreadyStampedToday) {
      return;
    }

    setIsPressing(true);
    setShowSuccess(false);
    startTimeRef.current = performance.now();
    requestRef.current = requestAnimationFrame(animate);
  };

  const handlePressEnd = () => {
    if (alreadyStampedToday) {
      return;
    }

    setIsPressing(false);
    cancelAnimationFrame(requestRef.current);
    startTimeRef.current = null;

    if (progress < 100) {
      setProgress(0);
    }
  };

  const resetModalState = () => {
    setProgress(0);
    setIsPressing(false);
    setShowSuccess(false);
    setConfirmDialog(null);
    setShowMemoComposer(false);
    setMemoText('');
    setEditingMemoId(null);
    setEditingMemoText('');
    startTimeRef.current = null;
    cancelAnimationFrame(requestRef.current);
  };

  const handleClose = () => {
    resetModalState();
    onClose();
  };

  const openDeleteConfirm = () => {
    setConfirmDialog({ type: 'item' });
  };

  const closeDeleteConfirm = () => {
    setConfirmDialog(null);
  };

  const handleDeleteConfirm = () => {
    if (confirmDialog?.type === 'item') {
      const deleted = deleteCustomItem(item.id);

      if (deleted) {
        handleClose();
      }

      return;
    }

    if (confirmDialog?.type === 'memo' && confirmDialog.memoId) {
      const didDelete = deleteMemo(item.id, confirmDialog.memoId);

      if (didDelete && editingMemoId === confirmDialog.memoId) {
        handleCancelMemoEdit();
      }
    }

    closeDeleteConfirm();
  };

  const handleSaveMemo = () => {
    const savedMemo = addMemo(item.id, memoText);

    if (!savedMemo) {
      return;
    }

    setMemoText('');
    setShowMemoComposer(false);
  };

  const handleStartMemoEdit = memo => {
    setEditingMemoId(memo.id);
    setEditingMemoText(memo.content);
  };

  const handleCancelMemoEdit = () => {
    setEditingMemoId(null);
    setEditingMemoText('');
  };

  const handleSaveMemoEdit = memoId => {
    const didUpdate = updateMemo(item.id, memoId, editingMemoText);

    if (!didUpdate) {
      return;
    }

    handleCancelMemoEdit();
  };

  const handleDeleteMemo = memoId => {
    setConfirmDialog({ type: 'memo', memoId });
  };

  const openMemoComposer = () => {
    setEditingMemoId(null);
    setEditingMemoText('');
    setShowMemoComposer(true);
  };

  return (
    <div className="modal-overlay detail-modal-overlay" onClick={handleClose}>
      <div className="glass-panel detail-modal-content" onClick={event => event.stopPropagation()}>
        <div className="detail-top-actions">
          <button
            type="button"
            className="detail-icon-btn detail-memo-trigger"
            onClick={openMemoComposer}
            aria-label="메모 작성"
          >
            ✏️
          </button>
          <button className="close-btn detail-close" onClick={handleClose}>&times;</button>
        </div>

        <div className="detail-header">
          <div className="badges-container">
            <span className="category-badge">{item.category}</span>
            <button
              className={`favorite-btn ${userFavorites[item.id] ? 'active' : ''}`}
              onClick={() => toggleFavorite(item.id)}
              aria-label="즐겨찾기 토글"
            >
              {userFavorites[item.id] ? '★' : '☆'}
            </button>
          </div>
        </div>

        <h2 className="detail-title">{item.title}</h2>
        <p className="detail-desc">{item.description}</p>

        <div className="detail-stamp-section">
          <div className="stamp-count large">
            {alreadyStampedCount > 0 ? (
              <span className="active-stamps">
                {authUserNickname ? `${authUserNickname} 님이 행복을 찾은 횟수` : '내가 행복을 찾은 횟수'}: <strong>{alreadyStampedCount}</strong>번
              </span>
            ) : (
              null
            )}
          </div>

          {showOwnerInsights && item.isCustom && isOwner && (
            <div className="stamp-count large">
              <span className="active-stamps">
                {authUserNickname
                  ? `${authUserNickname} 님이 행복을 준 횟수`
                  : '내가 행복을 준 횟수'}
                : <strong>{othersCount}</strong>번
              </span>
            </div>
          )}

          {showSuccess && (
            <div className="success-message slide-down">
              🎉!!행복해져라!!🎉
            </div>
          )}

          {!alreadyStampedToday && (
            <div className="stamp-guidance">아래 버튼을 길게 눌러 행복해져 보세요!</div>
          )}

          <button
            className={`btn-primary stamp-btn-large long-press-btn ${alreadyStampedToday ? 'disabled' : ''} ${isPressing ? 'pressing' : ''}`}
            onMouseDown={handlePressStart}
            onMouseUp={handlePressEnd}
            onMouseLeave={handlePressEnd}
            onTouchStart={handlePressStart}
            onTouchEnd={handlePressEnd}
            disabled={alreadyStampedToday}
          >
            <div
              className="progress-fill"
              style={{
                width: `${alreadyStampedToday ? 100 : progress}%`,
                transition: isPressing ? 'none' : 'width 0.2s ease-out'
              }}
            />
            <span className="btn-content">
              {showSuccess
                ? '오늘은 다른 행복을 찾아보세요 😊'
                : alreadyStampedToday
                  ? '오늘은 다른 행복을 찾아보세요 😊'
                  : isPressing
                    ? `${Math.round(progress)}%`
                    : '행복'}
            </span>
          </button>

          {canDelete && item.isCustom && isOwner && (
            <button
              type="button"
              className="detail-delete-btn"
              onClick={openDeleteConfirm}
            >
              이 행복 삭제하기
            </button>
          )}

          {(showMemoComposer || itemMemos.length > 0) && (
            <div className="detail-memo-section">
              <div className="detail-memo-header">
                <h3>행복 메모</h3>
                <span>날짜와 시간이 함께 기록돼요</span>
              </div>

              {showMemoComposer && (
                <div className="detail-memo-compose">
                  <textarea
                    value={memoText}
                    onChange={event => setMemoText(event.target.value)}
                    placeholder="지금 느낀 행복을 짧게 적어보세요"
                    rows={3}
                    maxLength={200}
                  />
                  <div className="detail-memo-actions">
                    <button
                      type="button"
                      className="detail-memo-skip"
                      onClick={() => {
                        setMemoText('');
                        setShowMemoComposer(false);
                      }}
                    >
                      이번에는 넘기기
                    </button>
                    <button
                      type="button"
                      className="btn-primary detail-memo-save"
                      onClick={handleSaveMemo}
                    >
                      메모 저장하기
                    </button>
                  </div>
                </div>
              )}

              {itemMemos.length > 0 && (
                <div className="detail-memo-list">
                  {itemMemos.map(memo => (
                    <div key={memo.id} className="detail-memo-item">
                      <div className="detail-memo-meta">
                        <div className="detail-memo-time">
                          {memoDateTimeFormatter.format(new Date(memo.updatedAt))}
                        </div>
                        <div className="detail-memo-item-actions">
                          <button
                            type="button"
                            className="detail-memo-edit-btn"
                            onClick={() => handleStartMemoEdit(memo)}
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            className="detail-memo-delete-btn"
                            onClick={() => handleDeleteMemo(memo.id)}
                          >
                            삭제
                          </button>
                        </div>
                      </div>

                      {editingMemoId === memo.id ? (
                        <div className="detail-memo-edit-wrap">
                          <textarea
                            value={editingMemoText}
                            onChange={event => setEditingMemoText(event.target.value)}
                            rows={3}
                            maxLength={200}
                          />
                          <div className="detail-memo-actions">
                            <button
                              type="button"
                              className="detail-memo-skip"
                              onClick={handleCancelMemoEdit}
                            >
                              취소
                            </button>
                            <button
                              type="button"
                              className="btn-primary detail-memo-save"
                              onClick={() => handleSaveMemoEdit(memo.id)}
                            >
                              수정 저장
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p>{memo.content}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {confirmDialog && (
        <div
          className="delete-confirm-overlay"
          onClick={event => {
            event.stopPropagation();
            closeDeleteConfirm();
          }}
        >
          <div
            className="glass-panel delete-confirm-modal"
            onClick={event => event.stopPropagation()}
          >
            <h3 className="delete-confirm-title">
              {confirmDialog.type === 'item' ? '행복을 삭제할까요?' : '메모를 삭제할까요?'}
            </h3>
            <p className="delete-confirm-text">
              {confirmDialog.type === 'item'
                ? `"${item.title}"을 삭제하면 다시 되돌릴 수 없어요.`
                : '이 메모를 삭제하면 다시 되돌릴 수 없어요.'}
            </p>
            <div className="delete-confirm-actions">
              <button
                type="button"
                className="delete-confirm-cancel"
                onClick={closeDeleteConfirm}
              >
                취소
              </button>
              <button
                type="button"
                className="delete-confirm-submit"
                onClick={handleDeleteConfirm}
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HappinessDetailModal;
