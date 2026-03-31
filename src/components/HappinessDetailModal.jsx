import React, { startTransition, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  createHappinessItemReport,
  hasExistingHappinessItemReport,
  OTHER_REPORT_REASON_CODE,
  REPORT_REASON_OPTIONS
} from '../lib/happinessItemReports';
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

const CONFETTI_BURSTS = [
  {
    delay: 0,
    particleCount: 18,
    spread: 56,
    startVelocity: 30,
    ticks: 42,
    scalar: 0.92,
    origin: { x: 0.2, y: 0.18 }
  },
  {
    delay: 0,
    particleCount: 18,
    spread: 56,
    startVelocity: 30,
    ticks: 42,
    scalar: 0.92,
    origin: { x: 0.8, y: 0.18 }
  },
  {
    delay: 120,
    particleCount: 24,
    spread: 78,
    startVelocity: 24,
    ticks: 46,
    scalar: 0.86,
    origin: { x: 0.5, y: 0.14 }
  }
];

const clearCelebrationTimeouts = timeoutIdsRef => {
  timeoutIdsRef.current.forEach(timeoutId => {
    window.clearTimeout(timeoutId);
  });
  timeoutIdsRef.current = [];
};

const fireCelebration = timeoutIdsRef => {
  if (typeof window === 'undefined') {
    return;
  }

  clearCelebrationTimeouts(timeoutIdsRef);

  CONFETTI_BURSTS.forEach(({ delay, ...burstOptions }) => {
    const timeoutId = window.setTimeout(() => {
      confetti({
        ...burstOptions,
        gravity: 1.04,
        decay: 0.93,
        drift: 0,
        zIndex: 3400,
        disableForReducedMotion: true
      });
    }, delay);

    timeoutIdsRef.current.push(timeoutId);
  });
};

const ReportIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path
      d="M12 5.75V12.75"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
    />
    <path
      d="M12 18C12.6904 18 13.25 17.4404 13.25 16.75C13.25 16.0596 12.6904 15.5 12 15.5C11.3096 15.5 10.75 16.0596 10.75 16.75C10.75 17.4404 11.3096 18 12 18Z"
      fill="currentColor"
    />
  </svg>
);

const HappinessDetailModal = ({ item, isOpen, onClose, canDelete = false }) => {
  const {
    items,
    userStamps,
    userFavorites,
    addStamp,
    toggleFavorite,
    deleteCustomItem,
    updateCustomItemVisibility,
    isItemOwnedByCurrentUser,
    getItemMemos,
    addMemo,
    updateMemo,
    deleteMemo,
    authUser,
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
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);
  const [visibilityError, setVisibilityError] = useState('');
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [selectedReportReasons, setSelectedReportReasons] = useState([]);
  const [reportOtherReason, setReportOtherReason] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportFeedback, setReportFeedback] = useState({
    type: 'idle',
    message: ''
  });
  const [reportedItemIdForViewer, setReportedItemIdForViewer] = useState('');

  const requestRef = useRef();
  const startTimeRef = useRef();
  const celebrationTimeoutsRef = useRef([]);
  const completionFrameRef = useRef(null);
  const memoRevealTimeoutRef = useRef(null);
  const duration = 1500;

  useEffect(() => {
    return () => {
      cancelAnimationFrame(requestRef.current);
      if (completionFrameRef.current) {
        cancelAnimationFrame(completionFrameRef.current);
      }
      if (memoRevealTimeoutRef.current) {
        window.clearTimeout(memoRevealTimeoutRef.current);
      }
      clearCelebrationTimeouts(celebrationTimeoutsRef);
      confetti.reset?.();
    };
  }, []);

  const currentItem = item ? items.find(existingItem => existingItem.id === item.id) || item : null;
  const stampData = currentItem ? userStamps[currentItem.id] : null;
  const alreadyStampedCount = stampData ? (typeof stampData === 'number' ? stampData : stampData.count) : 0;
  const isOwner = currentItem ? isItemOwnedByCurrentUser(currentItem.id) : false;
  const itemMemos = currentItem ? getItemMemos(currentItem.id) : [];
  const canReportItem = Boolean(currentItem?.isCustom && currentItem.isPublic && !isOwner);
  const reportNoticeMessage = '신고한 계정에서는 그 계정에서만 신고한 리스트 입니다.';
  const shouldShowReportedNotice = Boolean(
    currentItem?.id
    && authUser?.id
    && canReportItem
    && reportedItemIdForViewer === currentItem.id
  );

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
    fireCelebration(celebrationTimeoutsRef);

    if (completionFrameRef.current) {
      cancelAnimationFrame(completionFrameRef.current);
    }

    completionFrameRef.current = requestAnimationFrame(() => {
      startTransition(() => {
        addStamp(item.id);
        setShowSuccess(true);
        setMemoText('');
      });

      memoRevealTimeoutRef.current = window.setTimeout(() => {
        startTransition(() => {
          setShowMemoComposer(true);
        });
      }, 140);

      completionFrameRef.current = null;
    });
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
    setIsUpdatingVisibility(false);
    setVisibilityError('');
    setShowMemoComposer(false);
    setMemoText('');
    setEditingMemoId(null);
    setEditingMemoText('');
    setIsReportDialogOpen(false);
    setSelectedReportReasons([]);
    setReportOtherReason('');
    setIsSubmittingReport(false);
    setReportFeedback({
      type: 'idle',
      message: ''
    });
    setReportedItemIdForViewer('');
    startTimeRef.current = null;
    cancelAnimationFrame(requestRef.current);
    if (completionFrameRef.current) {
      cancelAnimationFrame(completionFrameRef.current);
      completionFrameRef.current = null;
    }
    if (memoRevealTimeoutRef.current) {
      window.clearTimeout(memoRevealTimeoutRef.current);
      memoRevealTimeoutRef.current = null;
    }
    clearCelebrationTimeouts(celebrationTimeoutsRef);
    confetti.reset?.();
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

  const handleDeleteConfirm = async () => {
    if (confirmDialog?.type === 'item') {
      const deleted = await deleteCustomItem(item.id);

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

  const handleVisibilityChange = async nextVisibility => {
    if (isUpdatingVisibility) {
      return;
    }

    const currentVisibility = currentItem.isPublic ? 'public' : 'private';

    if (currentVisibility === nextVisibility) {
      return;
    }

    setVisibilityError('');
    setIsUpdatingVisibility(true);

    const result = await updateCustomItemVisibility(currentItem.id, nextVisibility);

    setIsUpdatingVisibility(false);

    if (result?.success) {
      return;
    }

    if (result?.code === 'AUTH_REQUIRED') {
      setVisibilityError('공개하기는 로그인 후 사용할 수 있어요.');
      return;
    }

    setVisibilityError('공개 범위를 변경하지 못했어요. 잠시 후 다시 시도해주세요.');
  };

  const openReportDialog = () => {
    setSelectedReportReasons([]);
    setReportOtherReason('');
    setIsSubmittingReport(false);
    setReportFeedback({
      type: 'idle',
      message: ''
    });
    setIsReportDialogOpen(true);
  };

  const closeReportDialog = () => {
    if (isSubmittingReport) {
      return;
    }

    setIsReportDialogOpen(false);
    setSelectedReportReasons([]);
    setReportOtherReason('');
    setReportFeedback({
      type: 'idle',
      message: ''
    });
  };

  const handleToggleReportReason = reasonCode => {
    setReportFeedback({
      type: 'idle',
      message: ''
    });

    setSelectedReportReasons(prevReasons => {
      const hasReason = prevReasons.includes(reasonCode);
      const nextReasons = hasReason
        ? prevReasons.filter(code => code !== reasonCode)
        : [...prevReasons, reasonCode];

      if (hasReason && reasonCode === OTHER_REPORT_REASON_CODE) {
        setReportOtherReason('');
      }

      return nextReasons;
    });
  };

  const handleSubmitReport = async () => {
    if (selectedReportReasons.length === 0) {
      setReportFeedback({
        type: 'error',
        message: '신고 사유를 하나 이상 선택해주세요.'
      });
      return;
    }

    if (selectedReportReasons.includes(OTHER_REPORT_REASON_CODE) && !reportOtherReason.trim()) {
      setReportFeedback({
        type: 'error',
        message: '기타 사유를 입력해주세요.'
      });
      return;
    }

    setIsSubmittingReport(true);
    setReportFeedback({
      type: 'idle',
      message: ''
    });

    const result = await createHappinessItemReport({
      item: currentItem,
      reporterUserId: authUser?.id || null,
      reasonCodes: selectedReportReasons,
      otherReason: reportOtherReason
    });

    setIsSubmittingReport(false);

    if (!result?.success) {
      setReportFeedback({
        type: 'error',
        message: '신고를 접수하지 못했어요. 잠시 후 다시 시도해주세요.'
      });
      return;
    }

    setIsReportDialogOpen(false);
    setSelectedReportReasons([]);
    setReportOtherReason('');
    setReportedItemIdForViewer(currentItem.id);
    setReportFeedback({
      type: 'success',
      message: '신고가 접수되었어요. 검토 후 조치할게요.'
    });
  };

  useEffect(() => {
    if (!isOpen || !currentItem?.id || !canReportItem || !authUser?.id) {
      return;
    }

    let isMounted = true;

    const loadExistingReport = async () => {
      const result = await hasExistingHappinessItemReport({
        itemId: currentItem?.id,
        reporterUserId: authUser.id
      });

      if (!isMounted) {
        return;
      }

      setReportedItemIdForViewer(result?.success && result.hasReported ? currentItem.id : '');
    };

    void loadExistingReport();

    return () => {
      isMounted = false;
    };
  }, [authUser?.id, canReportItem, currentItem?.id, isOpen]);

  if (!isOpen || !currentItem) {
    return null;
  }

  return (
    <div className="modal-overlay detail-modal-overlay" data-block-pull-refresh="true" onClick={handleClose}>
      <div
        className="glass-panel detail-modal-content"
        data-block-pull-refresh="true"
        onClick={event => event.stopPropagation()}
      >
        <div className="detail-top-actions">
          {canReportItem && (
            <button
              type="button"
              className="detail-icon-btn detail-report-trigger"
              onClick={openReportDialog}
              aria-label="행복 항목 신고"
            >
              <ReportIcon />
            </button>
          )}
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
            <span className="category-badge">{currentItem.category}</span>
            {currentItem.isCustom && isOwner && <span className="custom-badge">MY</span>}
            {currentItem.isCustom && currentItem.isPublic && <span className="public-badge">공개</span>}
            <button
              className={`favorite-btn ${userFavorites[currentItem.id] ? 'active' : ''}`}
              onClick={() => toggleFavorite(currentItem.id)}
              aria-label="즐겨찾기 토글"
            >
              {userFavorites[currentItem.id] ? '★' : '☆'}
            </button>
          </div>
        </div>

        <h2 className="detail-title">{currentItem.title}</h2>
        <p className="detail-desc">{currentItem.description}</p>

        {reportFeedback.message && (
          <div className={`detail-inline-feedback ${reportFeedback.type === 'error' ? 'error' : 'success'}`}>
            {reportFeedback.message}
          </div>
        )}

        {shouldShowReportedNotice && (
          <div className="detail-inline-feedback report-notice">
            {reportNoticeMessage}
          </div>
        )}

        {canDelete && currentItem.isCustom && isOwner && (
          <div className="detail-visibility-section">
            <div className="detail-visibility-copy">
              <strong>공개 범위</strong>
              <span>{currentItem.isPublic ? '다른 사람들에게 공개되고 있어요.' : '지금은 나만 볼 수 있어요.'}</span>
            </div>

            <div className="detail-visibility-toggle">
              <button
                type="button"
                className={`detail-visibility-option ${!currentItem.isPublic ? 'active' : ''}`}
                onClick={() => handleVisibilityChange('private')}
                disabled={isUpdatingVisibility}
              >
                나만보기
              </button>
              <button
                type="button"
                className={`detail-visibility-option ${currentItem.isPublic ? 'active' : ''}`}
                onClick={() => handleVisibilityChange('public')}
                disabled={isUpdatingVisibility}
              >
                공개하기
              </button>
            </div>

            {visibilityError && <p className="detail-visibility-error">{visibilityError}</p>}
          </div>
        )}

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

          {canDelete && currentItem.isCustom && isOwner && (
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
                ? `"${currentItem.title}"을 삭제하면 다시 되돌릴 수 없어요.`
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

      {isReportDialogOpen && (
        <div
          className="report-dialog-overlay"
          onClick={event => {
            event.stopPropagation();
            closeReportDialog();
          }}
        >
          <div
            className="glass-panel report-dialog-modal"
            onClick={event => event.stopPropagation()}
          >
            <div className="report-dialog-copy">
              <span className="report-dialog-eyebrow">REPORT</span>
              <h3>이 행복 항목을 신고할까요?</h3>
              <p>검토에 도움이 되도록 신고 사유를 선택해주세요.</p>
            </div>

            <div className="report-reason-list">
              {REPORT_REASON_OPTIONS.map(option => {
                const isChecked = selectedReportReasons.includes(option.code);

                return (
                  <label key={option.code} className={`report-reason-option ${isChecked ? 'checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleReportReason(option.code)}
                    />
                    <span>{option.label}</span>
                  </label>
                );
              })}
            </div>

            {selectedReportReasons.includes(OTHER_REPORT_REASON_CODE) && (
              <label className="report-other-field">
                <span>기타 신고 사유</span>
                <textarea
                  value={reportOtherReason}
                  onChange={event => setReportOtherReason(event.target.value)}
                  placeholder="신고 사유를 자세히 입력해주세요."
                  rows={4}
                  maxLength={500}
                />
              </label>
            )}

            {reportFeedback.type === 'error' && (
              <p className="report-dialog-feedback error">{reportFeedback.message}</p>
            )}

            <div className="report-dialog-actions">
              <button
                type="button"
                className="report-dialog-cancel"
                onClick={closeReportDialog}
                disabled={isSubmittingReport}
              >
                취소
              </button>
              <button
                type="button"
                className="report-dialog-submit"
                onClick={handleSubmitReport}
                disabled={isSubmittingReport}
              >
                {isSubmittingReport ? '신고 중...' : '신고하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HappinessDetailModal;
