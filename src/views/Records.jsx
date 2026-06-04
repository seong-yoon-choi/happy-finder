import React, { lazy, useCallback, useState } from 'react';
import LazyLoadBoundary from '../components/LazyLoadBoundary';
import ShareOptionsModal from '../components/ShareOptionsModal';
import ImageAdjustModal from '../components/ImageAdjustModal';
import useModalBackNavigation from '../hooks/useModalBackNavigation';
import {
  chooseMemoPhoto,
  createMemoImageMediaResultFromDataUrl,
  deleteMemoStoredImages,
  getMemoImageDataUrlFromMediaResult,
  getMemoImageSrc,
  isNativeMemoImageAvailable,
  MEMO_IMAGE_MAX_COUNT,
  persistMemoImage,
  saveMemoImageToGallery,
  takeMemoPhoto
} from '../lib/memoImages';
import { supabase } from '../lib/supabase';
import { APP_PATH, getPublicWebUrl } from '../lib/routes';
import { useHappy } from '../store/HappyContext';
import './Records.css';

const loadHappinessDetailModal = () => import('../components/HappinessDetailModal');
const HappinessDetailModal = lazy(loadHappinessDetailModal);

const FREE_RECORD_IMAGE_ITEM_ID = 'free-records';
const RECORD_MIN_MONTH_DATE = new Date(2026, 0, 1);
const RECORD_VIEW_MODES = [
  { value: 'day', label: '일' },
  { value: 'month', label: '월' },
  { value: 'all', label: '모두' }
];

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
      return '카메라 권한이 필요해요. 설정에서 권한을 허용해 주세요.';
    case 'PHOTO_PERMISSION_DENIED':
      return '사진 접근 권한이 필요해요. 설정에서 권한을 허용해 주세요.';
    case 'PHOTO_PICK_CANCELLED':
    case 'OS-PLUG-CAMR-0006':
      return '';
    case 'IMAGE_LIMIT_REACHED':
      return `사진은 기록 하나에 최대 ${MEMO_IMAGE_MAX_COUNT}장까지 첨부할 수 있어요.`;
    case 'SAVE_TO_GALLERY_FAILED':
    case 'accessDenied':
      return '사진을 앨범에 저장하지 못했어요.';
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
    if (result.method === 'twitter') {
      return '공유 작성창을 열었어요.';
    }

    return result.method === 'clipboard'
      ? '복사했어요.'
      : '공유를 열었어요.';
  }

  if (result?.code === 'CANCELLED') {
    return '';
  }

  return '공유하지 못했어요. 링크 복사를 사용해 주세요.';
};

const getRecordShareText = record => {
  return [
    getRecordDetailContent(record?.content),
    'Happy Finder'
  ]
    .filter(value => typeof value === 'string' && value.trim())
    .join('\n');
};

const moveImageById = (images, sourceId, targetId) => {
  if (!sourceId || !targetId || sourceId === targetId) {
    return images;
  }

  const sourceIndex = images.findIndex(image => image.id === sourceId);
  const targetIndex = images.findIndex(image => image.id === targetId);

  if (sourceIndex < 0 || targetIndex < 0) {
    return images;
  }

  const nextImages = [...images];
  const [sourceImage] = nextImages.splice(sourceIndex, 1);
  nextImages.splice(targetIndex, 0, sourceImage);
  return nextImages;
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
      d="M8.05 8.35H15.95L15.45 18.05C15.4 19 14.62 19.75 13.67 19.75H10.33C9.38 19.75 8.6 19 8.55 18.05L8.05 8.35Z"
      fill="currentColor"
      opacity="0.18"
    />
    <path
      d="M6.25 8.35H17.75M9.45 5.95H14.55M10.05 5.95L10.62 4.55H13.38L13.95 5.95M8.05 8.35L8.55 18.05C8.6 19 9.38 19.75 10.33 19.75H13.67C14.62 19.75 15.4 19 15.45 18.05L15.95 8.35M10.65 11.25V16.45M13.35 11.25V16.45"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.15"
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

const RecordPreviewThumb = ({ images = [] }) => {
  const previewImage = Array.isArray(images) ? images[0] : null;
  const [src, setSrc] = useState('');

  React.useEffect(() => {
    let isMounted = true;

    const loadImage = async () => {
      if (!previewImage) {
        setSrc('');
        return;
      }

      const nextSrc = await getMemoImageSrc({
        image: previewImage,
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
  }, [previewImage]);

  if (!previewImage) {
    return null;
  }

  return (
    <div className="record-preview-thumb" aria-hidden="true">
      {src ? <img src={src} alt="" loading="lazy" /> : <span />}
    </div>
  );
};

const RecordImageThumb = ({ image, onRemove, onOpen, onReorder }) => {
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
    <div
      className={`record-image-thumb ${onReorder ? 'is-reorderable' : ''}`}
      draggable={Boolean(onReorder)}
      data-image-id={image.id}
      onDragStart={event => {
        if (!onReorder) {
          return;
        }

        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', image.id);
      }}
      onDragOver={event => {
        if (!onReorder) {
          return;
        }

        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      }}
      onDrop={event => {
        if (!onReorder) {
          return;
        }

        event.preventDefault();
        onReorder(event.dataTransfer.getData('text/plain'), image.id);
      }}
    >
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

const RecordImageStrip = ({ images = [], onRemove, onOpen, onReorder }) => {
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
          onReorder={onReorder}
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
  const [pendingImageEdit, setPendingImageEdit] = useState(null);
  const [isApplyingImageEdit, setIsApplyingImageEdit] = useState(false);
  const [recordValidation, setRecordValidation] = useState({
    title: false,
    content: false,
    pulse: 0
  });
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [activeRecordId, setActiveRecordId] = useState(null);
  const [activeMemoItem, setActiveMemoItem] = useState(null);
  const [activeMemoFocusId, setActiveMemoFocusId] = useState('');
  const [activeRecordsTab, setActiveRecordsTab] = useState('records');
  const [recordViewMode, setRecordViewMode] = useState('day');
  const [imageFeedback, setImageFeedback] = useState('');
  const [imageBusyTarget, setImageBusyTarget] = useState('');
  const [recordShareFeedback, setRecordShareFeedback] = useState({
    type: 'idle',
    message: ''
  });
  const [isSharingRecord, setIsSharingRecord] = useState(false);
  const [isRecordShareOptionsOpen, setIsRecordShareOptionsOpen] = useState(false);
  const [activeImage, setActiveImage] = useState(null);
  const [deleteRecordTarget, setDeleteRecordTarget] = useState(null);
  const [gallerySaveState, setGallerySaveState] = useState({
    isSaving: false,
    message: ''
  });

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
  const selectedMonthRecords = activeTimelineRecords.filter(record => (
    getMonthIndex(getMonthStart(getRecordDate(record))) === getMonthIndex(calendarMonthDate)
  ));
  const visibleRecords = recordViewMode === 'day'
    ? selectedDateRecords
    : recordViewMode === 'month'
      ? selectedMonthRecords
      : activeTimelineRecords;
  const minWeekStartDate = getWeekStart(RECORD_MIN_MONTH_DATE);
  const maxWeekStartDate = getWeekStart(getRecordMaxDate());
  const canMoveToPreviousWeek = getDateKey(visibleWeekStartDate) > getDateKey(minWeekStartDate);
  const canMoveToNextWeek = getDateKey(visibleWeekStartDate) < getDateKey(maxWeekStartDate);
  const canMoveToPreviousMonth = getMonthIndex(calendarMonthDate) > getMonthIndex(RECORD_MIN_MONTH_DATE);
  const canMoveToNextMonth = getMonthIndex(calendarMonthDate) < getMonthIndex(maxMonthDate);
  const canMoveToPreviousCalendarMonth = getMonthIndex(calendarMonthDate) > getMonthIndex(RECORD_MIN_MONTH_DATE);
  const canMoveToNextCalendarMonth = getMonthIndex(calendarMonthDate) < getMonthIndex(maxMonthDate);
  const activeRecord = activeRecordId ? records.find(record => record.id === activeRecordId) : null;
  const isEditingRecord = Boolean(editingRecordId);
  const emptyTimelineMessage = activeRecordsTab === 'memos'
    ? recordViewMode === 'day'
      ? '이 날에는 아직 남긴 행복 메모가 없어요.'
      : recordViewMode === 'month'
        ? '이 달에는 아직 남긴 행복 메모가 없어요.'
        : '아직 남긴 행복 메모가 없어요.'
    : recordViewMode === 'day'
      ? '이 날에는 아직 남긴 기록이 없어요.'
      : recordViewMode === 'month'
        ? '이 달에는 아직 남긴 기록이 없어요.'
        : '아직 남긴 기록이 없어요.';

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
    setPendingImageEdit(null);
    setIsApplyingImageEdit(false);
    setRecordValidation({ title: false, content: false, pulse: 0 });
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
    setRecordTitle(record.title || '');
    setRecordText(record.content);
    setRecordImages(Array.isArray(record.images) ? record.images : []);
    setActiveRecordId(null);
    setIsRecordShareOptionsOpen(false);
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
    setIsRecordShareOptionsOpen(false);
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

  const closeImage = () => {
    setActiveImage(null);
    setGallerySaveState({
      isSaving: false,
      message: ''
    });
  };

  const openCalendar = () => {
    const nextMonthDate = recordViewMode === 'month' ? calendarMonthDate : visibleWeekMonthDate;
    const nextPreviewDate = recordViewMode === 'month'
      ? getDefaultCalendarPreviewDate(nextMonthDate)
      : getWeekDisplayDate(visibleWeekStartDate, selectedRecordDate);

    setCalendarMonthDate(nextMonthDate);
    setCalendarPreviewDate(nextPreviewDate);
    setIsCalendarOpen(true);
  };

  const applySelectedRecordDate = date => {
    const nextDate = clampRecordDate(date);

    setSelectedRecordDate(nextDate);
    setVisibleWeekStartDate(getWeekStart(nextDate));

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

  const handleMoveMonth = amount => {
    const nextMonthDate = clampRecordMonthDate(addMonths(calendarMonthDate, amount));

    if (getMonthIndex(nextMonthDate) === getMonthIndex(calendarMonthDate)) {
      return;
    }

    setCalendarMonthDate(nextMonthDate);
    setMonthPickerYear(nextMonthDate.getFullYear());
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
    if (isCalendarOpen) {
      setCalendarPreviewDate(getDefaultCalendarPreviewDate(nextMonthDate));
    }
  };

  const handleChangeMonthPickerMonth = event => {
    const nextMonthDate = clampRecordMonthDate(new Date(monthPickerYear, Number(event.target.value), 1));

    setMonthPickerYear(nextMonthDate.getFullYear());
    setCalendarMonthDate(nextMonthDate);
    if (isCalendarOpen) {
      setCalendarPreviewDate(getDefaultCalendarPreviewDate(nextMonthDate));
    }
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
      const dataUrl = await getMemoImageDataUrlFromMediaResult(pickResult.photo);
      setPendingImageEdit({ source, dataUrl, recordId });
    } catch {
      setImageFeedback(getImageErrorMessage('PERSIST_FAILED'));
    } finally {
      setImageBusyTarget('');
    }
  };

  const handleCancelImageEdit = () => {
    if (isApplyingImageEdit) {
      return;
    }

    setPendingImageEdit(null);
  };

  const handleApplyImageEdit = async dataUrl => {
    if (!pendingImageEdit || isApplyingImageEdit) {
      return;
    }

    setIsApplyingImageEdit(true);
    setImageFeedback('');

    try {
      const persistedImage = await persistMemoImage({
        supabase,
        authUserId: cloudAuthUserId,
        itemId: FREE_RECORD_IMAGE_ITEM_ID,
        memoId: pendingImageEdit.recordId,
        mediaResult: createMemoImageMediaResultFromDataUrl({ dataUrl }),
        source: pendingImageEdit.source
      });

      setRecordImages(prev => [...prev, persistedImage]);
      setPendingImageEdit(null);
    } catch {
      setImageFeedback(getImageErrorMessage('PERSIST_FAILED'));
    } finally {
      setIsApplyingImageEdit(false);
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

  const handleReorderComposerImages = (sourceId, targetId) => {
    setRecordImages(prev => moveImageById(prev, sourceId, targetId));
  };

  const handleSaveRecord = () => {
    const isTitleMissing = !recordTitle.trim();
    const isContentMissing = !recordText.trim();

    if (isTitleMissing || isContentMissing) {
      setRecordValidation(prev => ({
        title: isTitleMissing,
        content: isContentMissing,
        pulse: prev.pulse + 1
      }));

      return;
    }

    const savedRecord = editingRecordId
      ? updateFreeRecord(editingRecordId, recordText, recordImages, { title: recordTitle })
      : addFreeRecord(recordText, recordImages, { id: draftRecordId, title: recordTitle });

    if (!savedRecord) {
      return;
    }

    if (!editingRecordId) {
      applySelectedRecordDate(new Date());
    }

    resetComposer({ shouldCleanup: false });
  };

  const requestDeleteRecord = record => {
    setDeleteRecordTarget(record);
  };

  const cancelDeleteRecord = () => {
    requestCloseDeleteRecordConfirm();
  };

  const confirmDeleteRecord = () => {
    if (!deleteRecordTarget?.id) {
      requestCloseDeleteRecordConfirm();
      return;
    }

    const record = deleteRecordTarget;

    if (editingRecordId === record.id) {
      resetComposer({ shouldCleanup: false });
    }

    if (activeRecordId === record.id) {
      closeRecordDetail();
    }

    deleteFreeRecord(record.id);
    requestCloseDeleteRecordConfirm();
  };

  const closeRecordDetail = () => {
    setActiveRecordId(null);
    setIsRecordShareOptionsOpen(false);
    setRecordShareFeedback({
      type: 'idle',
      message: ''
    });
    setIsSharingRecord(false);
  };

  const handleShareActiveRecord = () => {
    if (!activeRecord || isSharingRecord) {
      return;
    }

    setRecordShareFeedback({
      type: 'idle',
      message: ''
    });
    setIsRecordShareOptionsOpen(true);
  };

  const handleRecordShareResult = result => {
    const message = getShareFeedbackMessage(result);

    setIsSharingRecord(false);
    setRecordShareFeedback({
      type: result?.success ? 'success' : 'error',
      message
    });
  };

  const handleSaveActiveImageToGallery = async () => {
    if (!activeImage?.image || activeImage.image.source !== 'camera' || gallerySaveState.isSaving) {
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

  const requestCloseMonthPicker = useModalBackNavigation({
    isOpen: isMonthPickerOpen,
    onClose: () => setIsMonthPickerOpen(false),
    historyKey: 'record-month-picker'
  });

  const requestCloseCalendar = useModalBackNavigation({
    isOpen: isCalendarOpen,
    onClose: () => setIsCalendarOpen(false),
    historyKey: 'record-calendar'
  });

  const requestCloseRecordDetail = useModalBackNavigation({
    isOpen: Boolean(activeRecord),
    onClose: closeRecordDetail,
    historyKey: 'record-detail'
  });

  const requestCloseDeleteRecordConfirm = useModalBackNavigation({
    isOpen: Boolean(deleteRecordTarget),
    onClose: () => setDeleteRecordTarget(null),
    historyKey: 'record-delete-confirm'
  });

  const requestCloseComposer = useModalBackNavigation({
    isOpen: isComposerOpen,
    onClose: resetComposer,
    historyKey: 'record-composer'
  });

  const requestCloseImage = useModalBackNavigation({
    isOpen: Boolean(activeImage),
    onClose: closeImage,
    historyKey: 'record-image-viewer'
  });

  return (
    <div className="view-container records-view">
      <header className="records-header">
        <div className="records-brand" aria-label="Happy Finder 로고">Happy Finder</div>
        <div className="records-header-row">
          <div className="records-header-copy">
            <div className="records-heading-tabs" role="tablist" aria-label="기록 탭">
              <button
                type="button"
                className={`records-heading-tab ${activeRecordsTab === 'records' ? 'active' : ''}`}
                role="tab"
                aria-selected={activeRecordsTab === 'records'}
                onClick={() => setActiveRecordsTab('records')}
              >
                기록
              </button>
              <button
                type="button"
                className={`records-heading-tab ${activeRecordsTab === 'memos' ? 'active' : ''}`}
                role="tab"
                aria-selected={activeRecordsTab === 'memos'}
                onClick={() => setActiveRecordsTab('memos')}
              >
                행복 메모
              </button>
            </div>
            <p className="records-heading-description">
              {activeRecordsTab === 'memos'
                ? '행복 리스트에 남긴 메모를 한곳에서 확인하세요.'
                : '오늘의 순간과 감정을 날짜별로 돌아보세요.'}
            </p>
          </div>
          <div className="records-header-actions">
            <div className="records-view-mode-tabs" role="tablist" aria-label="보기 방식">
              {RECORD_VIEW_MODES.map(mode => (
                <button
                  key={mode.value}
                  type="button"
                  className={`records-view-mode-tab ${recordViewMode === mode.value ? 'active' : ''}`}
                  role="tab"
                  aria-selected={recordViewMode === mode.value}
                  onClick={() => setRecordViewMode(mode.value)}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="records-sections">
        <section className="records-overview-section records-month-section">
          {recordViewMode === 'day' && (
            <>
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
            </>
          )}

          {recordViewMode === 'month' && (
            <div className="records-month-nav records-month-nav-standalone" aria-label="기록 월 선택">
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
                className="records-month-display records-month-display-button"
                onClick={openMonthPicker}
                aria-label={`${getMonthLabel(calendarMonthDate)} 선택 변경`}
              >
                <strong>{getMonthLabel(calendarMonthDate)}</strong>
              </button>
              <button
                type="button"
                className="records-calendar-open-btn"
                onClick={openCalendar}
                aria-label={`${getMonthLabel(calendarMonthDate)} 달력으로 날짜 보기`}
              >
                <CalendarIcon />
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
          )}

          {visibleRecords.length > 0 ? (
            <div className="record-preview-list">
              {visibleRecords.map(record => (
                <article key={record.recordKey || record.id} className="record-preview-row">
                  <button
                    type="button"
                    className={`record-preview-open ${record.images?.length > 0 ? 'has-image' : ''}`}
                    onClick={() => openTimelineEntry(record)}
                    aria-label={`${getTimelineEntryTitle(record)} ${activeTabLabel} 전체 보기`}
                  >
                    <RecordPreviewThumb images={record.images} />
                    <div className="record-preview-content">
                      <time>{formatRecordDateTime(record)}</time>
                      <h3>{getTimelineEntryTitle(record)}</h3>
                      <p>{getRecordSnippet(record.content)}</p>
                    </div>
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <p className="record-section-empty">
              {emptyTimelineMessage}
            </p>
          )}
        </section>
      </main>

      {activeRecordsTab === 'records' && (
        <button
          type="button"
          className="records-floating-write-btn"
          onClick={openCreateComposer}
          aria-label="기록 남기기"
        >
          <WriteIcon />
        </button>
      )}

      {isMonthPickerOpen && (
        <div
          className="record-month-picker-overlay"
          data-block-pull-refresh="true"
          onClick={() => requestCloseMonthPicker()}
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
                onClick={() => requestCloseMonthPicker()}
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
          onClick={() => requestCloseCalendar()}
        >
          <div
            className="record-calendar-modal"
            data-block-pull-refresh="true"
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
                onClick={() => requestCloseCalendar()}
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

                return (
                  <button
                    key={dateKey}
                    type="button"
                    className={`record-calendar-day${dayToneClass}${dayRecords.length > 0 ? ' has-records' : ''}${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}`}
                    onClick={() => handlePreviewCalendarDate(date)}
                    disabled={isDisabled}
                    aria-label={`${date.getDate()}일 ${activeTabLabel} ${dayRecords.length}개`}
                  >
                    <span>{date.getDate()}</span>
                  </button>
                );
              })}
            </div>

            <div className="record-calendar-preview">
              <div className="record-calendar-preview-head">
                <div>
                  <span>{formatCalendarPreviewDate(calendarPreviewDate)}</span>
                  <strong>{calendarPreviewRecords.length}개의 {activeTabLabel}</strong>
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
                    >
                      <RecordPreviewThumb images={record.images} />
                      <div className="record-calendar-preview-content">
                        <time>{formatRecordDateTime(record)}</time>
                        <strong>{getTimelineEntryTitle(record)}</strong>
                        <p>{getRecordSnippet(record.content)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="record-calendar-preview-empty">
                  이 날짜에는 아직 남긴 {activeTabLabel}이 없어요.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeRecord && (
        <div
          className="record-detail-overlay"
          data-block-pull-refresh="true"
          onClick={() => requestCloseRecordDetail()}
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
                  onClick={() => requestDeleteRecord(activeRecord)}
                  aria-label="기록 삭제"
                >
                  <TrashIcon />
                </button>
                <button
                  type="button"
                  className="record-detail-close"
                  onClick={() => requestCloseRecordDetail()}
                  aria-label="기록 상세 닫기"
                >
                  &times;
                </button>
              </div>
            </div>

            <p className="record-detail-content">{getRecordDetailContent(activeRecord.content)}</p>

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

      {deleteRecordTarget && (
        <div
          className="record-delete-confirm-overlay"
          data-block-pull-refresh="true"
          onClick={cancelDeleteRecord}
        >
          <div
            className="glass-panel record-delete-confirm-modal"
            data-block-pull-refresh="true"
            onClick={event => event.stopPropagation()}
          >
            <h3>정말 삭제하시겠습니까?</h3>
            <p>삭제한 내용은 되돌릴 수 없습니다.</p>
            <div className="record-delete-confirm-actions">
              <button type="button" className="record-delete-confirm-cancel" onClick={cancelDeleteRecord}>
                취소
              </button>
              <button type="button" className="record-delete-confirm-submit" onClick={confirmDeleteRecord}>
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}

      {activeRecord && (
        <ShareOptionsModal
          isOpen={isRecordShareOptionsOpen}
          title="기록 공유하기"
          shareData={{
            title: getRecordTitle(activeRecord),
            text: getRecordShareText(activeRecord),
            url: getPublicWebUrl(APP_PATH)
          }}
          onClose={() => setIsRecordShareOptionsOpen(false)}
          onResult={handleRecordShareResult}
        />
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
            overlayClassName="record-memo-detail-overlay"
          />
        </LazyLoadBoundary>
      )}

      {isComposerOpen && (
        <div className="record-composer-overlay" data-block-pull-refresh="true" onClick={() => requestCloseComposer()}>
          <div className="record-note-modal" data-block-pull-refresh="true" onClick={event => event.stopPropagation()}>
            <div className="record-note-header">
              <div>
                <span>NOTE</span>
                <h3>{isEditingRecord ? '기록 수정하기' : '기록 남기기'}</h3>
              </div>
              <button type="button" className="record-note-close" onClick={() => requestCloseComposer()} aria-label="기록 작성 닫기">
                &times;
              </button>
            </div>

            <input
              className={`record-note-title-input ${recordValidation.title ? `record-field-prompt ${recordValidation.pulse % 2 === 0 ? 'pulse-even' : 'pulse-odd'}` : ''}`}
              value={recordTitle}
              onChange={event => {
                const nextValue = event.target.value;
                setRecordTitle(nextValue);
                if (nextValue.trim()) {
                  setRecordValidation(prev => ({ ...prev, title: false }));
                }
              }}
              placeholder={recordValidation.title ? '제목을 적어주세요' : '제목'}
              maxLength={48}
              autoFocus
            />

            <textarea
              className={recordValidation.content ? `record-field-prompt ${recordValidation.pulse % 2 === 0 ? 'pulse-even' : 'pulse-odd'}` : ''}
              value={recordText}
              onChange={event => {
                const nextValue = event.target.value;
                setRecordText(nextValue);
                if (nextValue.trim()) {
                  setRecordValidation(prev => ({ ...prev, content: false }));
                }
              }}
              placeholder={recordValidation.content ? '내용을 적어주세요' : '짧은 한 줄도 좋고, 길게 쓰는 일기도 좋아요.'}
              rows={9}
              maxLength={1600}
            />

            <RecordImageStrip
              images={recordImages}
              onRemove={handleRemoveComposerImage}
              onOpen={openImage}
              onReorder={handleReorderComposerImages}
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
              </div>

              <button
                type="button"
                className="btn-primary record-note-save"
                onClick={handleSaveRecord}
              >
                {isEditingRecord ? '기록 수정하기' : '기록 저장하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeImage && (
        <div className="record-image-viewer-overlay" onClick={() => requestCloseImage()}>
          <div className="record-image-viewer" onClick={event => event.stopPropagation()}>
            <button
              type="button"
              className="record-image-viewer-close"
              onClick={() => requestCloseImage()}
              aria-label="사진 닫기"
            >
              &times;
            </button>
            {activeImage.src && <img src={activeImage.src} alt="" />}
            {activeImage.image?.source === 'camera' && (
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
            )}
          </div>
        </div>
      )}

      <ImageAdjustModal
        isOpen={Boolean(pendingImageEdit)}
        imageSrc={pendingImageEdit?.dataUrl || ''}
        title="기록 사진 맞추기"
        isApplying={isApplyingImageEdit}
        onCancel={handleCancelImageEdit}
        onApply={handleApplyImageEdit}
      />
    </div>
  );
};

export default Records;
