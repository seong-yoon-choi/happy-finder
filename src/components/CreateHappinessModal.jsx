import React, { useState } from 'react';
import { useHappy } from '../store/HappyContext';
import './CreateHappinessModal.css';

const CreateHappinessModal = ({ isOpen, onClose }) => {
    const { addCustomItem } = useHappy();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('소확행');

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title.trim() || !description.trim()) return;

        addCustomItem(title, description, category);
        setTitle('');
        setDescription('');
        setCategory('소확행');
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="glass-panel modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>나만의 행복 만들기</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="form-group">
                        <label>소제목 (예: 붕어빵 사먹기)</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="행복의 이름을 지어주세요"
                            maxLength={20}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>상세 내용</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="어떤 행복인지 자세히 적어주세요!"
                            rows={3}
                            maxLength={100}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>카테고리</label>
                        <div className="category-pills">
                            {['소확행', '일주일행복', '한달행복'].map(cat => (
                                <button
                                    key={cat}
                                    type="button"
                                    className={`category-pill ${category === cat ? 'active' : ''}`}
                                    onClick={() => setCategory(cat)}
                                >
                                    {cat}
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
    );
};

export default CreateHappinessModal;
