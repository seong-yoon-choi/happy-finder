import React from 'react';
import useModalBackNavigation from '../hooks/useModalBackNavigation';
import './CelebrationModal.css';

const CelebrationModal = ({ celebration, onClose }) => {
    const requestClose = useModalBackNavigation({
        isOpen: Boolean(celebration),
        onClose,
        historyKey: 'celebration'
    });

    if (!celebration) {
        return null;
    }

    return (
        <div className="celebration-overlay" onClick={() => requestClose()}>
            <div className="glass-panel celebration-modal" onClick={e => e.stopPropagation()}>
                <div className="celebration-badge">{celebration.icon}</div>
                <h2 className="celebration-title">{celebration.title}</h2>
                <p className="celebration-text">{celebration.message}</p>
                <button
                    type="button"
                    className="btn-primary celebration-button"
                    onClick={() => requestClose()}
                >
                    행복 계속 찾기
                </button>
            </div>
        </div>
    );
};

export default CelebrationModal;
