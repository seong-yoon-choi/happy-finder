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
    description: '기기 공유창에서 카카오톡을 선택해요.',
    icon: 'talk'
  },
  {
    value: 'instagram',
    label: '인스타그램',
    description: '기기 공유창에서 인스타그램을 선택해요.',
    icon: 'smile'
  },
  {
    value: 'twitter',
    label: 'X / 트위터',
    description: '작성창을 열어 바로 공유해요.',
    icon: 'x'
  },
  {
    value: 'copy',
    label: '링크 복사',
    description: '공유할 내용을 클립보드에 복사해요.',
    icon: 'copy'
  }
];

const ShareTargetIcon = ({ type }) => {
  if (type === 'talk') {
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

  if (type === 'x') {
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
  }

  if (type === 'copy') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M8.5 8.25V6.75C8.5 5.65 9.4 4.75 10.5 4.75H17.25C18.35 4.75 19.25 5.65 19.25 6.75V13.5C19.25 14.6 18.35 15.5 17.25 15.5H15.75M6.75 8.5H13.5C14.6 8.5 15.5 9.4 15.5 10.5V17.25C15.5 18.35 14.6 19.25 13.5 19.25H6.75C5.65 19.25 4.75 18.35 4.75 17.25V10.5C4.75 9.4 5.65 8.5 6.75 8.5Z"
          fill="none"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M8.25 10.2C8.65 9.75 9.35 9.75 9.75 10.2M14.25 10.2C14.65 9.75 15.35 9.75 15.75 10.2M8.8 13.55C10.2 15.45 13.8 15.45 15.2 13.55"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <circle
        cx="12"
        cy="12"
        r="8.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
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
  title = '공유하기',
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
          <div>
            <span>SHARE</span>
            <h3>{title}</h3>
          </div>
          <button
            type="button"
            className="share-options-close"
            onClick={() => requestClose()}
            aria-label="공유 선택 닫기"
          >
            &times;
          </button>
        </div>

        <div className="share-options-list">
          {SHARE_OPTIONS.map(option => (
            <button
              key={option.value}
              type="button"
              className="share-option-btn"
              onClick={() => handleShareTarget(option.value)}
              disabled={Boolean(activeTarget)}
            >
              <span className="share-option-icon">
                <ShareTargetIcon type={option.icon} />
              </span>
              <span className="share-option-copy">
                <strong>{option.label}</strong>
                <small>
                  {activeTarget === option.value ? '준비 중...' : option.description}
                </small>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ShareOptionsModal;
