import React, { useCallback, useRef, useState } from 'react';
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

const recordDayFormatter = new Intl.DateTimeFormat('ko-KR', {
  month: 'long',
  day: 'numeric',
  weekday: 'short'
});

const calendarWeekdayLabels = ['일', '월', '화', '수', '목', '금', '토'];
const CALENDAR_SWIPE_THRESHOLD = 42;
const CALENDAR_WHEEL_COOLDOWN_MS = 360;
const KOREAN_PUBLIC_HOLIDAY_KEYS = new Set([
  '2026-01-01',
  '2026-02-16',
  '2026-02-17',
  '2026-02-18',
  '2026-03-01',
  '2026-03-02',
  '2026-05-01',
  '2026-05-05',
  '2026-05-24',
  '2026-05-25',
  '2026-06-03',
  '2026-06-06',
  '2026-07-17',
  '2026-08-15',
  '2026-08-17',
  '2026-09-24',
  '2026-09-25',
  '2026-09-26',
  '2026-10-03',
  '2026-10-05',
  '2026-10-09',
  '2026-12-25'
]);

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

const getMonthLabel = date => `${date.getFullYear()}년 ${date.getMonth() + 1}월`;

const getDateKey = date => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDays = (date, amount) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
const addMonths = (date, amount) => new Date(date.getFullYear(), date.getMonth() + amount, 1);

const getMonthIndex = date => date.getFullYear() * 12 + date.getMonth();

const getDayToneClass = date => {
  if (KOREAN_PUBLIC_HOLIDAY_KEYS.has(getDateKey(date)) || date.getDay() === 0) {
    return ' sunday';
  }

  if (date.getDay() === 6) {
    return ' saturday';
  }

  return '';
};

const isPublicHoliday = date => KOREAN_PUBLIC_HOLIDAY_KEYS.has(getDateKey(date));

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

const getRecordMaxDate = () => {
  const today = new Date();
  return getDateKey(today) < getDateKey(RECORD_MIN_MONTH_DATE)
    ? RECORD_MIN_MONTH_DATE
    : today;
};

const clampRecordDate = date => {
  const safeDate = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  const dayDate = new Date(safeDate.getFullYear(), safeDate.getMonth(), safeDate.getDate());
  const maxDate = getRecordMaxDate();

  if (getDateKey(dayDate) < getDateKey(RECORD_MIN_MONTH_DATE)) {
    return RECORD_MIN_MONTH_DATE;
  }

  if (getDateKey(dayDate) > getDateKey(maxDate)) {
    return new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate());
  }

  return dayDate;
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

const getCalendarDays = monthDate => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDate = new Date(year, month, 1);
  const lastDate = new Date(year, month + 1, 0);
  const leadingBlankCount = firstDate.getDay();
  const trailingBlankCount = 6 - lastDate.getDay();
  const dayCells = [];

  for (let index = 0; index < leadingBlankCount; index += 1) {
    dayCells.push(null);
  }

  for (let day = 1; day <= lastDate.getDate(); day += 1) {
    dayCells.push(new Date(year, month, day));
  }

  for (let index = 0; index < trailingBlankCount; index += 1) {
    dayCells.push(null);
  }

  return dayCells;
};

const getWeekStart = value => {
  const date = value instanceof Date ? value : new Date(value);
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  return new Date(safeDate.getFullYear(), safeDate.getMonth(), safeDate.getDate() - safeDate.getDay());
};

const getWeekDays = weekStartDate => Array.from(
  { length: 7 },
  (_, index) => new Date(
    weekStartDate.getFullYear(),
    weekStartDate.getMonth(),
    weekStartDate.getDate() + index
  )
);

const isSameDay = (leftDate, rightDate) => (
  leftDate.getFullYear() === rightDate.getFullYear()
  && leftDate.getMonth() === rightDate.getMonth()
  && leftDate.getDate() === rightDate.getDate()
);

const isSelectableRecordDate = date => {
  const today = new Date();
  const dateIndex = getDateKey(date);
  const minDateIndex = getDateKey(RECORD_MIN_MONTH_DATE);
  const todayIndex = getDateKey(today);

  return dateIndex >= minDateIndex && dateIndex <= todayIndex;
};

const formatRecordDateTime = record => recordDateTimeFormatter.format(getRecordDate(record));

const formatRecordDay = date => recordDayFormatter.format(date);

const getDefaultRecordDateForMonth = monthDate => {
  const maxDate = getRecordMaxDate();
  const monthStart = clampRecordMonthDate(monthDate);
  const isMaxMonth = (
    monthStart.getFullYear() === maxDate.getFullYear()
    && monthStart.getMonth() === maxDate.getMonth()
  );

  return isMaxMonth ? clampRecordDate(maxDate) : clampRecordDate(monthStart);
};

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      d="M7 4.75V7.25M17 4.75V7.25M5.75 9.25H18.25M7.25 6H16.75C18.2688 6 19.5 7.23122 19.5 8.75V17.25C19.5 18.7688 18.2688 20 16.75 20H7.25C5.73122 20 4.5 18.7688 4.5 17.25V8.75C4.5 7.23122 5.73122 6 7.25 6Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

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

  const [selectedRecordDate, setSelectedRecordDate] = useState(() => clampRecordDate(new Date()));
  const [selectedMonthDate, setSelectedMonthDate] = useState(() => getMonthStart(clampRecordDate(new Date())));
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [visibleWeekStartDate, setVisibleWeekStartDate] = useState(() => getWeekStart(clampRecordDate(new Date())));
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
  const calendarTouchStartYRef = useRef(null);
  const lastCalendarWheelAtRef = useRef(0);

  const maxMonthDate = getRecordMaxMonthDate();
  const availableYears = getSelectableYears(maxMonthDate);
  const availableMonths = getSelectableMonths(monthPickerYear, maxMonthDate);
  const calendarDays = getCalendarDays(selectedMonthDate);
  const visibleWeekDays = getWeekDays(visibleWeekStartDate);
  const recordsByDate = records.reduce((recordMap, record) => {
    const dateKey = getDateKey(getRecordDate(record));
    const dayRecords = recordMap.get(dateKey) || [];
    dayRecords.push(record);
    recordMap.set(dateKey, dayRecords);
    return recordMap;
  }, new Map());
  const selectedDateRecords = recordsByDate.get(getDateKey(selectedRecordDate)) || [];
  const visibleRecords = showAllRecords
    ? selectedDateRecords
    : selectedDateRecords.slice(0, RECORD_PREVIEW_LIMIT);
  const minWeekStartDate = getWeekStart(RECORD_MIN_MONTH_DATE);
  const maxWeekStartDate = getWeekStart(getRecordMaxDate());
  const canMoveToPreviousWeek = getDateKey(visibleWeekStartDate) > getDateKey(minWeekStartDate);
  const canMoveToNextWeek = getDateKey(visibleWeekStartDate) < getDateKey(maxWeekStartDate);
  const isEditingRecord = Boolean(editingRecordId);

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

  const applySelectedRecordDate = date => {
    const nextDate = clampRecordDate(date);

    setSelectedRecordDate(nextDate);
    setSelectedMonthDate(getMonthStart(nextDate));
    setVisibleWeekStartDate(getWeekStart(nextDate));
    setShowAllRecords(false);

    return nextDate;
  };

  const handleMoveWeek = amount => {
    applySelectedRecordDate(addDays(selectedRecordDate, amount * 7));
  };

  const handleMoveCalendarMonth = amount => {
    const nextMonthDate = clampRecordMonthDate(addMonths(selectedMonthDate, amount));

    if (getMonthIndex(nextMonthDate) === getMonthIndex(selectedMonthDate)) {
      return;
    }

    applySelectedRecordDate(getDefaultRecordDateForMonth(nextMonthDate));
  };

  const handleCalendarWheel = event => {
    if (Math.abs(event.deltaY) < 28) {
      return;
    }

    const now = Date.now();

    if (now - lastCalendarWheelAtRef.current < CALENDAR_WHEEL_COOLDOWN_MS) {
      return;
    }

    lastCalendarWheelAtRef.current = now;
    handleMoveCalendarMonth(event.deltaY > 0 ? 1 : -1);
  };

  const handleCalendarTouchStart = event => {
    calendarTouchStartYRef.current = event.touches?.[0]?.clientY ?? null;
  };

  const handleCalendarTouchEnd = event => {
    const startY = calendarTouchStartYRef.current;
    calendarTouchStartYRef.current = null;

    if (typeof startY !== 'number') {
      return;
    }

    const endY = event.changedTouches?.[0]?.clientY;

    if (typeof endY !== 'number') {
      return;
    }

    const distance = startY - endY;

    if (Math.abs(distance) < CALENDAR_SWIPE_THRESHOLD) {
      return;
    }

    handleMoveCalendarMonth(distance > 0 ? 1 : -1);
  };

  const openMonthPicker = () => {
    const clampedSelectedMonth = clampRecordMonthDate(selectedMonthDate);
    setSelectedMonthDate(clampedSelectedMonth);
    setMonthPickerYear(clampedSelectedMonth.getFullYear());
    setIsMonthPickerOpen(true);
  };

  const handleSelectMonth = (year, month) => {
    applySelectedRecordDate(getDefaultRecordDateForMonth(new Date(year, month, 1)));
    setIsMonthPickerOpen(false);
  };

  const handleSelectRecordDate = (date, { shouldCloseCalendar = false } = {}) => {
    if (!date || !isSelectableRecordDate(date)) {
      return;
    }

    applySelectedRecordDate(date);

    if (shouldCloseCalendar) {
      setIsCalendarOpen(false);
    }
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
      applySelectedRecordDate(new Date());
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
        <section className="records-overview-section records-month-section">
          <div className="records-month-nav" aria-label="기록 주 선택">
            <button
              type="button"
              className="records-month-shift-btn"
              onClick={() => handleMoveWeek(-1)}
              disabled={!canMoveToPreviousWeek}
              aria-label="이전 주 기록 보기"
            >
              &lt;
            </button>
            <div
              className="records-month-display"
              aria-label={`${getMonthLabel(selectedMonthDate)} 기록 주`}
            >
              <strong>{getMonthLabel(selectedMonthDate)}</strong>
            </div>
            <button
              type="button"
              className="records-calendar-open-btn"
              onClick={() => setIsCalendarOpen(true)}
              aria-label={`${getMonthLabel(selectedMonthDate)} 달력 보기`}
            >
              <CalendarIcon />
            </button>
            <button
              type="button"
              className="records-month-shift-btn"
              onClick={() => handleMoveWeek(1)}
              disabled={!canMoveToNextWeek}
              aria-label="다음 주 기록 보기"
            >
              &gt;
            </button>
          </div>

          <div className="record-week-strip" aria-label={`${getMonthLabel(selectedMonthDate)} 주간 기록 달력`}>
            {visibleWeekDays.map(date => {
              const dateKey = getDateKey(date);
              const dayRecords = recordsByDate.get(dateKey) || [];
              const isToday = isSameDay(date, new Date());
              const isSelected = isSameDay(date, selectedRecordDate);
              const isDisabled = !isSelectableRecordDate(date);
              const dayToneClass = getDayToneClass(date);
              const holidayLabel = isPublicHoliday(date) ? ' 공휴일' : '';

              return (
                <button
                  key={dateKey}
                  type="button"
                  className={`record-week-day${dayToneClass}${dayRecords.length > 0 ? ' has-records' : ''}${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}`}
                  onClick={() => handleSelectRecordDate(date)}
                  disabled={isDisabled}
                  aria-label={`${date.getDate()}일${holidayLabel} 기록 ${dayRecords.length}개 보기`}
                >
                  <span>{calendarWeekdayLabels[date.getDay()]}</span>
                  <strong>{date.getDate()}</strong>
                  {dayRecords.length > 0 && <i aria-hidden="true" />}
                </button>
              );
            })}
          </div>

          <div className="records-month-meta">
            <span>
              {selectedDateRecords.length > 0
                ? `${formatRecordDay(selectedRecordDate)} 기록 ${selectedDateRecords.length}개`
                : `${formatRecordDay(selectedRecordDate)} 기록 없음`}
            </span>
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
            <p className="record-section-empty">이 날에는 아직 남긴 기록이 없어요.</p>
          )}

          {selectedDateRecords.length > RECORD_PREVIEW_LIMIT && (
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

      {isCalendarOpen && (
        <div
          className="record-calendar-overlay"
          data-block-pull-refresh="true"
          onClick={() => setIsCalendarOpen(false)}
        >
          <div
            className="record-calendar-modal"
            data-block-pull-refresh="true"
            onWheel={handleCalendarWheel}
            onTouchStart={handleCalendarTouchStart}
            onTouchEnd={handleCalendarTouchEnd}
            onClick={event => event.stopPropagation()}
          >
            <div className="record-calendar-header">
              <div>
                <span>CALENDAR</span>
                <button
                  type="button"
                  className="record-calendar-month-btn"
                  onClick={openMonthPicker}
                  aria-label={`${getMonthLabel(selectedMonthDate)} 선택 변경`}
                >
                  {getMonthLabel(selectedMonthDate)}
                </button>
              </div>
              <button
                type="button"
                className="record-calendar-close"
                onClick={() => setIsCalendarOpen(false)}
                aria-label="달력 닫기"
              >
                &times;
              </button>
            </div>

            <div className="record-calendar-weekdays" aria-hidden="true">
              {calendarWeekdayLabels.map((label, index) => (
                <span
                  key={label}
                  className={index === 0 ? 'sunday' : index === 6 ? 'saturday' : ''}
                >
                  {label}
                </span>
              ))}
            </div>

            <div className="record-calendar-grid" aria-label={`${getMonthLabel(selectedMonthDate)} 날짜 선택`}>
              {calendarDays.map((date, index) => {
                if (!date) {
                  return <span key={`blank-${index}`} className="record-calendar-blank" />;
                }

                const dateKey = getDateKey(date);
                const dayRecords = recordsByDate.get(dateKey) || [];
                const isToday = isSameDay(date, new Date());
                const isSelected = isSameDay(date, selectedRecordDate);
                const isDisabled = !isSelectableRecordDate(date);
                const dayToneClass = getDayToneClass(date);
                const holidayLabel = isPublicHoliday(date) ? ' 공휴일' : '';

                return (
                  <button
                    key={dateKey}
                    type="button"
                    className={`record-calendar-day${dayToneClass}${dayRecords.length > 0 ? ' has-records' : ''}${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}`}
                    onClick={() => handleSelectRecordDate(date, { shouldCloseCalendar: true })}
                    disabled={isDisabled}
                    aria-label={`${date.getDate()}일${holidayLabel} 기록 ${dayRecords.length}개 보기`}
                  >
                    <span>{date.getDate()}</span>
                  </button>
                );
              })}
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
