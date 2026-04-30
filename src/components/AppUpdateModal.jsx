import React from 'react';
import useModalBackNavigation from '../hooks/useModalBackNavigation';
import './AppUpdateModal.css';

const AppUpdateModal = ({
  isOpen,
  isForced = false,
  title = '업데이트가 필요합니다',
  message = '더 안정적인 이용을 위해 최신 버전으로 업데이트해주세요.',
  onClose,
  onUpdate
}) => {
  const requestClose = useModalBackNavigation({
    isOpen,
    onClose,
    canClose: !isForced,
    historyKey: 'app-update'
  });

  if (!isOpen) {
    return null;
  }

  const handleOverlayClick = () => {
    if (!isForced) {
      requestClose();
    }
  };

  return (
    <div
      className="app-update-overlay"
      data-block-pull-refresh="true"
      onClick={handleOverlayClick}
    >
      <div
        className="glass-panel app-update-modal"
        data-block-pull-refresh="true"
        onClick={event => event.stopPropagation()}
      >
        <div className="app-update-icon" aria-hidden="true">↑</div>

        <div className="app-update-copy">
          <span className="app-update-eyebrow">UPDATE</span>
          <h2>{title}</h2>
          <p>{message}</p>
        </div>

        <div className={`app-update-actions ${isForced ? 'forced' : ''}`}>
          {!isForced && (
            <button
              type="button"
              className="app-update-later"
              onClick={() => requestClose()}
            >
              나중에
            </button>
          )}
          <button
            type="button"
            className="app-update-submit"
            onClick={onUpdate}
          >
            업데이트 하기
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppUpdateModal;
