import React, { useState } from 'react';
import useModalBackNavigation from '../hooks/useModalBackNavigation';
import { HAPPINESS_TAG_GROUPS, MAX_RECORD_TAGS, normalizeVisibleTags } from '../lib/happinessTags';
import { useHappy } from '../store/HappyContext';
import './CreateHappinessModal.css';

const DEFAULT_CUSTOM_CATEGORY = '소확행';
const VISIBILITY_OPTIONS = [
  { value: 'private', label: '나만보기' },
  { value: 'public', label: '공개하기' }
];

const CreateHappinessModal = ({ isOpen, onClose }) => {
  const { addCustomItem, authUser } = useHappy();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState(VISIBILITY_OPTIONS[0].value);
  const [selectedTags, setSelectedTags] = useState([]);
  const [isTagPickerOpen, setIsTagPickerOpen] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setVisibility(VISIBILITY_OPTIONS[0].value);
    setSelectedTags([]);
    setIsTagPickerOpen(false);
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
    const result = await addCustomItem(
      trimmedTitle,
      trimmedDescription,
      DEFAULT_CUSTOM_CATEGORY,
      visibility,
      selectedTags
    );
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

  const handleTagToggle = tag => {
    setSelectedTags(prev => {
      if (prev.includes(tag)) {
        return prev.filter(selectedTag => selectedTag !== tag);
      }

      if (prev.length >= MAX_RECORD_TAGS) {
        return prev;
      }

      return normalizeVisibleTags([...prev, tag], MAX_RECORD_TAGS);
    });
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
              <div className="create-form-label-row">
                <label>태그</label>
                <span>{selectedTags.length}/{MAX_RECORD_TAGS}</span>
              </div>
              <button
                type="button"
                className={`create-tag-selector ${selectedTags.length > 0 ? 'has-tags' : ''}`}
                onClick={() => setIsTagPickerOpen(true)}
              >
                {selectedTags.length > 0 ? (
                  <span className="create-selected-tags">
                    {selectedTags.map(tag => (
                      <span key={tag} className="create-selected-tag">{tag}</span>
                    ))}
                  </span>
                ) : (
                  <span className="create-tag-placeholder">태그 선택하기</span>
                )}
              </button>
              <p className="form-helper">검색과 필터에 쓰일 태그를 최대 3개 선택할 수 있어요.</p>
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

      {isTagPickerOpen && (
        <div
          className="create-tag-picker-overlay"
          onClick={event => {
            event.stopPropagation();
            setIsTagPickerOpen(false);
          }}
        >
          <div className="create-tag-picker-modal" onClick={event => event.stopPropagation()}>
            <div className="create-tag-picker-header">
              <div>
                <h3>태그 선택</h3>
                <p>{selectedTags.length}/{MAX_RECORD_TAGS}개 선택됨</p>
              </div>
              <button type="button" className="create-tag-picker-close" onClick={() => setIsTagPickerOpen(false)}>
                완료
              </button>
            </div>

            <div className="create-tag-picker-groups">
              {HAPPINESS_TAG_GROUPS.map(group => (
                <section key={group.label} className="create-tag-picker-group">
                  <h4>{group.label}</h4>
                  <div className="create-tag-option-grid">
                    {group.tags.map(tag => {
                      const isSelected = selectedTags.includes(tag);
                      const isDisabled = !isSelected && selectedTags.length >= MAX_RECORD_TAGS;

                      return (
                        <label
                          key={tag}
                          className={`create-tag-option ${isSelected ? 'is-selected' : ''} ${isDisabled ? 'is-disabled' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isDisabled}
                            onChange={() => handleTagToggle(tag)}
                          />
                          <span>{tag}</span>
                        </label>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateHappinessModal;
