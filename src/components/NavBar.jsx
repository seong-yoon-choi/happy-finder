import React, { memo } from 'react';
import './NavBar.css';

const NavBar = ({ currentView, onViewChange }) => {
    return (
        <nav className="glass-panel navbar">
            <button
                className={`nav-item ${currentView === 'home' ? 'active' : ''}`}
                onClick={() => onViewChange('home')}
            >
                <div className="nav-icon" aria-hidden="true">🏠</div>
                <span>홈</span>
            </button>

            <button
                className={`nav-item ${currentView === 'garden' ? 'active' : ''}`}
                onClick={() => onViewChange('garden')}
            >
                <div className="nav-icon" aria-hidden="true">✿</div>
                <span>정원</span>
            </button>

            <button
                className={`nav-item ${currentView === 'profile' ? 'active' : ''}`}
                onClick={() => onViewChange('profile')}
            >
                <div className="nav-icon" aria-hidden="true">👤</div>
                <span>프로필</span>
            </button>
        </nav>
    );
};

export default memo(NavBar);
