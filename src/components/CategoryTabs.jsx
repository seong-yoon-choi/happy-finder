import React, { memo, useRef } from 'react';
import './CategoryTabs.css';

const defaultCategories = ['랜덤행복', '소확행', '기분전환', '제대로'];

const CategoryTabs = ({ selected, onSelect, categories = defaultCategories }) => {
    const containerRef = useRef(null);

    const onWheel = (e) => {
        if (containerRef.current) {
            containerRef.current.scrollLeft += e.deltaY;
        }
    };

    return (
        <div
            className="category-scroll-container scroll-container"
            ref={containerRef}
            onWheel={onWheel}
        >
            <div className="category-tabs">
                {categories.map(cat => (
                    <button
                        key={cat}
                        className={`tab-btn ${selected === cat ? 'active' : ''}`}
                        onClick={() => onSelect(cat)}
                    >
                        {cat}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default memo(CategoryTabs);
