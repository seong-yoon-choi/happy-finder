import React, { useState } from 'react';
import { useHappy } from '../store/HappyContext';
import './NicknameModal.css';

const NicknameModal = ({
  isOpen,
  canClose = true,
  onClose,
  title = '닉네임 설정',
  description = '프로필에 보여줄 닉네임을 입력해주세요.',
  submitLabel = '저장하기',
  initialValue = ''
}) => {
  const { isAuthBusy, updateAuthNickname } = useHappy();
  const [nickname, setNickname] = useState(initialValue);
  const [feedback, setFeedback] = useState('');

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFeedback('');

    const result = await updateAuthNickname(nickname);

    if (!result?.success) {
      setFeedback(result?.error || '닉네임을 저장하지 못했어요.');
      return;
    }

    onClose?.();
  };

  return (
    <div className="nickname-overlay">
      <div className="glass-panel nickname-modal" onClick={event => event.stopPropagation()}>
        {canClose && (
          <button type="button" className="nickname-close" onClick={onClose} aria-label="닉네임 모달 닫기">
            &times;
          </button>
        )}

        <div className="nickname-copy">
          <span className="nickname-eyebrow">PROFILE</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>

        <form className="nickname-form" onSubmit={handleSubmit}>
          <label className="nickname-label" htmlFor="nickname-input">
            닉네임
          </label>
          <input
            id="nickname-input"
            type="text"
            className="nickname-input"
            value={nickname}
            onChange={(event) => setNickname(event.target.value.slice(0, 8))}
            placeholder="닉네임을 입력해주세요"
            autoComplete="nickname"
            maxLength={8}
            disabled={isAuthBusy}
          />

          {feedback && <div className="nickname-feedback error">{feedback}</div>}

          <button type="submit" className="btn-primary nickname-submit" disabled={isAuthBusy}>
            {isAuthBusy ? '저장 중...' : submitLabel}
          </button>
        </form>
      </div>
    </div>
  );
};

export default NicknameModal;
