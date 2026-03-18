import React, { useState } from 'react';
import { useHappy } from '../store/HappyContext';
import './CreateHappinessModal.css';

const CATEGORY_OPTIONS = ['소확행', '일주일행복', '한달행복'];

const CreateHappinessModal = ({ isOpen, onClose }) => {
  const { addCustomItem } = useHappy();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory(CATEGORY_OPTIONS[0]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = event => {
    event.preventDefault();

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!trimmedTitle || !trimmedDescription) {
      return;
    }

    addCustomItem(trimmedTitle, trimmedDescription, category);
    handleClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay create-modal-overlay" onClick={handleClose}>
      <div className="glass-panel modal-content create-modal-content" onClick={event => event.stopPropagation()}>
        <div className="create-modal-top-actions">
          <button
            type="button"
            className="close-btn create-modal-close"
            onClick={handleClose}
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

            <button type="submit" className="btn-primary submit-btn">
              행복 추가하기
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateHappinessModal;
