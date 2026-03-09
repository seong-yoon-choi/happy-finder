import React from 'react';
import { useHappy } from '../store/HappyContext';
import './HappinessCard.css';

const HappinessCard = ({ item, onClick }) => {
    const { getItemStats, getItemMemos } = useHappy();
    const { myCount } = getItemStats(item.id);
    const memoCount = getItemMemos(item.id).length;

    return (
        <div className="glass-card happiness-card compact" onClick={() => onClick(item)}>
            <div className="card-header">
                <span className="category-badge">{item.category}</span>
            </div>
            <h3 className="card-title">{item.title}</h3>
            <p className="card-desc-short">{item.description}</p>

            {(myCount > 0 || memoCount > 0) && (
                <div className="card-stats">
                    {myCount > 0 && (
                        <div className="card-compact-stamps">
                            ❤️ {myCount}번
                        </div>
                    )}
                    {memoCount > 0 && (
                        <div className="card-compact-memos">
                            ✏️ {memoCount}개
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default HappinessCard;
