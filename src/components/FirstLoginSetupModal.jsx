import React, { useEffect, useState } from 'react';
import { useHappy } from '../store/HappyContext';
import './FirstLoginSetupModal.css';

const FirstLoginSetupModal = ({
  isOpen,
  canClose = false,
  onClose,
  onComplete,
  initialValues
}) => {
  const { isAuthBusy, completeAuthOnboarding } = useHappy();
  const [hasAcceptedMarketing, setHasAcceptedMarketing] = useState(Boolean(initialValues.hasAcceptedMarketing));
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    const resetModalState = () => {
      if (!isOpen) {
        return;
      }

      setHasAcceptedMarketing(Boolean(initialValues.hasAcceptedMarketing));
      setFeedback('');
    };

    resetModalState();
  }, [initialValues.hasAcceptedMarketing, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFeedback('');

    const result = await completeAuthOnboarding({
      isOver14: true,
      hasAcceptedTerms: true,
      hasAcceptedPrivacy: true,
      hasAcceptedMarketing
    });

    if (!result?.success) {
      setFeedback(result?.error || '첫 설정을 저장하지 못했어요.');
      return;
    }

    onComplete?.();
  };

  return (
    <div className="first-login-overlay" onClick={canClose ? onClose : undefined}>
      <div className="glass-panel first-login-modal" onClick={event => event.stopPropagation()}>
        {canClose && (
          <button type="button" className="first-login-close" onClick={onClose} aria-label="동의 사항 닫기">
            &times;
          </button>
        )}

        <div className="first-login-copy">
          <span className="first-login-eyebrow">HAPPY FINDER</span>
          <h2>동의 사항</h2>
        </div>

        <form className="first-login-form" onSubmit={handleSubmit}>
          <div className="first-login-agreement-box">
            <div className="first-login-check required">
              <input
                type="checkbox"
                checked
                disabled
                aria-label="만 14세 이상 동의"
              />
              <span>필수: 만 14세 이상</span>
            </div>

            <div className="first-login-check required">
              <input
                type="checkbox"
                checked
                disabled
                aria-label="이용약관 동의"
              />
              <span>
                필수:
                {' '}
                <a href="/terms/index.html" className="first-login-link">
                  이용약관
                </a>
              </span>
            </div>

            <div className="first-login-check required">
              <input
                type="checkbox"
                checked
                disabled
                aria-label="개인정보처리방침 동의"
              />
              <span>
                필수:
                {' '}
                <a href="/privacy/index.html" className="first-login-link">
                  개인정보처리방침
                </a>
              </span>
            </div>

            <div className="first-login-check optional">
              <input
                type="checkbox"
                checked={hasAcceptedMarketing}
                onChange={(event) => setHasAcceptedMarketing(event.target.checked)}
                disabled={isAuthBusy}
                aria-label="마케팅 수신 동의"
              />
              <span>
                선택:
                {' '}
                <a href="/marketing/index.html" className="first-login-link">
                  마케팅 수신
                </a>
              </span>
            </div>
          </div>

          {feedback && <div className="first-login-feedback error">{feedback}</div>}

          <button type="submit" className="btn-primary first-login-submit" disabled={isAuthBusy}>
            {isAuthBusy ? '저장 중...' : '확인하기'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default FirstLoginSetupModal;
