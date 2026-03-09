import React, { useState } from 'react';
import { useHappy } from '../store/HappyContext';
import './FirstLoginSetupModal.css';

const FirstLoginSetupModal = ({ isOpen, initialValues }) => {
  const { isAuthBusy, completeAuthOnboarding } = useHappy();
  const [nickname, setNickname] = useState(initialValues.nickname || '');
  const [isOver14, setIsOver14] = useState(Boolean(initialValues.isOver14));
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(Boolean(initialValues.hasAcceptedTerms));
  const [hasAcceptedPrivacy, setHasAcceptedPrivacy] = useState(Boolean(initialValues.hasAcceptedPrivacy));
  const [hasAcceptedMarketing, setHasAcceptedMarketing] = useState(Boolean(initialValues.hasAcceptedMarketing));
  const [feedback, setFeedback] = useState('');

  if (!isOpen) {
    return null;
  }

  const isAllChecked = isOver14 && hasAcceptedTerms && hasAcceptedPrivacy && hasAcceptedMarketing;

  const handleToggleAll = (checked) => {
    setIsOver14(checked);
    setHasAcceptedTerms(checked);
    setHasAcceptedPrivacy(checked);
    setHasAcceptedMarketing(checked);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFeedback('');

    const result = await completeAuthOnboarding({
      nickname,
      isOver14,
      hasAcceptedTerms,
      hasAcceptedPrivacy,
      hasAcceptedMarketing
    });

    if (!result?.success) {
      setFeedback(result?.error || '첫 설정을 저장하지 못했어요.');
    }
  };

  return (
    <div className="first-login-overlay">
      <div className="glass-panel first-login-modal">
        <div className="first-login-copy">
          <span className="first-login-eyebrow">WELCOME</span>
          <h2>첫 진입 설정</h2>
          <p>닉네임과 필수 동의를 마치면 바로 행복 찾기를 시작할 수 있어요.</p>
        </div>

        <form className="first-login-form" onSubmit={handleSubmit}>
          <label className="first-login-label" htmlFor="first-login-nickname">
            닉네임
          </label>
          <input
            id="first-login-nickname"
            type="text"
            className="first-login-input"
            value={nickname}
            onChange={(event) => setNickname(event.target.value.slice(0, 8))}
            placeholder="닉네임을 입력해주세요"
            autoComplete="nickname"
            maxLength={8}
            disabled={isAuthBusy}
          />

          <div className="first-login-agreement-box">
            <label className="first-login-check all">
              <input
                type="checkbox"
                checked={isAllChecked}
                onChange={(event) => handleToggleAll(event.target.checked)}
                disabled={isAuthBusy}
              />
              <span>전체 동의</span>
            </label>

            <label className="first-login-check required">
              <input
                type="checkbox"
                checked={isOver14}
                onChange={(event) => setIsOver14(event.target.checked)}
                disabled={isAuthBusy}
              />
              <span>필수: 만 14세 이상</span>
            </label>

            <label className="first-login-check required">
              <input
                type="checkbox"
                checked={hasAcceptedTerms}
                onChange={(event) => setHasAcceptedTerms(event.target.checked)}
                disabled={isAuthBusy}
              />
              <span>필수: 이용약관</span>
            </label>

            <label className="first-login-check required">
              <input
                type="checkbox"
                checked={hasAcceptedPrivacy}
                onChange={(event) => setHasAcceptedPrivacy(event.target.checked)}
                disabled={isAuthBusy}
              />
              <span>필수: 개인정보처리방침</span>
            </label>

            <label className="first-login-check optional">
              <input
                type="checkbox"
                checked={hasAcceptedMarketing}
                onChange={(event) => setHasAcceptedMarketing(event.target.checked)}
                disabled={isAuthBusy}
              />
              <span>선택: 마케팅 수신</span>
            </label>
          </div>

          {feedback && <div className="first-login-feedback error">{feedback}</div>}

          <button type="submit" className="btn-primary first-login-submit" disabled={isAuthBusy}>
            {isAuthBusy ? '저장 중...' : '시작하기'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default FirstLoginSetupModal;
