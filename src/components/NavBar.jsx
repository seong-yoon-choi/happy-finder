import React, { memo } from 'react';
import './NavBar.css';

const HomeIcon = () => (
    <svg className="nav-home-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
        <path
            d="M4.75 11.25L12 5.25L19.25 11.25"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M6.75 10.75V18.25C6.75 18.8023 7.19772 19.25 7.75 19.25H16.25C16.8023 19.25 17.25 18.8023 17.25 18.25V10.75"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

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

const RecordIcon = () => (
    <svg className="nav-record-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
        <path
            d="M6.75 4.75H17.25C18.2165 4.75 19 5.5335 19 6.5V17.5C19 18.4665 18.2165 19.25 17.25 19.25H6.75C5.7835 19.25 5 18.4665 5 17.5V6.5C5 5.5335 5.7835 4.75 6.75 4.75Z"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinejoin="round"
        />
        <path d="M8.5 9H15.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        <path d="M8.5 13H14" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
);

const NavBar = ({ currentView, onViewChange }) => {
    return (
        <nav className="glass-panel navbar">
            <button
                className={`nav-item ${currentView === 'home' ? 'active' : ''}`}
                onClick={() => onViewChange('home')}
            >
                <div className="nav-icon nav-icon-home" aria-hidden="true">
                    <HomeIcon />
                </div>
                <span>홈</span>
            </button>

            <button
                className={`nav-item ${currentView === 'records' ? 'active' : ''}`}
                onClick={() => onViewChange('records')}
            >
                <div className="nav-icon nav-icon-record" aria-hidden="true">
                    <RecordIcon />
                </div>
                <span>기록</span>
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
