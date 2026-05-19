import { useState } from 'react';
import useModalBackNavigation from '../hooks/useModalBackNavigation';
import { openExternalUrl } from '../lib/externalBrowser';
import {
  buildShareTextContent,
  copyShareTextContent,
  shareTextContent
} from '../lib/share';
import './ShareOptionsModal.css';

const SHARE_OPTIONS = [
  {
    value: 'kakao',
    label: '카카오톡',
    icon: 'kakao'
  },
  {
    value: 'instagram',
    label: '인스타그램',
    icon: 'instagram'
  },
  {
    value: 'twitter',
    label: 'X / 트위터',
    icon: 'x'
  }
];

const ShareTargetIcon = ({ type }) => {
  if (type === 'kakao') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M4.5 11C4.5 7.4 7.86 4.5 12 4.5S19.5 7.4 19.5 11 16.14 17.5 12 17.5C11.35 17.5 10.73 17.43 10.14 17.29L6.95 19.2L7.55 16.2C5.7 15.02 4.5 13.16 4.5 11Z"
          fill="none"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  if (type === 'instagram') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <rect
          x="5"
          y="5"
          width="14"
          height="14"
          rx="4.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
        />
        <circle
          cx="12"
          cy="12"
          r="3.1"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
        />
        <circle cx="16.2" cy="7.8" r="1.1" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M6 5.5L18 18.5M18 5.5L6 18.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
};

const LinkIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      d="M9.25 14.75L14.75 9.25"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.9"
    />
    <path
      d="M10.45 7.1L11.55 6C13 4.55 15.35 4.55 16.8 6C18.25 7.45 18.25 9.8 16.8 11.25L15.7 12.35M13.55 16.9L12.45 18C11 19.45 8.65 19.45 7.2 18C5.75 16.55 5.75 14.2 7.2 12.75L8.3 11.65"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.9"
    />
  </svg>
);

const getShareLinkPreview = shareData => {
  const shareUrl = typeof shareData?.url === 'string' ? shareData.url.trim() : '';

  if (shareUrl) {
    return shareUrl;
  }

  const shareTitle = typeof shareData?.title === 'string' ? shareData.title.trim() : '';

  return shareTitle || 'Happy Finder';
};

const buildTwitterIntentUrl = shareData => {
  const shareText = buildShareTextContent(shareData);

  if (!shareText) {
    return '';
  }

  const url = new URL('https://twitter.com/intent/tweet');
  url.searchParams.set('text', shareText);
  return url.toString();
};

const ShareOptionsModal = ({
  isOpen,
  shareData,
  onClose,
  onResult
}) => {
  const [activeTarget, setActiveTarget] = useState('');
  const requestClose = useModalBackNavigation({
    isOpen,
    onClose,
    historyKey: 'share-options'
  });

  if (!isOpen) {
    return null;
  }

  const shareLinkPreview = getShareLinkPreview(shareData);
  const isBusy = Boolean(activeTarget);

  const handleShareTarget = async target => {
    if (activeTarget) {
      return;
    }

    setActiveTarget(target);
    let result;

    if (target === 'copy') {
      result = await copyShareTextContent(shareData);
    } else if (target === 'twitter') {
      const twitterUrl = buildTwitterIntentUrl(shareData);
      const didOpen = twitterUrl ? await openExternalUrl(twitterUrl) : false;
      result = didOpen
        ? { success: true, method: 'twitter' }
        : { success: false, code: 'FAILED' };
    } else {
      result = await shareTextContent(shareData);
    }

    setActiveTarget('');
    onResult?.({
      ...result,
      target
    });

    requestClose();
  };

  return (
    <div
      className="share-options-overlay"
      data-block-pull-refresh="true"
      onClick={() => requestClose()}
    >
      <div
        className="glass-panel share-options-modal"
        data-block-pull-refresh="true"
        onClick={event => event.stopPropagation()}
      >
        <div className="share-options-header">
          <button
            type="button"
            className="share-options-close"
            onClick={() => requestClose()}
            aria-label="공유 선택 닫기"
          >
            &times;
          </button>
        </div>

        <div className="share-options-list" aria-label="공유 앱 선택">
          {SHARE_OPTIONS.map(option => (
            <button
              key={option.value}
              type="button"
              className={`share-option-btn ${option.icon}`}
              onClick={() => handleShareTarget(option.value)}
              disabled={isBusy}
              aria-label={option.label}
            >
              <span className="share-option-icon">
                <ShareTargetIcon type={option.icon} />
              </span>
            </button>
          ))}
        </div>

        <div className="share-link-row">
          <span className="share-link-icon">
            <LinkIcon />
          </span>
          <span className="share-link-text">{shareLinkPreview}</span>
          <button
            type="button"
            className="share-link-copy-btn"
            onClick={() => handleShareTarget('copy')}
            disabled={isBusy}
          >
            (복사)
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareOptionsModal;
