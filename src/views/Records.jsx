import React, { lazy, useCallback, useRef, useState } from 'react';
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
import { HAPPINESS_TAG_GROUPS, MAX_RECORD_TAGS } from '../lib/happinessTags';
import { shareTextContent } from '../lib/share';
import { useHappy } from '../store/HappyContext';
import './Records.css';

const loadHappinessDetailModal = () => import('../components/HappinessDetailModal');
const HappinessDetailModal = lazy(loadHappinessDetailModal);

const FREE_RECORD_IMAGE_ITEM_ID = 'free-records';
const RECORD_PREVIEW_LIMIT = 3;
const RECORD_MIN_MONTH_DATE = new Date(2026, 0, 1);

const recordDateTimeFormatter = new Intl.DateTimeFormat('ko-KR', {
  hour: '2-digit',
  minute: '2-digit'
});

const calendarPreviewDateFormatter = new Intl.DateTimeFormat('ko-KR', {
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

  return normalizedContent.replace(/\s+/g, ' ');
};

const getRecordDetailContent = content => {
  const normalizedContent = typeof content === 'string' ? content.trim() : '';

  return normalizedContent || '사진으로 남긴 기록';
};

const getShareFeedbackMessage = result => {
  if (result?.success) {
    return result.method === 'clipboard'
      ? '공유할 내용을 복사했어요.'
      : '공유를 열었어요.';
  }

  if (result?.code === 'CANCELLED') {
    return '';
  }

  return '공유하지 못했어요. 잠시 후 다시 시도해주세요.';
};

const getRecordShareText = record => {
  const tagText = Array.isArray(record?.tags) && record.tags.length > 0
    ? `태그: ${record.tags.join(', ')}`
    : '';

  return [
    getRecordDetailContent(record?.content),
    tagText,
    'Happy Finder'
  ]
    .filter(value => typeof value === 'string' && value.trim())
    .join('\n');
};

const getRecordTitle = record => {
  const normalizedTitle = typeof record?.title === 'string' ? record.title.trim() : '';

  if (normalizedTitle) {
    return normalizedTitle;
  }

  return '제목 없는 기록';
};

const getTimelineEntryTitle = record => {
  if (record?.sourceType === 'list') {
    return record.itemTitle || '삭제된 행복';
  }

  return getRecordTitle(record);
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

const getWeekDisplayDate = (weekStartDate, selectedDate) => {
  const preferredDate = addDays(weekStartDate, selectedDate.getDay());

  if (isSelectableRecordDate(preferredDate)) {
    return preferredDate;
  }

  return getWeekDays(weekStartDate).find(isSelectableRecordDate) || clampRecordDate(preferredDate);
};

const formatRecordDateTime = record => recordDateTimeFormatter.format(getRecordDate(record));

const formatCalendarPreviewDate = date => calendarPreviewDateFormatter.format(date);

const getDefaultCalendarPreviewDate = monthDate => {
  const maxDate = getRecordMaxDate();
  const monthStart = clampRecordMonthDate(monthDate);
  const isMaxMonth = (
    monthStart.getFullYear() === maxDate.getFullYear()
    && monthStart.getMonth() === maxDate.getMonth()
  );

  return isMaxMonth ? clampRecordDate(maxDate) : clampRecordDate(monthStart);
};

const isCalendarPreviewEvent = event => Boolean(
  event.target?.closest?.('.record-calendar-preview')
);

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

const WriteIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      d="M5.25 18.75H18.75"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.8"
    />
    <path
      d="M6.3 15.55L7.05 12.25L15.85 3.45C16.45 2.85 17.42 2.85 18.02 3.45L20.55 5.98C21.15 6.58 21.15 7.55 20.55 8.15L11.75 16.95L8.45 17.7C7.12 18 6 16.88 6.3 15.55Z"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
    <path
      d="M14.65 4.65L19.35 9.35"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.8"
    />
  </svg>
);

const EditIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      d="M4.75 18.75L8 18.05L18.15 7.9C18.85 7.2 18.85 6.05 18.15 5.35C17.45 4.65 16.3 4.65 15.6 5.35L5.45 15.5L4.75 18.75Z"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
    <path
      d="M14.55 6.4L17.1 8.95"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.8"
    />
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      d="M6.4 8.15H17.6M9.7 5.65H14.3M10.35 5.65L10.85 4.45H13.15L13.65 5.65M8.35 8.15L8.9 18.05C8.95 18.88 9.64 19.52 10.48 19.52H13.52C14.36 19.52 15.05 18.88 15.1 18.05L15.65 8.15M10.65 11.2V16.2M13.35 11.2V16.2"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.45"
    />
  </svg>
);

const ShareIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      d="M4.75 12.1L19.25 5.25L16.2 18.75L12.2 13.5L8.9 16.65L9.45 12.65L4.75 12.1Z"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
    />
    <path
      d="M9.45 12.65L19.25 5.25"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
    />
  </svg>
);

const TagIcon = () => (
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

const RecordTagList = ({ tags = [] }) => {
  if (!Array.isArray(tags) || tags.length === 0) {
    return null;
  }

  return (
    <div className="record-tag-list" aria-label="태그">
      {tags.map(tag => (
        <span key={tag}>{tag}</span>
      ))}
    </div>
  );
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
    getFreeRecords,
    getAllRecords,
    addFreeRecord,
    updateFreeRecord,
    deleteFreeRecord,
    authUser,
    isReviewAuthUser
  } = useHappy();

  const records = getFreeRecords()
    .sort((leftRecord, rightRecord) => getRecordDateValue(rightRecord) - getRecordDateValue(leftRecord));
  const happinessMemoRecords = getAllRecords()
    .filter(record => record.sourceType === 'list')
    .sort((leftRecord, rightRecord) => getRecordDateValue(rightRecord) - getRecordDateValue(leftRecord));
  const isImageEnabled = isNativeMemoImageAvailable();
  const cloudAuthUserId = authUser?.id && !isReviewAuthUser ? authUser.id : null;

  const [selectedRecordDate, setSelectedRecordDate] = useState(() => clampRecordDate(new Date()));
  const [calendarMonthDate, setCalendarMonthDate] = useState(() => getMonthStart(clampRecordDate(new Date())));
  const [calendarPreviewDate, setCalendarPreviewDate] = useState(() => clampRecordDate(new Date()));
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [visibleWeekStartDate, setVisibleWeekStartDate] = useState(() => getWeekStart(clampRecordDate(new Date())));
  const [monthPickerYear, setMonthPickerYear] = useState(() => clampRecordMonthDate(new Date()).getFullYear());
  const [draftRecordId, setDraftRecordId] = useState(() => createDraftRecordId());
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [recordTitle, setRecordTitle] = useState('');
  const [recordText, setRecordText] = useState('');
  const [recordImages, setRecordImages] = useState([]);
  const [recordTags, setRecordTags] = useState([]);
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [activeRecordId, setActiveRecordId] = useState(null);
  const [activeMemoItem, setActiveMemoItem] = useState(null);
  const [activeMemoFocusId, setActiveMemoFocusId] = useState('');
  const [activeRecordsTab, setActiveRecordsTab] = useState('records');
  const [showAllRecords, setShowAllRecords] = useState(false);
  const [isTagPickerOpen, setIsTagPickerOpen] = useState(false);
  const [tagFeedback, setTagFeedback] = useState('');
  const [imageFeedback, setImageFeedback] = useState('');
  const [imageBusyTarget, setImageBusyTarget] = useState('');
  const [recordShareFeedback, setRecordShareFeedback] = useState({
    type: 'idle',
    message: ''
  });
  const [isSharingRecord, setIsSharingRecord] = useState(false);
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
  const visibleWeekDays = getWeekDays(visibleWeekStartDate);
  const visibleWeekMonthDate = getMonthStart(getWeekDisplayDate(visibleWeekStartDate, selectedRecordDate));
  const calendarDays = getCalendarDays(calendarMonthDate);
  const activeTimelineRecords = activeRecordsTab === 'memos' ? happinessMemoRecords : records;
  const activeTabLabel = activeRecordsTab === 'memos' ? '행복 메모' : '기록';
  const recordsByDate = activeTimelineRecords.reduce((recordMap, record) => {
    const dateKey = getDateKey(getRecordDate(record));
    const dayRecords = recordMap.get(dateKey) || [];
    dayRecords.push(record);
    recordMap.set(dateKey, dayRecords);
    return recordMap;
  }, new Map());
  const selectedDateRecords = recordsByDate.get(getDateKey(selectedRecordDate)) || [];
  const calendarPreviewRecords = recordsByDate.get(getDateKey(calendarPreviewDate)) || [];
  const visibleRecords = showAllRecords
    ? selectedDateRecords
    : selectedDateRecords.slice(0, RECORD_PREVIEW_LIMIT);
  const minWeekStartDate = getWeekStart(RECORD_MIN_MONTH_DATE);
  const maxWeekStartDate = getWeekStart(getRecordMaxDate());
  const canMoveToPreviousWeek = getDateKey(visibleWeekStartDate) > getDateKey(minWeekStartDate);
  const canMoveToNextWeek = getDateKey(visibleWeekStartDate) < getDateKey(maxWeekStartDate);
  const canMoveToPreviousCalendarMonth = getMonthIndex(calendarMonthDate) > getMonthIndex(RECORD_MIN_MONTH_DATE);
  const canMoveToNextCalendarMonth = getMonthIndex(calendarMonthDate) < getMonthIndex(maxMonthDate);
  const activeRecord = activeRecordId ? records.find(record => record.id === activeRecordId) : null;
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
    setRecordTitle('');
    setRecordText('');
    setRecordImages([]);
    setRecordTags([]);
    setDraftRecordId(createDraftRecordId());
    setIsTagPickerOpen(false);
    setTagFeedback('');
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
    setRecordTitle(record.title || '');
    setRecordText(record.content);
    setRecordImages(Array.isArray(record.images) ? record.images : []);
    setRecordTags(Array.isArray(record.tags) ? record.tags : []);
    setActiveRecordId(null);
    setRecordShareFeedback({
      type: 'idle',
      message: ''
    });
    setIsSharingRecord(false);
    setIsComposerOpen(true);
  };

  const openRecordDetail = record => {
    if (!record?.id) {
      return;
    }

    setActiveRecordId(record.id);
    setRecordShareFeedback({
      type: 'idle',
      message: ''
    });
    setIsSharingRecord(false);
    setActiveMemoItem(null);
    setActiveMemoFocusId('');
  };

  const openTimelineEntry = record => {
    if (record?.sourceType === 'list') {
      setActiveRecordId(null);
      if (record.item) {
        setActiveMemoFocusId(record.id);
        setActiveMemoItem(record.item);
      }
      return;
    }

    openRecordDetail(record);
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

  const openCalendar = () => {
    const nextPreviewDate = getWeekDisplayDate(visibleWeekStartDate, selectedRecordDate);

    setCalendarMonthDate(visibleWeekMonthDate);
    setCalendarPreviewDate(nextPreviewDate);
    setIsCalendarOpen(true);
  };

  const applySelectedRecordDate = date => {
    const nextDate = clampRecordDate(date);

    setSelectedRecordDate(nextDate);
    setVisibleWeekStartDate(getWeekStart(nextDate));
    setShowAllRecords(false);

    return nextDate;
  };

  const handleMoveWeek = amount => {
    const nextWeekStartDate = getWeekStart(addDays(visibleWeekStartDate, amount * 7));

    if (
      getDateKey(nextWeekStartDate) < getDateKey(minWeekStartDate)
      || getDateKey(nextWeekStartDate) > getDateKey(maxWeekStartDate)
    ) {
      return;
    }

    setVisibleWeekStartDate(nextWeekStartDate);
  };

  const handleMoveCalendarMonth = amount => {
    const nextMonthDate = clampRecordMonthDate(addMonths(calendarMonthDate, amount));

    if (getMonthIndex(nextMonthDate) === getMonthIndex(calendarMonthDate)) {
      return;
    }

    setCalendarMonthDate(nextMonthDate);
    setCalendarPreviewDate(getDefaultCalendarPreviewDate(nextMonthDate));
    setMonthPickerYear(nextMonthDate.getFullYear());
  };

  const handleCalendarWheel = event => {
    if (isCalendarPreviewEvent(event)) {
      return;
    }

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
    if (isCalendarPreviewEvent(event)) {
      calendarTouchStartYRef.current = null;
      return;
    }

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
    const clampedSelectedMonth = clampRecordMonthDate(calendarMonthDate);
    setCalendarMonthDate(clampedSelectedMonth);
    setMonthPickerYear(clampedSelectedMonth.getFullYear());
    setIsMonthPickerOpen(true);
  };

  const handleChangeMonthPickerYear = event => {
    const nextYear = Number(event.target.value);
    const selectableMonths = getSelectableMonths(nextYear, maxMonthDate);
    const currentMonth = calendarMonthDate.getMonth();
    const nextMonth = selectableMonths.includes(currentMonth)
      ? currentMonth
      : selectableMonths[selectableMonths.length - 1];
    const nextMonthDate = clampRecordMonthDate(new Date(nextYear, nextMonth, 1));

    setMonthPickerYear(nextMonthDate.getFullYear());
    setCalendarMonthDate(nextMonthDate);
    setCalendarPreviewDate(getDefaultCalendarPreviewDate(nextMonthDate));
  };

  const handleChangeMonthPickerMonth = event => {
    const nextMonthDate = clampRecordMonthDate(new Date(monthPickerYear, Number(event.target.value), 1));

    setMonthPickerYear(nextMonthDate.getFullYear());
    setCalendarMonthDate(nextMonthDate);
    setCalendarPreviewDate(getDefaultCalendarPreviewDate(nextMonthDate));
  };

  const handleSelectRecordDate = (date, { shouldCloseCalendar = false } = {}) => {
    if (!date || !isSelectableRecordDate(date)) {
      return;
    }

    const nextDate = applySelectedRecordDate(date);
    setCalendarMonthDate(getMonthStart(nextDate));

    if (shouldCloseCalendar) {
      setIsCalendarOpen(false);
    }
  };

  const handlePreviewCalendarDate = date => {
    if (!date || !isSelectableRecordDate(date)) {
      return;
    }

    setCalendarPreviewDate(clampRecordDate(date));
  };

  const handleUseCalendarPreviewDate = () => {
    handleSelectRecordDate(calendarPreviewDate, { shouldCloseCalendar: true });
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

  const handleToggleRecordTag = tag => {
    setRecordTags(prevTags => {
      if (prevTags.includes(tag)) {
        setTagFeedback('');
        return prevTags.filter(savedTag => savedTag !== tag);
      }

      if (prevTags.length >= MAX_RECORD_TAGS) {
        setTagFeedback(`태그는 최대 ${MAX_RECORD_TAGS}개까지 선택할 수 있어요.`);
        return prevTags;
      }

      setTagFeedback('');
      return [...prevTags, tag];
    });
  };

  const handleSaveRecord = () => {
    const savedRecord = editingRecordId
      ? updateFreeRecord(editingRecordId, recordText, recordImages, { title: recordTitle, tags: recordTags })
      : addFreeRecord(recordText, recordImages, { id: draftRecordId, title: recordTitle, tags: recordTags });

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

    if (activeRecordId === record.id) {
      closeRecordDetail();
    }

    deleteFreeRecord(record.id);
  };

  const closeRecordDetail = () => {
    setActiveRecordId(null);
    setRecordShareFeedback({
      type: 'idle',
      message: ''
    });
    setIsSharingRecord(false);
  };

  const handleShareActiveRecord = async () => {
    if (!activeRecord || isSharingRecord) {
      return;
    }

    setIsSharingRecord(true);
    setRecordShareFeedback({
      type: 'idle',
      message: ''
    });

    const result = await shareTextContent({
      title: getRecordTitle(activeRecord),
      text: getRecordShareText(activeRecord)
    });
    const message = getShareFeedbackMessage(result);

    setIsSharingRecord(false);
    setRecordShareFeedback({
      type: result?.success ? 'success' : 'error',
      message
    });
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
            <div className="records-heading-tabs" role="tablist" aria-label="기록 탭">
              <button
                type="button"
                className={`records-heading-tab ${activeRecordsTab === 'records' ? 'active' : ''}`}
                role="tab"
                aria-selected={activeRecordsTab === 'records'}
                onClick={() => {
                  setActiveRecordsTab('records');
                  setShowAllRecords(false);
                }}
              >
                기록
              </button>
              <button
                type="button"
                className={`records-heading-tab ${activeRecordsTab === 'memos' ? 'active' : ''}`}
                role="tab"
                aria-selected={activeRecordsTab === 'memos'}
                onClick={() => {
                  setActiveRecordsTab('memos');
                  setShowAllRecords(false);
                }}
              >
                행복 메모
              </button>
            </div>
            <p>
              {activeRecordsTab === 'memos'
                ? '행복 리스트에 남긴 메모를 모아보세요.'
                : '지금 행복한 감정을 기록해 보세요.'}
            </p>
          </div>
          {activeRecordsTab === 'records' && (
            <button type="button" className="records-write-btn" onClick={openCreateComposer}>
              <WriteIcon />
              <span>기록 남기기</span>
            </button>
          )}
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
              aria-label={`${getMonthLabel(visibleWeekMonthDate)} 기록 주`}
            >
              <strong>{getMonthLabel(visibleWeekMonthDate)}</strong>
            </div>
            <button
              type="button"
              className="records-calendar-open-btn"
              onClick={openCalendar}
              aria-label={`${getMonthLabel(visibleWeekMonthDate)} 달력 보기`}
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

          <div className="record-week-strip" aria-label={`${getMonthLabel(visibleWeekMonthDate)} 주간 ${activeTabLabel} 달력`}>
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
                  aria-label={`${date.getDate()}일${holidayLabel} ${activeTabLabel} ${dayRecords.length}개 보기`}
                >
                  <span>{calendarWeekdayLabels[date.getDay()]}</span>
                  <strong>{date.getDate()}</strong>
                  {dayRecords.length > 0 && <i aria-hidden="true" />}
                </button>
              );
            })}
          </div>

          {visibleRecords.length > 0 ? (
            <div className="record-preview-list">
              {visibleRecords.map(record => (
                <article key={record.recordKey || record.id} className="record-preview-row">
                  <button
                    type="button"
                    className="record-preview-open"
                    onClick={() => openTimelineEntry(record)}
                    aria-label={`${getTimelineEntryTitle(record)} ${activeTabLabel} 전체 보기`}
                  >
                    <div className="record-preview-content">
                      <time>{formatRecordDateTime(record)}</time>
                      <h3>{getTimelineEntryTitle(record)}</h3>
                      <p>{getRecordSnippet(record.content)}</p>
                      <RecordTagList tags={record.tags} />
                    </div>
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <p className="record-section-empty">
              {activeRecordsTab === 'memos'
                ? '이 날에는 아직 남긴 행복 메모가 없어요.'
                : '이 날에는 아직 남긴 기록이 없어요.'}
            </p>
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

            <div className="record-month-picker-wheel" aria-label="연도와 월 스크롤 선택">
              <label>
                <span>연도</span>
                <select
                  value={monthPickerYear}
                  onChange={handleChangeMonthPickerYear}
                  size={Math.min(availableYears.length, 5)}
                  aria-label="연도 선택"
                >
                  {availableYears.map(year => (
                    <option key={year} value={year}>
                      {year}년
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>월</span>
                <select
                  value={calendarMonthDate.getMonth()}
                  onChange={handleChangeMonthPickerMonth}
                  size={Math.min(availableMonths.length, 5)}
                  aria-label="월 선택"
                >
                  {availableMonths.map(month => (
                    <option key={month} value={month}>
                      {month + 1}월
                    </option>
                  ))}
                </select>
              </label>
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
              <div className="record-calendar-month-nav">
                <button
                  type="button"
                  className="record-calendar-shift-btn"
                  onClick={() => handleMoveCalendarMonth(-1)}
                  disabled={!canMoveToPreviousCalendarMonth}
                  aria-label="이전 달 보기"
                >
                  &lt;
                </button>
                <button
                  type="button"
                  className="record-calendar-month-btn"
                  onClick={openMonthPicker}
                  aria-label={`${getMonthLabel(calendarMonthDate)} 선택 변경`}
                >
                  {getMonthLabel(calendarMonthDate)}
                </button>
                <button
                  type="button"
                  className="record-calendar-shift-btn"
                  onClick={() => handleMoveCalendarMonth(1)}
                  disabled={!canMoveToNextCalendarMonth}
                  aria-label="다음 달 보기"
                >
                  &gt;
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

            <div className="record-calendar-grid" aria-label={`${getMonthLabel(calendarMonthDate)} 날짜 선택`}>
              {calendarDays.map((date, index) => {
                if (!date) {
                  return <span key={`blank-${index}`} className="record-calendar-blank" />;
                }

                const dateKey = getDateKey(date);
                const dayRecords = recordsByDate.get(dateKey) || [];
                const isToday = isSameDay(date, new Date());
                const isSelected = isSameDay(date, calendarPreviewDate);
                const isDisabled = !isSelectableRecordDate(date);
                const dayToneClass = getDayToneClass(date);
                const holidayLabel = isPublicHoliday(date) ? ' 공휴일' : '';

                return (
                  <button
                    key={dateKey}
                    type="button"
                    className={`record-calendar-day${dayToneClass}${dayRecords.length > 0 ? ' has-records' : ''}${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}`}
                    onClick={() => handlePreviewCalendarDate(date)}
                    disabled={isDisabled}
                    aria-label={`${date.getDate()}일${holidayLabel} ${activeTabLabel} ${dayRecords.length}개 보기`}
                  >
                    <span>{date.getDate()}</span>
                  </button>
                );
              })}
            </div>

            <section className="record-calendar-preview" aria-label={`${formatCalendarPreviewDate(calendarPreviewDate)} ${activeTabLabel} 미리보기`}>
              <div className="record-calendar-preview-head">
                <div>
                  <strong>{formatCalendarPreviewDate(calendarPreviewDate)} {activeTabLabel}</strong>
                  <span>
                    {calendarPreviewRecords.length > 0
                      ? `${calendarPreviewRecords.length}개`
                      : `${activeTabLabel} 없음`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleUseCalendarPreviewDate}
                >
                  이 날짜 보기
                </button>
              </div>

              {calendarPreviewRecords.length > 0 ? (
                <div className="record-calendar-preview-list">
                  {calendarPreviewRecords.map(record => (
                    <button
                      key={record.recordKey || record.id}
                      type="button"
                      className="record-calendar-preview-row"
                      onClick={() => openTimelineEntry(record)}
                      aria-label={`${getTimelineEntryTitle(record)} ${activeTabLabel} 전체 보기`}
                    >
                      <time>{formatRecordDateTime(record)}</time>
                      <strong>{getTimelineEntryTitle(record)}</strong>
                      <p>{getRecordSnippet(record.content)}</p>
                      <RecordTagList tags={record.tags} />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="record-calendar-preview-empty">
                  {activeRecordsTab === 'memos'
                    ? '행복 메모가 없습니다.'
                    : '기록이 없습니다.'}
                </p>
              )}
            </section>
          </div>
        </div>
      )}

      {activeRecord && (
        <div
          className="record-detail-overlay"
          data-block-pull-refresh="true"
          onClick={closeRecordDetail}
        >
          <div
            className="record-detail-modal"
            data-block-pull-refresh="true"
            onClick={event => event.stopPropagation()}
          >
            <div className="record-detail-header">
              <div>
                <time>{formatRecordDateTime(activeRecord)}</time>
                <h3>{getRecordTitle(activeRecord)}</h3>
              </div>
              <div className="record-detail-actions">
                <button
                  type="button"
                  className="record-detail-share"
                  onClick={handleShareActiveRecord}
                  disabled={isSharingRecord}
                  aria-label="share"
                >
                  <ShareIcon />
                </button>
                <button
                  type="button"
                  onClick={() => openEditComposer(activeRecord)}
                  aria-label="기록 수정"
                >
                  <EditIcon />
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={() => handleDeleteRecord(activeRecord)}
                  aria-label="기록 삭제"
                >
                  <TrashIcon />
                </button>
                <button
                  type="button"
                  className="record-detail-close"
                  onClick={closeRecordDetail}
                  aria-label="기록 상세 닫기"
                >
                  &times;
                </button>
              </div>
            </div>

            <p className="record-detail-content">{getRecordDetailContent(activeRecord.content)}</p>
            <RecordTagList tags={activeRecord.tags} />

            {recordShareFeedback.message && (
              <div className={`record-detail-share-feedback ${recordShareFeedback.type === 'error' ? 'error' : 'success'}`}>
                {recordShareFeedback.message}
              </div>
            )}

            {activeRecord.images.length > 0 && (
              <RecordImageStrip images={activeRecord.images} onOpen={openImage} />
            )}
          </div>
        </div>
      )}

      {activeMemoItem && (
        <LazyLoadBoundary
          mode="overlay"
          loadingLabel="행복 메모를 불러오는 중이에요."
          errorTitle="행복 메모를 열지 못했어요."
          errorMessage="잠시 후 다시 시도해주세요."
          onDismiss={() => {
            setActiveMemoItem(null);
            setActiveMemoFocusId('');
          }}
          resetKey={`record-memo-${activeMemoItem.id}-${activeMemoFocusId || 'all'}`}
        >
          <HappinessDetailModal
            item={activeMemoItem}
            isOpen={Boolean(activeMemoItem)}
            onClose={() => {
              setActiveMemoItem(null);
              setActiveMemoFocusId('');
            }}
            canDelete={false}
            autoOpenMemoComposer={false}
            focusMemoId={activeMemoFocusId}
          />
        </LazyLoadBoundary>
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

            <input
              className="record-note-title-input"
              value={recordTitle}
              onChange={event => setRecordTitle(event.target.value)}
              placeholder="제목"
              maxLength={48}
              autoFocus
            />

            <textarea
              value={recordText}
              onChange={event => setRecordText(event.target.value)}
              placeholder="짧은 한 줄도 좋고, 길게 쓰는 일기도 좋아요."
              rows={9}
              maxLength={1600}
            />

            <RecordImageStrip
              images={recordImages}
              onRemove={handleRemoveComposerImage}
              onOpen={openImage}
            />

            {imageFeedback && <p className="records-image-feedback">{imageFeedback}</p>}

            <div className="record-note-footer">
              <div className="records-photo-actions">
                {isImageEnabled && (
                  <>
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
                  </>
                )}
                <button
                  type="button"
                  className="records-tag-action"
                  onClick={() => setIsTagPickerOpen(true)}
                  aria-label={`태그 선택 ${recordTags.length}개`}
                >
                  <TagIcon />
                  <span>태그 {recordTags.length > 0 ? recordTags.length : ''}</span>
                </button>
              </div>

              <RecordTagList tags={recordTags} />

              <button
                type="button"
                className="btn-primary record-note-save"
                onClick={handleSaveRecord}
                disabled={!recordTitle.trim() && !recordText.trim() && recordImages.length === 0}
              >
                {isEditingRecord ? '기록 수정하기' : '기록 저장하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isTagPickerOpen && (
        <div
          className="record-tag-picker-overlay"
          data-block-pull-refresh="true"
          onClick={() => setIsTagPickerOpen(false)}
        >
          <div
            className="record-tag-picker-modal"
            data-block-pull-refresh="true"
            onClick={event => event.stopPropagation()}
          >
            <div className="record-tag-picker-header">
              <div>
                <span>TAG</span>
                <h3>태그 선택</h3>
                <p>{recordTags.length}/{MAX_RECORD_TAGS}개 선택</p>
              </div>
              <button
                type="button"
                className="record-tag-picker-close"
                onClick={() => setIsTagPickerOpen(false)}
                aria-label="태그 선택 닫기"
              >
                &times;
              </button>
            </div>

            <div className="record-tag-picker-groups">
              {HAPPINESS_TAG_GROUPS.map(group => (
                <section key={group.label} className="record-tag-picker-group">
                  <strong>{group.label}</strong>
                  <div className="record-tag-options">
                    {group.tags.map(tag => {
                      const isChecked = recordTags.includes(tag);
                      const isDisabled = !isChecked && recordTags.length >= MAX_RECORD_TAGS;

                      return (
                        <label key={tag} className={`record-tag-option ${isChecked ? 'checked' : ''} ${isDisabled ? 'disabled' : ''}`}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isDisabled}
                            onChange={() => handleToggleRecordTag(tag)}
                          />
                          <span>{tag}</span>
                        </label>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>

            {tagFeedback && <p className="record-tag-feedback">{tagFeedback}</p>}

            <button
              type="button"
              className="btn-primary record-tag-picker-done"
              onClick={() => setIsTagPickerOpen(false)}
            >
              선택 완료
            </button>
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
