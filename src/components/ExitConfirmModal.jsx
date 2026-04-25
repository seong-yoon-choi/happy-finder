import React from 'react';
import useModalBackNavigation from '../hooks/useModalBackNavigation';
import './ExitConfirmModal.css';

const EYEBROW_LABEL = 'APP';
const TITLE = '\uC571\uC744 \uC885\uB8CC\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?';
const DESCRIPTION = '\uC5B8\uC81C\uB4E0 \uB2E4\uC2DC \uB3CC\uC544\uC640 \uD589\uBCF5\uC744 \uC774\uC5B4\uAC08 \uC218 \uC788\uC5B4\uC694.';
const CANCEL_LABEL = '\uCDE8\uC18C';
const CONFIRM_LABEL = '\uC885\uB8CC';

const ExitConfirmModal = ({ isOpen, onClose, onConfirm }) => {
  const requestClose = useModalBackNavigation({
    isOpen,
    onClose,
    historyKey: 'app-exit-confirm'
  });

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="exit-confirm-overlay"
      data-block-pull-refresh="true"
      onClick={() => requestClose()}
    >
      <div
        className="glass-panel exit-confirm-modal"
        data-block-pull-refresh="true"
        onClick={event => event.stopPropagation()}
      >
        <div className="exit-confirm-copy">
          <span className="exit-confirm-eyebrow">{EYEBROW_LABEL}</span>
          <h2>{TITLE}</h2>
          <p>{DESCRIPTION}</p>
        </div>

        <div className="exit-confirm-actions">
          <button
            type="button"
            className="exit-confirm-cancel"
            onClick={() => requestClose()}
          >
            {CANCEL_LABEL}
          </button>
          <button
            type="button"
            className="exit-confirm-submit"
            onClick={onConfirm}
          >
            {CONFIRM_LABEL}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExitConfirmModal;
