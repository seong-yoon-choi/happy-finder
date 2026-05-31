import React, { memo, useEffect, useState } from 'react';
import { getMemoImageSrc } from '../lib/memoImages';
import { supabase } from '../lib/supabase';
import { useHappy } from '../store/HappyContext';
import './HappinessCard.css';

const FALLBACK_HAPPINESS_IMAGE = '/happy-finder-icon.svg';

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

const CardEmpathyIcon = () => (
  <svg className="card-empathy-icon" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
    <circle
      className="card-empathy-face"
      cx="16"
      cy="16"
      r="14"
      fill="#e2b85d"
      stroke="#66572b"
      strokeWidth="1.9"
    />
    <g className="card-empathy-blush">
      <circle cx="10.3" cy="18.1" r="1.65" />
      <circle cx="21.7" cy="18.1" r="1.65" />
    </g>
    <circle className="card-empathy-eye" cx="11.8" cy="13.3" r="1.45" />
    <circle className="card-empathy-eye" cx="20.2" cy="13.3" r="1.45" />
    <path
      className="card-empathy-mouth"
      d="M10.6 18.3C12.3 21.35 19.7 21.35 21.4 18.3"
      fill="none"
      strokeLinecap="round"
      strokeWidth="2.25"
    />
  </svg>
);

const HappinessCard = ({ item, onClick }) => {
  const { getItemMemos, isItemOwnedByCurrentUser, userEmpathies } = useHappy();
  const isOwner = isItemOwnedByCurrentUser(item.id);
  const memoCount = getItemMemos(item.id).length;
  const hasMemo = memoCount > 0;
  const isEmpathized = Boolean(userEmpathies?.[item.id]);
  const staticPreviewImage = typeof item.previewImage === 'string' ? item.previewImage.trim() : '';
  const previewImageRef = item.previewImageRef;
  const [resolvedPreviewImage, setResolvedPreviewImage] = useState(staticPreviewImage);
  const hasCustomPreviewImage = Boolean(previewImageRef?.path || staticPreviewImage || resolvedPreviewImage);
  const previewImageSrc = resolvedPreviewImage || FALLBACK_HAPPINESS_IMAGE;
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
      className={`glass-card happiness-card compact with-preview-image ${hasCustomPreviewImage ? 'has-custom-preview' : 'has-fallback-preview'}`}
      onClick={() => onClick(item)}
    >
      <div className="happiness-card-main">
        <div className="happiness-card-preview" aria-hidden="true">
          <img src={previewImageSrc} alt="" loading="lazy" />
        </div>
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
          {visibleTags.length > 0 && (
            <div className="card-tag-list" aria-label="태그">
              {visibleTags.map(tag => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>
      {(isEmpathized || hasMemo) && (
        <div className="card-status-icons">
          {isEmpathized && (
            <span className="card-empathy-indicator" aria-label="공감한 행복">
              <CardEmpathyIcon />
            </span>
          )}
          {hasMemo && (
            <span className="card-note-indicator" aria-label={`기록 ${memoCount}개`}>
              <NoteIcon />
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default memo(HappinessCard);
