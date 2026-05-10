import React, { memo } from 'react';
import './NavBar.css';

const ProfileIcon = () => (
    <svg className="nav-profile-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
        <path
            d="M12 12.5C14.3472 12.5 16.25 10.5972 16.25 8.25C16.25 5.90279 14.3472 4 12 4C9.65279 4 7.75 5.90279 7.75 8.25C7.75 10.5972 9.65279 12.5 12 12.5Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M5.25 20C6.16243 16.9635 8.73856 15.25 12 15.25C15.2614 15.25 17.8376 16.9635 18.75 20"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

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
                className={`nav-item ${currentView === 'profile' ? 'active' : ''}`}
                onClick={() => onViewChange('profile')}
            >
                <div className="nav-icon nav-icon-profile" aria-hidden="true">
                    <ProfileIcon />
                </div>
                <span>프로필</span>
            </button>
        </nav>
    );
};

export default memo(NavBar);
