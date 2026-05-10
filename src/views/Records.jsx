import React, { useCallback, useEffect, useState } from 'react';
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

const FREE_RECORD_IMAGE_ITEM_ID = 'free-records';
const RECORD_PREVIEW_LIMIT = 3;
const RECORD_MIN_MONTH_DATE = new Date(2026, 0, 1);

const recordDateTimeFormatter = new Intl.DateTimeFormat('ko-KR', {
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

const getRecordSnippet = content => {
  const normalizedContent = typeof content === 'string' ? content.trim() : '';

  if (!normalizedContent) {
    return '사진으로 남긴 기록';
  }

  return normalizedContent;
};

const getRecordDate = record => {
  const date = new Date(record?.createdAt || record?.updatedAt || Date.now());
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

const getRecordDateValue = record => getRecordDate(record).getTime();

const getMonthStart = value => {
  const date = value instanceof Date ? value : new Date(value);
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  return new Date(safeDate.getFullYear(), safeDate.getMonth(), 1);
};

const getMonthKey = date => `${date.getFullYear()}-${date.getMonth()}`;

const getMonthLabel = date => `${date.getFullYear()}년 ${date.getMonth() + 1}월`;

const addMonths = (date, amount) => new Date(date.getFullYear(), date.getMonth() + amount, 1);

const getMonthIndex = date => date.getFullYear() * 12 + date.getMonth();

const getRecordMaxMonthDate = () => {
  const currentMonthDate = getMonthStart(new Date());
  return getMonthIndex(currentMonthDate) < getMonthIndex(RECORD_MIN_MONTH_DATE)
    ? RECORD_MIN_MONTH_DATE
    : currentMonthDate;
};

const clampRecordMonthDate = date => {
  const monthDate = getMonthStart(date);
  const maxMonthDate = getRecordMaxMonthDate();

  if (getMonthIndex(monthDate) < getMonthIndex(RECORD_MIN_MONTH_DATE)) {
    return RECORD_MIN_MONTH_DATE;
  }

  if (getMonthIndex(monthDate) > getMonthIndex(maxMonthDate)) {
    return maxMonthDate;
  }

  return monthDate;
};

const getSelectableYears = maxMonthDate => {
  const years = [];

  for (let year = RECORD_MIN_MONTH_DATE.getFullYear(); year <= maxMonthDate.getFullYear(); year += 1) {
    years.push(year);
  }

  return years;
};

const getSelectableMonths = (year, maxMonthDate) => {
  const startMonth = year === RECORD_MIN_MONTH_DATE.getFullYear()
    ? RECORD_MIN_MONTH_DATE.getMonth()
    : 0;
  const endMonth = year === maxMonthDate.getFullYear()
    ? maxMonthDate.getMonth()
    : 11;

  return Array.from(
    { length: Math.max(0, endMonth - startMonth + 1) },
    (_, index) => startMonth + index
  );
};

const isRecordInMonth = (record, monthDate) => {
  const recordDate = getRecordDate(record);
  return (
    recordDate.getFullYear() === monthDate.getFullYear()
    && recordDate.getMonth() === monthDate.getMonth()
  );
};

const formatRecordDateTime = record => recordDateTimeFormatter.format(getRecordDate(record));

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
    getFreeRecords,
    addFreeRecord,
    updateFreeRecord,
    deleteFreeRecord,
    authUser,
    isReviewAuthUser
  } = useHappy();

  const records = getFreeRecords()
    .sort((leftRecord, rightRecord) => getRecordDateValue(rightRecord) - getRecordDateValue(leftRecord));
  const isImageEnabled = isNativeMemoImageAvailable();
  const cloudAuthUserId = authUser?.id && !isReviewAuthUser ? authUser.id : null;

  const [selectedMonthDate, setSelectedMonthDate] = useState(() => clampRecordMonthDate(new Date()));
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [monthPickerYear, setMonthPickerYear] = useState(() => clampRecordMonthDate(new Date()).getFullYear());
  const [draftRecordId, setDraftRecordId] = useState(() => createDraftRecordId());
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [recordText, setRecordText] = useState('');
  const [recordImages, setRecordImages] = useState([]);
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [showAllRecords, setShowAllRecords] = useState(false);
  const [imageFeedback, setImageFeedback] = useState('');
  const [imageBusyTarget, setImageBusyTarget] = useState('');
  const [activeImage, setActiveImage] = useState(null);
  const [gallerySaveState, setGallerySaveState] = useState({
    isSaving: false,
    message: ''
  });

  const selectedMonthKey = getMonthKey(selectedMonthDate);
  const maxMonthDate = getRecordMaxMonthDate();
  const availableYears = getSelectableYears(maxMonthDate);
  const availableMonths = getSelectableMonths(monthPickerYear, maxMonthDate);
  const canMoveToPreviousMonth = getMonthIndex(selectedMonthDate) > getMonthIndex(RECORD_MIN_MONTH_DATE);
  const canMoveToNextMonth = getMonthIndex(selectedMonthDate) < getMonthIndex(maxMonthDate);
  const selectedMonthRecords = records.filter(record => isRecordInMonth(record, selectedMonthDate));
  const visibleRecords = showAllRecords
    ? selectedMonthRecords
    : selectedMonthRecords.slice(0, RECORD_PREVIEW_LIMIT);
  const isEditingRecord = Boolean(editingRecordId);

  useEffect(() => {
    setShowAllRecords(false);
  }, [selectedMonthKey]);

  const cleanupImages = useCallback(images => {
    if (!Array.isArray(images) || images.length === 0) {
      return;
    }

    void deleteMemoStoredImages({ images, supabase });
  }, []);

  const getEditingOriginalImages = useCallback(() => (
    records.find(record => record.id === editingRecordId)?.images || []
  ), [editingRecordId, records]);

  const cleanupUncommittedComposerImages = useCallback(() => {
    if (recordImages.length === 0) {
      return;
    }

    if (!editingRecordId) {
      cleanupImages(recordImages);
      return;
    }

    const originalImageIds = new Set(getEditingOriginalImages().map(image => image.id));
    const uncommittedImages = recordImages.filter(image => !originalImageIds.has(image.id));
    cleanupImages(uncommittedImages);
  }, [cleanupImages, editingRecordId, getEditingOriginalImages, recordImages]);

  const resetComposer = useCallback(({ shouldCleanup = true } = {}) => {
    if (shouldCleanup) {
      cleanupUncommittedComposerImages();
    }

    setIsComposerOpen(false);
    setEditingRecordId(null);
    setRecordText('');
    setRecordImages([]);
    setDraftRecordId(createDraftRecordId());
    setImageFeedback('');
    setImageBusyTarget('');
  }, [cleanupUncommittedComposerImages]);

  const openCreateComposer = () => {
    resetComposer({ shouldCleanup: true });
    setIsComposerOpen(true);
  };

  const openEditComposer = record => {
    resetComposer({ shouldCleanup: true });
    setEditingRecordId(record.id);
    setRecordText(record.content);
    setRecordImages(Array.isArray(record.images) ? record.images : []);
    setIsComposerOpen(true);
  };

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

  const handleMoveMonth = amount => {
    setSelectedMonthDate(prev => clampRecordMonthDate(addMonths(prev, amount)));
  };

  const openMonthPicker = () => {
    const clampedSelectedMonth = clampRecordMonthDate(selectedMonthDate);
    setSelectedMonthDate(clampedSelectedMonth);
    setMonthPickerYear(clampedSelectedMonth.getFullYear());
    setIsMonthPickerOpen(true);
  };

  const handleSelectMonth = (year, month) => {
    setSelectedMonthDate(clampRecordMonthDate(new Date(year, month, 1)));
    setIsMonthPickerOpen(false);
  };

  const handleAttachImage = async source => {
    if (!isImageEnabled) {
      return;
    }

    if (recordImages.length >= MEMO_IMAGE_MAX_COUNT) {
      setImageFeedback(getImageErrorMessage('IMAGE_LIMIT_REACHED'));
      return;
    }

    const recordId = editingRecordId || draftRecordId;
    const busyKey = `composer:${source}`;
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

      setRecordImages(prev => [...prev, persistedImage]);
    } catch {
      setImageFeedback(getImageErrorMessage('PERSIST_FAILED'));
    } finally {
      setImageBusyTarget('');
    }
  };

  const handleRemoveComposerImage = image => {
    setRecordImages(prev => prev.filter(candidate => candidate.id !== image.id));

    const isOriginalEditingImage = editingRecordId
      ? getEditingOriginalImages().some(originalImage => originalImage.id === image.id)
      : false;

    if (!isOriginalEditingImage) {
      cleanupImages([image]);
    }
  };

  const handleSaveRecord = () => {
    const savedRecord = editingRecordId
      ? updateFreeRecord(editingRecordId, recordText, recordImages)
      : addFreeRecord(recordText, recordImages, { id: draftRecordId });

    if (!savedRecord) {
      return;
    }

    if (!editingRecordId) {
      setSelectedMonthDate(getMonthStart(new Date()));
    }

    resetComposer({ shouldCleanup: false });
  };

  const handleDeleteRecord = record => {
    if (editingRecordId === record.id) {
      resetComposer({ shouldCleanup: false });
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
        <div className="records-header-row">
          <div>
            <h2>기록</h2>
            <p>지금 행복한 감정을 기록해 보세요.</p>
          </div>
          <button type="button" className="records-write-btn" onClick={openCreateComposer}>
            기록 남기기
          </button>
        </div>
      </header>

      <main className="records-sections">
        <section className="glass-card records-overview-section records-month-section">
          <div className="records-month-nav" aria-label="기록 월 선택">
            <button
              type="button"
              className="records-month-shift-btn"
              onClick={() => handleMoveMonth(-1)}
              disabled={!canMoveToPreviousMonth}
              aria-label="이전 달 기록 보기"
            >
              &lt;
            </button>
            <button
              type="button"
              className="records-month-select-btn"
              onClick={openMonthPicker}
              aria-label={`${getMonthLabel(selectedMonthDate)} 선택 변경`}
            >
              <strong>{getMonthLabel(selectedMonthDate)}</strong>
            </button>
            <button
              type="button"
              className="records-month-shift-btn"
              onClick={() => handleMoveMonth(1)}
              disabled={!canMoveToNextMonth}
              aria-label="다음 달 기록 보기"
            >
              &gt;
            </button>
          </div>

          <div className="records-month-meta">
            <span>{selectedMonthRecords.length > 0 ? `${selectedMonthRecords.length}개의 기록` : '이 달의 기록 없음'}</span>
          </div>

          {visibleRecords.length > 0 ? (
            <div className="record-preview-list">
              {visibleRecords.map(record => (
                <article key={record.id} className="record-preview-row">
                  <div className="record-preview-content">
                    <time>{formatRecordDateTime(record)}</time>
                    <p>{getRecordSnippet(record.content)}</p>
                    {record.images.length > 0 && (
                      <RecordImageStrip images={record.images} onOpen={openImage} />
                    )}
                  </div>
                  <div className="record-preview-actions">
                    <button type="button" onClick={() => openEditComposer(record)}>수정</button>
                    <button type="button" className="danger" onClick={() => handleDeleteRecord(record)}>삭제</button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="record-section-empty">이 달에는 아직 남긴 기록이 없어요.</p>
          )}

          {selectedMonthRecords.length > RECORD_PREVIEW_LIMIT && (
            <button
              type="button"
              className="record-view-all-btn"
              onClick={() => setShowAllRecords(prev => !prev)}
            >
              {showAllRecords ? '접기' : '전체 보기'}
            </button>
          )}
        </section>
      </main>

      {isMonthPickerOpen && (
        <div
          className="record-month-picker-overlay"
          data-block-pull-refresh="true"
          onClick={() => setIsMonthPickerOpen(false)}
        >
          <div
            className="record-month-picker-modal"
            data-block-pull-refresh="true"
            onClick={event => event.stopPropagation()}
          >
            <div className="record-month-picker-header">
              <div>
                <span>DATE</span>
                <h3>연도와 월 선택</h3>
              </div>
              <button
                type="button"
                className="record-month-picker-close"
                onClick={() => setIsMonthPickerOpen(false)}
                aria-label="월 선택 닫기"
              >
                &times;
              </button>
            </div>

            <div className="record-month-picker-years" aria-label="연도 선택">
              {availableYears.map(year => (
                <button
                  key={year}
                  type="button"
                  className={year === monthPickerYear ? 'active' : ''}
                  onClick={() => setMonthPickerYear(year)}
                >
                  {year}년
                </button>
              ))}
            </div>

            <div className="record-month-picker-grid" aria-label={`${monthPickerYear}년 월 선택`}>
              {availableMonths.map(month => (
                <button
                  key={month}
                  type="button"
                  className={
                    selectedMonthDate.getFullYear() === monthPickerYear
                      && selectedMonthDate.getMonth() === month
                      ? 'active'
                      : ''
                  }
                  onClick={() => handleSelectMonth(monthPickerYear, month)}
                >
                  {month + 1}월
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {isComposerOpen && (
        <div className="record-composer-overlay" data-block-pull-refresh="true" onClick={() => resetComposer()}>
          <div className="record-note-modal" data-block-pull-refresh="true" onClick={event => event.stopPropagation()}>
            <div className="record-note-header">
              <div>
                <span>NOTE</span>
                <h3>{isEditingRecord ? '기록 수정하기' : '기록 남기기'}</h3>
              </div>
              <button type="button" className="record-note-close" onClick={() => resetComposer()} aria-label="기록 작성 닫기">
                &times;
              </button>
            </div>

            <textarea
              value={recordText}
              onChange={event => setRecordText(event.target.value)}
              placeholder="짧은 한 줄도 좋고, 길게 쓰는 일기도 좋아요."
              rows={9}
              maxLength={1600}
              autoFocus
            />

            <RecordImageStrip
              images={recordImages}
              onRemove={handleRemoveComposerImage}
              onOpen={openImage}
            />

            {imageFeedback && <p className="records-image-feedback">{imageFeedback}</p>}

            <div className="record-note-footer">
              {isImageEnabled && (
                <div className="records-photo-actions">
                  <button
                    type="button"
                    onClick={() => handleAttachImage('camera')}
                    disabled={Boolean(imageBusyTarget)}
                  >
                    {imageBusyTarget === 'composer:camera' ? '촬영 중...' : '카메라'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAttachImage('gallery')}
                    disabled={Boolean(imageBusyTarget)}
                  >
                    {imageBusyTarget === 'composer:gallery' ? '선택 중...' : '앨범'}
                  </button>
                </div>
              )}

              <button
                type="button"
                className="btn-primary record-note-save"
                onClick={handleSaveRecord}
                disabled={!recordText.trim() && recordImages.length === 0}
              >
                {isEditingRecord ? '기록 수정하기' : '기록 저장하기'}
              </button>
            </div>
          </div>
        </div>
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
