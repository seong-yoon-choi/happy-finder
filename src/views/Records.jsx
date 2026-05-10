import React, { lazy, useCallback, useMemo, useState } from 'react';
import LazyLoadBoundary from '../components/LazyLoadBoundary';
import {
  chooseMemoPhoto,
  deleteMemoStoredImages,
  getMemoImageSrc,
  isNativeMemoImageAvailable,
  MEMO_IMAGE_MAX_COUNT,
  persistMemoImage,
  saveMemoImageToGallery,
  takeMemoPhoto
} from '../lib/memoImages';
import { supabase } from '../lib/supabase';
import { useHappy } from '../store/HappyContext';
import './Records.css';

const loadHappinessDetailModal = () => import('../components/HappinessDetailModal');
const HappinessDetailModal = lazy(loadHappinessDetailModal);
const FREE_RECORD_IMAGE_ITEM_ID = 'free-records';

const recordDateTimeFormatter = new Intl.DateTimeFormat('ko-KR', {
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});

const createDraftRecordId = () => `fr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const getImageErrorMessage = code => {
  switch (code) {
    case 'CAMERA_PERMISSION_DENIED':
      return '카메라 권한이 필요해요. 휴대폰 설정에서 권한을 허용해주세요.';
    case 'PHOTO_PERMISSION_DENIED':
      return '사진 접근 권한이 필요해요. 휴대폰 설정에서 권한을 허용해주세요.';
    case 'PHOTO_PICK_CANCELLED':
    case 'OS-PLUG-CAMR-0006':
      return '';
    case 'IMAGE_LIMIT_REACHED':
      return `사진은 기록 하나에 최대 ${MEMO_IMAGE_MAX_COUNT}장까지 첨부할 수 있어요.`;
    case 'SAVE_TO_GALLERY_FAILED':
    case 'accessDenied':
      return '휴대폰에 저장하지 못했어요. 사진 저장 권한을 확인해주세요.';
    default:
      return '사진을 처리하지 못했어요. 잠시 후 다시 시도해주세요.';
  }
};

const RecordImageThumb = ({ image, onRemove, onOpen }) => {
  const [src, setSrc] = useState('');
  const imageId = image.id;
  const imagePath = image.path;
  const imageStorageType = image.storageType;
  const imageContentType = image.contentType;

  React.useEffect(() => {
    let isMounted = true;

    const loadImage = async () => {
      const nextSrc = await getMemoImageSrc({
        image: {
          id: imageId,
          path: imagePath,
          storageType: imageStorageType,
          contentType: imageContentType
        },
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
  }, [imageContentType, imageId, imagePath, imageStorageType]);

  return (
    <div className="record-image-thumb">
      <button
        type="button"
        className="record-image-open"
        onClick={() => onOpen?.(image, src)}
        disabled={!src}
        aria-label="첨부 사진 크게 보기"
      >
        {src ? <img src={src} alt="" loading="lazy" /> : <span />}
      </button>
      {onRemove && (
        <button
          type="button"
          className="record-image-remove"
          onClick={() => onRemove(image)}
          aria-label="첨부 사진 삭제"
        >
          &times;
        </button>
      )}
    </div>
  );
};

const RecordImageStrip = ({ images = [], onRemove, onOpen }) => {
  if (images.length === 0) {
    return null;
  }

  return (
    <div className="record-image-strip">
      {images.map(image => (
        <RecordImageThumb
          key={image.id}
          image={image}
          onRemove={onRemove}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
};

const Records = () => {
  const {
    getAllRecords,
    getFreeRecords,
    addFreeRecord,
    updateFreeRecord,
    deleteFreeRecord,
    authUser,
    isReviewAuthUser
  } = useHappy();
  const records = getAllRecords();
  const freeRecords = getFreeRecords();
  const listRecordCount = records.filter(record => record.sourceType === 'list').length;
  const freeRecordCount = freeRecords.length;
  const isImageEnabled = isNativeMemoImageAvailable();
  const cloudAuthUserId = authUser?.id && !isReviewAuthUser ? authUser.id : null;

  const [draftRecordId, setDraftRecordId] = useState(() => createDraftRecordId());
  const [freeText, setFreeText] = useState('');
  const [freeImages, setFreeImages] = useState([]);
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [editingImages, setEditingImages] = useState([]);
  const [imageFeedback, setImageFeedback] = useState('');
  const [imageBusyTarget, setImageBusyTarget] = useState('');
  const [activeImage, setActiveImage] = useState(null);
  const [gallerySaveState, setGallerySaveState] = useState({
    isSaving: false,
    message: ''
  });
  const [selectedItem, setSelectedItem] = useState(null);

  const sortedRecords = useMemo(() => records, [records]);

  const cleanupImages = useCallback(images => {
    if (!Array.isArray(images) || images.length === 0) {
      return;
    }

    void deleteMemoStoredImages({ images, supabase });
  }, []);

  const getEditingOriginalImages = useCallback(() => (
    freeRecords.find(record => record.id === editingRecordId)?.images || []
  ), [editingRecordId, freeRecords]);

  const cleanupUncommittedEditingImages = useCallback(() => {
    if (!editingRecordId || editingImages.length === 0) {
      return;
    }

    const originalImageIds = new Set(getEditingOriginalImages().map(image => image.id));
    const uncommittedImages = editingImages.filter(image => !originalImageIds.has(image.id));
    cleanupImages(uncommittedImages);
  }, [cleanupImages, editingImages, editingRecordId, getEditingOriginalImages]);

  const openImage = (image, src) => {
    if (!image) {
      return;
    }

    setActiveImage({ image, src: src || '' });
    setGallerySaveState({
      isSaving: false,
      message: ''
    });
  };

  const handleAttachImage = async (target, source) => {
    if (!isImageEnabled) {
      return;
    }

    const currentImages = target === 'edit' ? editingImages : freeImages;

    if (currentImages.length >= MEMO_IMAGE_MAX_COUNT) {
      setImageFeedback(getImageErrorMessage('IMAGE_LIMIT_REACHED'));
      return;
    }

    const recordId = target === 'edit' ? editingRecordId : draftRecordId;

    if (!recordId) {
      return;
    }

    const busyKey = `${target}:${source}`;
    setImageBusyTarget(busyKey);
    setImageFeedback('');

    const pickResult = source === 'camera'
      ? await takeMemoPhoto()
      : await chooseMemoPhoto();

    if (!pickResult.success) {
      setImageBusyTarget('');
      setImageFeedback(getImageErrorMessage(pickResult.code));
      return;
    }

    try {
      const persistedImage = await persistMemoImage({
        supabase,
        authUserId: cloudAuthUserId,
        itemId: FREE_RECORD_IMAGE_ITEM_ID,
        memoId: recordId,
        mediaResult: pickResult.photo
      });

      if (target === 'edit') {
        setEditingImages(prev => [...prev, persistedImage]);
      } else {
        setFreeImages(prev => [...prev, persistedImage]);
      }
    } catch {
      setImageFeedback(getImageErrorMessage('PERSIST_FAILED'));
    } finally {
      setImageBusyTarget('');
    }
  };

  const handleRemoveDraftImage = image => {
    setFreeImages(prev => prev.filter(candidate => candidate.id !== image.id));
    cleanupImages([image]);
  };

  const handleRemoveEditingImage = image => {
    setEditingImages(prev => prev.filter(candidate => candidate.id !== image.id));
  };

  const handleSaveFreeRecord = () => {
    const savedRecord = addFreeRecord(freeText, freeImages, { id: draftRecordId });

    if (!savedRecord) {
      return;
    }

    setFreeText('');
    setFreeImages([]);
    setDraftRecordId(createDraftRecordId());
    setImageFeedback('');
  };

  const handleStartEdit = record => {
    cleanupUncommittedEditingImages();
    setEditingRecordId(record.id);
    setEditingText(record.content);
    setEditingImages(Array.isArray(record.images) ? record.images : []);
    setImageFeedback('');
  };

  const handleCancelEdit = () => {
    cleanupUncommittedEditingImages();
    setEditingRecordId(null);
    setEditingText('');
    setEditingImages([]);
    setImageFeedback('');
  };

  const handleSaveEdit = recordId => {
    const didUpdate = updateFreeRecord(recordId, editingText, editingImages);

    if (!didUpdate) {
      return;
    }

    setEditingRecordId(null);
    setEditingText('');
    setEditingImages([]);
    setImageFeedback('');
  };

  const handleDeleteFreeRecord = record => {
    if (editingRecordId === record.id) {
      handleCancelEdit();
    }

    deleteFreeRecord(record.id);
  };

  const handleSaveActiveImageToGallery = async () => {
    if (!activeImage?.image || gallerySaveState.isSaving) {
      return;
    }

    setGallerySaveState({
      isSaving: true,
      message: ''
    });

    const result = await saveMemoImageToGallery({
      image: activeImage.image,
      supabase
    });

    setGallerySaveState({
      isSaving: false,
      message: result.success
        ? '휴대폰 사진첩에 저장했어요.'
        : getImageErrorMessage(result.code)
    });
  };

  return (
    <div className="view-container records-view">
      <header className="records-header">
        <div className="records-brand" aria-label="Happy Finder 로고">Happy Finder</div>
        <h2>기록</h2>
        <p>리스트에서 남긴 순간과 오늘의 자유 기록을 한곳에 모아요.</p>
      </header>

      <section className="glass-card records-composer" aria-label="자유 기록 작성">
        <div className="records-composer-head">
          <div>
            <span>FREE RECORD</span>
            <h3>오늘 하루 기록하기</h3>
          </div>
          <strong>{freeRecordCount}</strong>
        </div>

        <textarea
          value={freeText}
          onChange={event => setFreeText(event.target.value)}
          placeholder="짧은 한 줄도 좋고, 길게 쓰는 일기도 좋아요."
          rows={5}
          maxLength={1600}
        />

        {isImageEnabled && (
          <div className="records-photo-actions">
            <button
              type="button"
              onClick={() => handleAttachImage('compose', 'camera')}
              disabled={Boolean(imageBusyTarget)}
            >
              {imageBusyTarget === 'compose:camera' ? '촬영 중...' : '카메라'}
            </button>
            <button
              type="button"
              onClick={() => handleAttachImage('compose', 'gallery')}
              disabled={Boolean(imageBusyTarget)}
            >
              {imageBusyTarget === 'compose:gallery' ? '선택 중...' : '앨범'}
            </button>
          </div>
        )}

        <RecordImageStrip
          images={freeImages}
          onRemove={handleRemoveDraftImage}
          onOpen={openImage}
        />

        {imageFeedback && <p className="records-image-feedback">{imageFeedback}</p>}

        <button
          type="button"
          className="btn-primary records-save-btn"
          onClick={handleSaveFreeRecord}
          disabled={!freeText.trim() && freeImages.length === 0}
        >
          자유 기록 저장하기
        </button>
      </section>

      <section className="records-summary" aria-label="기록 요약">
        <div>
          <span>전체</span>
          <strong>{records.length}</strong>
        </div>
        <div>
          <span>리스트 기록</span>
          <strong>{listRecordCount}</strong>
        </div>
        <div>
          <span>자유 기록</span>
          <strong>{freeRecordCount}</strong>
        </div>
      </section>

      <div className="records-list">
        {sortedRecords.length > 0 ? (
          sortedRecords.map(record => {
            const isFreeRecord = record.sourceType === 'free';
            const isEditing = isFreeRecord && editingRecordId === record.id;

            return (
              <article key={record.recordKey} className={`glass-card record-card ${record.sourceType}`}>
                <div className="record-card-head">
                  <span>{isFreeRecord ? '자유 기록' : '리스트 기록'}</span>
                  <time>{recordDateTimeFormatter.format(new Date(record.updatedAt))}</time>
                </div>

                <h3>{isFreeRecord ? '오늘의 기록' : record.itemTitle}</h3>
                {!isFreeRecord && record.itemDescription && <p className="record-linked-desc">{record.itemDescription}</p>}

                {isEditing ? (
                  <div className="record-edit-wrap">
                    <textarea
                      value={editingText}
                      onChange={event => setEditingText(event.target.value)}
                      rows={5}
                      maxLength={1600}
                    />
                    {isImageEnabled && (
                      <div className="records-photo-actions">
                        <button
                          type="button"
                          onClick={() => handleAttachImage('edit', 'camera')}
                          disabled={Boolean(imageBusyTarget)}
                        >
                          {imageBusyTarget === 'edit:camera' ? '촬영 중...' : '카메라'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAttachImage('edit', 'gallery')}
                          disabled={Boolean(imageBusyTarget)}
                        >
                          {imageBusyTarget === 'edit:gallery' ? '선택 중...' : '앨범'}
                        </button>
                      </div>
                    )}
                    <RecordImageStrip
                      images={editingImages}
                      onRemove={handleRemoveEditingImage}
                      onOpen={openImage}
                    />
                    {imageFeedback && <p className="records-image-feedback">{imageFeedback}</p>}
                    <div className="record-actions">
                      <button type="button" className="record-secondary-btn" onClick={handleCancelEdit}>
                        취소
                      </button>
                      <button
                        type="button"
                        className="btn-primary record-primary-btn"
                        onClick={() => handleSaveEdit(record.id)}
                        disabled={!editingText.trim() && editingImages.length === 0}
                      >
                        저장
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {record.content && <p className="record-content">{record.content}</p>}
                    <RecordImageStrip images={record.images} onOpen={openImage} />
                    <div className="record-actions">
                      {isFreeRecord ? (
                        <>
                          <button type="button" className="record-secondary-btn" onClick={() => handleStartEdit(record)}>
                            수정
                          </button>
                          <button type="button" className="record-danger-btn" onClick={() => handleDeleteFreeRecord(record)}>
                            삭제
                          </button>
                        </>
                      ) : (
                        record.item && (
                          <button type="button" className="record-secondary-btn" onClick={() => setSelectedItem(record.item)}>
                            행복 열기
                          </button>
                        )
                      )}
                    </div>
                  </>
                )}
              </article>
            );
          })
        ) : (
          <div className="empty-state records-empty">
            아직 남긴 기록이 없어요.
            <br />
            오늘의 행복을 한 줄로 시작해보세요.
          </div>
        )}
      </div>

      {selectedItem && (
        <LazyLoadBoundary
          mode="overlay"
          loadingLabel="행복 상세 화면을 불러오는 중이에요."
          errorTitle="행복 상세 화면을 열지 못했어요."
          errorMessage="잠시 후 다시 시도해주세요."
          onDismiss={() => setSelectedItem(null)}
          resetKey={`record-detail-${selectedItem.id}`}
        >
          <HappinessDetailModal
            item={selectedItem}
            isOpen={!!selectedItem}
            onClose={() => setSelectedItem(null)}
            canDelete={false}
            autoOpenMemoComposer={false}
          />
        </LazyLoadBoundary>
      )}

      {activeImage && (
        <div className="record-image-viewer-overlay" onClick={() => setActiveImage(null)}>
          <div className="record-image-viewer" onClick={event => event.stopPropagation()}>
            <button
              type="button"
              className="record-image-viewer-close"
              onClick={() => setActiveImage(null)}
              aria-label="사진 닫기"
            >
              &times;
            </button>
            {activeImage.src && <img src={activeImage.src} alt="" />}
            <div className="record-image-viewer-actions">
              <button
                type="button"
                className="btn-primary record-image-save-btn"
                onClick={handleSaveActiveImageToGallery}
                disabled={gallerySaveState.isSaving}
              >
                {gallerySaveState.isSaving ? '저장 중...' : '휴대폰에 저장'}
              </button>
              {gallerySaveState.message && <p>{gallerySaveState.message}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Records;
