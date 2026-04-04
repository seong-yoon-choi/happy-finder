import React, { useState } from 'react';
import useModalBackNavigation from '../hooks/useModalBackNavigation';
import { useHappy } from '../store/HappyContext';
import './CreateHappinessModal.css';

const CATEGORY_OPTIONS = ['소확행', '기분전환', '제대로'];
const VISIBILITY_OPTIONS = [
  { value: 'private', label: '나만보기' },
  { value: 'public', label: '공개하기' }
];

const CreateHappinessModal = ({ isOpen, onClose }) => {
  const { addCustomItem, authUser } = useHappy();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);
  const [visibility, setVisibility] = useState(VISIBILITY_OPTIONS[0].value);
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory(CATEGORY_OPTIONS[0]);
    setVisibility(VISIBILITY_OPTIONS[0].value);
    setSubmitError('');
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const requestClose = useModalBackNavigation({
    isOpen,
    onClose: handleClose,
    historyKey: 'create-happiness'
  });

  const handleSubmit = async event => {
    event.preventDefault();

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!trimmedTitle || !trimmedDescription) {
      return;
    }

    setSubmitError('');
    setIsSubmitting(true);
    const result = await addCustomItem(trimmedTitle, trimmedDescription, category, visibility);
    setIsSubmitting(false);

    if (!result?.success) {
      if (result?.code === 'AUTH_REQUIRED') {
        setSubmitError('공개하기는 로그인 후 사용할 수 있어요.');
        return;
      }

      setSubmitError('행복을 저장하지 못했어요. 잠시 후 다시 시도해주세요.');
      return;
    }

    handleClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay create-modal-overlay" data-block-pull-refresh="true" onClick={() => requestClose()}>
      <div
        className="glass-panel modal-content create-modal-content"
        data-block-pull-refresh="true"
        onClick={event => event.stopPropagation()}
      >
        <div className="create-modal-top-actions">
          <button
            type="button"
            className="close-btn create-modal-close"
            onClick={() => requestClose()}
            aria-label="나만의 행복 만들기 닫기"
          >
            &times;
          </button>
        </div>

        <div className="create-modal-header">
          <div className="create-modal-badges">
            <span className="create-modal-badge">MY</span>
          </div>
          <h2 className="create-modal-title">나만의 행복 만들기</h2>
          <p className="create-modal-desc">
            자주 꺼내 보고 싶은 작은 행복을 직접 추가해보세요.
          </p>
        </div>

        <div className="create-modal-form-shell">
          <form onSubmit={handleSubmit} className="modal-form create-modal-form">
            <div className="form-group">
              <label htmlFor="custom-happiness-title">제목</label>
              <input
                id="custom-happiness-title"
                type="text"
                value={title}
                onChange={event => setTitle(event.target.value)}
                placeholder="행복의 이름을 적어주세요"
                maxLength={20}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="custom-happiness-description">상세 내용</label>
              <textarea
                id="custom-happiness-description"
                value={description}
                onChange={event => setDescription(event.target.value)}
                placeholder="어떤 행복인지 짧게 설명해주세요"
                rows={4}
                maxLength={100}
                required
              />
            </div>

            <div className="form-group">
              <label>카테고리</label>
              <div className="category-pills">
                {CATEGORY_OPTIONS.map(option => (
                  <button
                    key={option}
                    type="button"
                    className={`category-pill ${category === option ? 'active' : ''}`}
                    onClick={() => setCategory(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>공개 범위</label>
              <div className="category-pills">
                {VISIBILITY_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    className={`category-pill ${visibility === option.value ? 'active' : ''}`}
                    onClick={() => setVisibility(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="form-helper">
                {visibility === 'public'
                  ? authUser
                    ? '공개한 행복은 다른 사람들 목록에도 보여요.'
                    : '공개하기는 로그인한 상태에서만 사용할 수 있어요.'
                  : '나만 보는 행복으로 저장돼요.'}
              </p>
            </div>

            {submitError && <p className="form-error">{submitError}</p>}

            <button type="submit" className="btn-primary submit-btn" disabled={isSubmitting}>
              {isSubmitting ? '저장 중...' : '행복 추가하기'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateHappinessModal;
