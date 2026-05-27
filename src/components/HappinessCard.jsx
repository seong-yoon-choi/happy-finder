import React, { memo, useEffect, useState } from 'react';
import { getMemoImageSrc } from '../lib/memoImages';
import { supabase } from '../lib/supabase';
import { useHappy } from '../store/HappyContext';
import './HappinessCard.css';

const NoteIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      d="M7.25 4.75H14.4L18.75 9.1V18.75C18.75 19.58 18.08 20.25 17.25 20.25H7.25C6.42 20.25 5.75 19.58 5.75 18.75V6.25C5.75 5.42 6.42 4.75 7.25 4.75Z"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
    <path
      d="M14.25 4.9V9.25H18.6M9 13H15M9 16.25H14"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
  </svg>
);

const HappinessCard = ({ item, onClick }) => {
  const { getItemMemos, isItemOwnedByCurrentUser } = useHappy();
  const isOwner = isItemOwnedByCurrentUser(item.id);
  const memoCount = getItemMemos(item.id).length;
  const hasMemo = memoCount > 0;
  const staticPreviewImage = typeof item.previewImage === 'string' ? item.previewImage.trim() : '';
  const previewImageRef = item.previewImageRef;
  const [resolvedPreviewImage, setResolvedPreviewImage] = useState(staticPreviewImage);
  const hasPreviewImage = Boolean(previewImageRef?.path || staticPreviewImage || resolvedPreviewImage);
  const visibleTags = Array.isArray(item.tags) ? item.tags.slice(0, 4) : [];

  useEffect(() => {
    let isMounted = true;

    const loadPreviewImage = async () => {
      if (!previewImageRef?.path) {
        setResolvedPreviewImage(staticPreviewImage);
        return;
      }

      const nextSrc = await getMemoImageSrc({
        image: previewImageRef,
        supabase
      });

      if (isMounted) {
        setResolvedPreviewImage(nextSrc || staticPreviewImage);
      }
    };

    void loadPreviewImage();

    return () => {
      isMounted = false;
    };
  }, [
    previewImageRef,
    previewImageRef?.contentType,
    previewImageRef?.id,
    previewImageRef?.path,
    previewImageRef?.storageType,
    staticPreviewImage
  ]);

  return (
    <div
      className={`glass-card happiness-card compact ${hasPreviewImage ? 'with-preview-image' : ''}`}
      onClick={() => onClick(item)}
    >
      <div className="happiness-card-main">
        <div className="happiness-card-copy">
          {item.isCustom && isOwner && (
            <div className="card-top-row">
              <div className="card-header">
                <span className="custom-badge">MY</span>
              </div>
            </div>
          )}
          <h3 className="card-title">{item.title}</h3>
          <p className="card-desc-short">{item.description}</p>
        </div>
        {hasPreviewImage && (
          <div className="happiness-card-preview" aria-hidden="true">
            {resolvedPreviewImage ? (
              <img src={resolvedPreviewImage} alt="" loading="lazy" />
            ) : (
              <span className="happiness-card-preview-placeholder" />
            )}
          </div>
        )}
      </div>
      {(visibleTags.length > 0 || hasMemo) && (
        <div className="card-bottom-actions">
          {visibleTags.length > 0 && (
            <div className="card-tag-list" aria-label="태그">
              {visibleTags.map(tag => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          )}
          {hasMemo && (
            <span className="card-note-indicator" aria-label={`memo ${memoCount}`}>
              <NoteIcon />
              <span>{memoCount}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default memo(HappinessCard);
