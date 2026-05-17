import React, { useEffect, useState } from 'react';
import useModalBackNavigation from '../hooks/useModalBackNavigation';
import { HAPPINESS_TAG_GROUPS, MAX_RECORD_TAGS, normalizeVisibleTags } from '../lib/happinessTags';
import {
  chooseMemoPhoto,
  deleteMemoStoredImages,
  getMemoImageSrc,
  isNativeMemoImageAvailable,
  persistMemoImage,
  saveMemoImageToGallery,
  takeMemoPhoto
} from '../lib/memoImages';
import { supabase } from '../lib/supabase';
import { useHappy } from '../store/HappyContext';
import './CreateHappinessModal.css';

const DEFAULT_CUSTOM_CATEGORY = '소확행';
const CREATE_HAPPINESS_PREVIEW_MEMO_ID = 'preview';
const VISIBILITY_OPTIONS = [
  { value: 'private', label: '나만보기' },
  { value: 'public', label: '공개하기' }
];

const CreateTagIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path
      d="M5.5 7H18.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M8.5 12H15.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M10.5 17H13.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const createDraftHappinessId = () => `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const getCreateImageErrorMessage = code => {
  switch (code) {
    case 'CAMERA_PERMISSION_DENIED':
      return '카메라 권한이 필요해요. 휴대폰 설정에서 권한을 허용해주세요.';
    case 'PHOTO_PERMISSION_DENIED':
      return '사진 접근 권한이 필요해요. 휴대폰 설정에서 권한을 허용해주세요.';
    case 'PHOTO_PICK_CANCELLED':
    case 'OS-PLUG-CAMR-0006':
      return '';
    default:
      return '사진을 불러오지 못했어요. 잠시 후 다시 시도해주세요.';
  }
};

const CreatePreviewImage = ({ image, onOpen, onRemove }) => {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadImage = async () => {
      if (!image) {
        setSrc('');
        return;
      }

      const nextSrc = await getMemoImageSrc({
        image,
        supabase
      });

      if (isMounted) {
        setSrc(nextSrc);
      }
    };

    void loadImage();

    return () => {
      isMounted = false;
    };
  }, [image]);

  if (!image) {
    return null;
  }

  return (
    <div className="create-image-preview-media">
      <button
        type="button"
        className="create-image-preview-open"
        onClick={() => onOpen?.(image, src)}
        disabled={!src}
        aria-label="첨부 사진 크게 보기"
      >
        {src ? <img src={src} alt="" loading="lazy" /> : <span />}
      </button>
      <button
        type="button"
        className="create-image-preview-remove"
        onClick={() => onRemove?.(image)}
        aria-label="첨부 사진 제거"
      >
        &times;
      </button>
    </div>
  );
};

const CreateHappinessModal = ({ isOpen, onClose }) => {
  const { addCustomItem, authUser, isReviewAuthUser } = useHappy();
  const isImageEnabled = isNativeMemoImageAvailable();
  const cloudAuthUserId = authUser?.id && !isReviewAuthUser ? authUser.id : null;
  const [draftItemId, setDraftItemId] = useState(() => createDraftHappinessId());
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState(VISIBILITY_OPTIONS[0].value);
  const [selectedTags, setSelectedTags] = useState([]);
  const [isTagPickerOpen, setIsTagPickerOpen] = useState(false);
  const [tagError, setTagError] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  const [activePreviewImage, setActivePreviewImage] = useState(null);
  const [gallerySaveState, setGallerySaveState] = useState({
    isSaving: false,
    message: ''
  });
  const [imageFeedback, setImageFeedback] = useState('');
  const [imageBusyTarget, setImageBusyTarget] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cleanupPreviewImage = image => {
    if (!image) {
      return;
    }

    void deleteMemoStoredImages({ images: [image], supabase });
  };

  const resetForm = ({ shouldCleanupImage = true } = {}) => {
    if (shouldCleanupImage) {
      cleanupPreviewImage(previewImage);
    }

    setDraftItemId(createDraftHappinessId());
    setTitle('');
    setDescription('');
    setVisibility(VISIBILITY_OPTIONS[0].value);
    setSelectedTags([]);
    setIsTagPickerOpen(false);
    setTagError('');
    setPreviewImage(null);
    setActivePreviewImage(null);
    setGallerySaveState({
      isSaving: false,
      message: ''
    });
    setImageFeedback('');
    setImageBusyTarget('');
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

  const closePreviewImage = () => {
    setActivePreviewImage(null);
    setGallerySaveState({
      isSaving: false,
      message: ''
    });
  };

  const requestClosePreviewImage = useModalBackNavigation({
    isOpen: isOpen && Boolean(activePreviewImage),
    onClose: closePreviewImage,
    historyKey: 'create-image-viewer'
  });

  const handleSubmit = async event => {
    event.preventDefault();

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!trimmedTitle || !trimmedDescription) {
      return;
    }

    if (selectedTags.length === 0) {
      setTagError('최소 한개의 태그를 선택해 주세요.');
      setIsTagPickerOpen(true);
      return;
    }

    setSubmitError('');
    setTagError('');
    setIsSubmitting(true);
    const result = await addCustomItem(
      trimmedTitle,
      trimmedDescription,
      DEFAULT_CUSTOM_CATEGORY,
      visibility,
      selectedTags,
      {
        id: draftItemId,
        previewImageRef: previewImage
      }
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

    resetForm({ shouldCleanupImage: false });
    onClose();
  };

  const handleTagToggle = tag => {
    setSelectedTags(prev => {
      if (prev.includes(tag)) {
        return prev.filter(selectedTag => selectedTag !== tag);
      }

      if (prev.length >= MAX_RECORD_TAGS) {
        return prev;
      }

      setTagError('');
      return normalizeVisibleTags([...prev, tag], MAX_RECORD_TAGS);
    });
  };

  const handleAttachImage = async source => {
    if (!isImageEnabled || imageBusyTarget) {
      return;
    }

    const busyKey = `create:${source}`;
    setImageBusyTarget(busyKey);
    setImageFeedback('');

    const pickResult = source === 'camera'
      ? await takeMemoPhoto()
      : await chooseMemoPhoto();

    if (!pickResult.success) {
      setImageBusyTarget('');
      setImageFeedback(getCreateImageErrorMessage(pickResult.code));
      return;
    }

    try {
      const persistedImage = await persistMemoImage({
        supabase,
        authUserId: cloudAuthUserId,
        itemId: draftItemId,
        memoId: CREATE_HAPPINESS_PREVIEW_MEMO_ID,
        mediaResult: pickResult.photo,
        source
      });

      cleanupPreviewImage(previewImage);
      setPreviewImage(persistedImage);
    } catch {
      setImageFeedback(getCreateImageErrorMessage('PERSIST_FAILED'));
    } finally {
      setImageBusyTarget('');
    }
  };

  const handleRemovePreviewImage = () => {
    cleanupPreviewImage(previewImage);
    setPreviewImage(null);
    setActivePreviewImage(null);
    setImageFeedback('');
  };

  const openPreviewImage = (image, src) => {
    if (!image) {
      return;
    }

    setActivePreviewImage({ image, src: src || '' });
    setGallerySaveState({
      isSaving: false,
      message: ''
    });
  };

  const handleSaveActivePreviewImageToGallery = async () => {
    if (!activePreviewImage?.image || activePreviewImage.image.source !== 'camera' || gallerySaveState.isSaving) {
      return;
    }

    setGallerySaveState({
      isSaving: true,
      message: ''
    });

    const result = await saveMemoImageToGallery({
      image: activePreviewImage.image,
      supabase
    });

    setGallerySaveState({
      isSaving: false,
      message: result.success
        ? '앨범에 저장했어요.'
        : getCreateImageErrorMessage(result.code)
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
              <input
                id="custom-happiness-title"
                className="create-note-title-input"
                type="text"
                value={title}
                onChange={event => setTitle(event.target.value)}
                placeholder="행복의 이름을 적어주세요"
                aria-label="행복 제목"
                maxLength={20}
                required
              />
            </div>

            <div className="form-group">
              <textarea
                id="custom-happiness-description"
                className="create-note-description-input"
                value={description}
                onChange={event => setDescription(event.target.value)}
                placeholder="어떤 행복인지 짧게 설명해주세요"
                aria-label="행복 상세 내용"
                rows={4}
                maxLength={100}
                required
              />
            </div>

            <div className="form-group">
              <div
                className={`create-tag-dropdown ${isTagPickerOpen ? 'is-open' : ''} ${selectedTags.length > 0 ? 'has-tags' : ''} ${tagError ? 'has-error' : ''}`}
                data-block-pull-refresh="true"
              >
                <button
                  type="button"
                  className="create-tag-dropdown-trigger"
                  aria-expanded={isTagPickerOpen}
                  aria-controls="create-tag-dropdown-panel"
                  onClick={() => setIsTagPickerOpen(prev => !prev)}
                >
                  <span className="create-tag-dropdown-main">
                    <CreateTagIcon />
                    <span>태그</span>
                  </span>
                  <span className="create-tag-dropdown-meta">
                    <span className="create-tag-dropdown-count">
                      {selectedTags.length > 0 ? `${selectedTags.length}/${MAX_RECORD_TAGS}개 선택` : '선택 안 함'}
                    </span>
                    <span className="create-tag-dropdown-arrow" aria-hidden="true" />
                  </span>
                </button>

                {isTagPickerOpen && (
                  <div id="create-tag-dropdown-panel" className="create-tag-dropdown-panel" data-block-pull-refresh="true">
                    {tagError && <p className="form-error create-tag-error">{tagError}</p>}

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
                )}
              </div>
              {selectedTags.length > 0 && (
                <span className="create-selected-tags">
                  {selectedTags.map(tag => (
                    <span key={tag} className="create-selected-tag">{tag}</span>
                  ))}
                </span>
              )}
            </div>

            {isImageEnabled && (
              <div className="form-group">
                {previewImage && (
                  <CreatePreviewImage
                    image={previewImage}
                    onOpen={openPreviewImage}
                    onRemove={handleRemovePreviewImage}
                  />
                )}
                <div className="create-image-actions">
                  <button
                    type="button"
                    onClick={() => handleAttachImage('camera')}
                    disabled={Boolean(imageBusyTarget)}
                  >
                    {imageBusyTarget === 'create:camera' ? '촬영 중...' : '카메라'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAttachImage('gallery')}
                    disabled={Boolean(imageBusyTarget)}
                  >
                    {imageBusyTarget === 'create:gallery' ? '선택 중...' : '앨범'}
                  </button>
                </div>
                {imageFeedback && <p className="form-helper create-image-feedback">{imageFeedback}</p>}
              </div>
            )}

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

      {activePreviewImage && (
        <div
          className="create-image-viewer-overlay"
          onClick={event => {
            event.stopPropagation();
            requestClosePreviewImage();
          }}
        >
          <div
            className="create-image-viewer"
            onClick={event => event.stopPropagation()}
          >
            <button
              type="button"
              className="create-image-viewer-close"
              onClick={() => requestClosePreviewImage()}
              aria-label="사진 닫기"
            >
              &times;
            </button>
            {activePreviewImage.src && <img src={activePreviewImage.src} alt="" />}
            {activePreviewImage.image?.source === 'camera' && (
              <div className="create-image-viewer-actions">
                <button
                  type="button"
                  className="btn-primary create-image-save-btn"
                  onClick={handleSaveActivePreviewImageToGallery}
                  disabled={gallerySaveState.isSaving}
                >
                  {gallerySaveState.isSaving ? '저장 중...' : '앨범에 저장'}
                </button>
                {gallerySaveState.message && <p>{gallerySaveState.message}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateHappinessModal;
