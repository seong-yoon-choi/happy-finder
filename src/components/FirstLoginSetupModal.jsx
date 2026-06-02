import React, { useEffect, useState } from 'react';
import useModalBackNavigation from '../hooks/useModalBackNavigation';
import { useHappy } from '../store/HappyContext';
import './FirstLoginSetupModal.css';

const FirstLoginSetupModal = ({
  isOpen,
  canClose = false,
  onClose,
  onComplete,
  initialValues,
  lockRequiredAgreements = false
}) => {
  const { isAuthBusy, completeAuthOnboarding } = useHappy();
  const [isOver14, setIsOver14] = useState(Boolean(initialValues.isOver14));
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(Boolean(initialValues.hasAcceptedTerms));
  const [hasAcceptedPrivacy, setHasAcceptedPrivacy] = useState(Boolean(initialValues.hasAcceptedPrivacy));
  const [hasAcceptedMarketing, setHasAcceptedMarketing] = useState(Boolean(initialValues.hasAcceptedMarketing));
  const [feedback, setFeedback] = useState('');
  const isSubmitEnabled = isOver14 && hasAcceptedTerms && hasAcceptedPrivacy;
  const areRequiredAgreementsReadOnly = lockRequiredAgreements;
  const requestClose = useModalBackNavigation({
    isOpen,
    onClose,
    canClose,
    historyKey: 'first-login-setup'
  });

  useEffect(() => {
    const resetModalState = () => {
      if (!isOpen) {
        return;
      }

      setIsOver14(Boolean(initialValues.isOver14));
      setHasAcceptedTerms(Boolean(initialValues.hasAcceptedTerms));
      setHasAcceptedPrivacy(Boolean(initialValues.hasAcceptedPrivacy));
      setHasAcceptedMarketing(Boolean(initialValues.hasAcceptedMarketing));
      setFeedback('');
    };

    resetModalState();
  }, [
    initialValues.hasAcceptedMarketing,
    initialValues.hasAcceptedPrivacy,
    initialValues.hasAcceptedTerms,
    initialValues.isOver14,
    isOpen
  ]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFeedback('');

    const result = await completeAuthOnboarding({
      isOver14,
      hasAcceptedTerms,
      hasAcceptedPrivacy,
      hasAcceptedMarketing
    });

    if (!result?.success) {
      setFeedback(result?.error || '첫 설정을 저장하지 못했어요.');
      return;
    }

    onComplete?.();
  };

  return (
    <div className="first-login-overlay" onClick={canClose ? () => requestClose() : undefined}>
      <div className="glass-panel first-login-modal" onClick={event => event.stopPropagation()}>
        {canClose && (
          <button type="button" className="first-login-close" onClick={() => requestClose()} aria-label="동의 사항 닫기">
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
                checked={isOver14}
                onChange={event => setIsOver14(event.target.checked)}
                disabled={isAuthBusy || areRequiredAgreementsReadOnly}
                aria-label="만 14세 이상 동의"
              />
              <span>[필수] 만 14세 이상입니다.</span>
            </div>

            <div className="first-login-check required">
              <input
                type="checkbox"
                checked={hasAcceptedTerms}
                onChange={event => setHasAcceptedTerms(event.target.checked)}
                disabled={isAuthBusy || areRequiredAgreementsReadOnly}
                aria-label="이용약관 동의"
              />
              <span>
                [필수]
                {' '}
                <a href="/terms/index.html" className="first-login-link">
                  이용약관
                </a>
                에 동의합니다.
              </span>
            </div>

            <div className="first-login-check required">
              <input
                type="checkbox"
                checked={hasAcceptedPrivacy}
                onChange={event => setHasAcceptedPrivacy(event.target.checked)}
                disabled={isAuthBusy || areRequiredAgreementsReadOnly}
                aria-label="개인정보처리방침 동의"
              />
              <span>
                [필수]
                {' '}
                <a href="/privacy/index.html" className="first-login-link">
                  개인정보 수집 및 이용
                </a>
                에 동의합니다.
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
                [선택]
                {' '}
                <a href="/marketing/index.html" className="first-login-link">
                  마케팅 정보 수신
                </a>
                에 동의합니다.
              </span>
            </div>
          </div>

          {feedback && <div className="first-login-feedback error">{feedback}</div>}

          <button
            type="submit"
            className={`btn-primary first-login-submit${isAuthBusy ? ' is-busy' : ''}`}
            disabled={isAuthBusy || !isSubmitEnabled}
          >
            {isAuthBusy ? '저장 중...' : '확인하기'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default FirstLoginSetupModal;
