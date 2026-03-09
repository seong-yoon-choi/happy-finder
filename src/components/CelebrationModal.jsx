import React from 'react';
import './CelebrationModal.css';

const CelebrationModal = ({ celebration, onClose }) => {
    if (!celebration) {
        return null;
    }

    return (
        <div className="celebration-overlay" onClick={onClose}>
            <div className="glass-panel celebration-modal" onClick={e => e.stopPropagation()}>
                <div className="celebration-badge">{celebration.icon}</div>
                <h2 className="celebration-title">{celebration.title}</h2>
                <p className="celebration-text">{celebration.message}</p>
                <button
                    type="button"
                    className="btn-primary celebration-button"
                    onClick={onClose}
                >
                    행복 계속 찾기
                </button>
            </div>
        </div>
    );
};

export default CelebrationModal;
