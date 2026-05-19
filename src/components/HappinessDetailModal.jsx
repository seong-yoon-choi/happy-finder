import React, { useEffect, useRef, useState } from 'react';
import useModalBackNavigation from '../hooks/useModalBackNavigation';
import ShareOptionsModal from './ShareOptionsModal';
import {
  createHappinessItemReport,
  hasExistingHappinessItemReport,
  OTHER_REPORT_REASON_CODE,
  REPORT_REASON_OPTIONS
} from '../lib/happinessItemReports';
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
import { APP_PATH, getPublicWebUrl } from '../lib/routes';
import { useHappy } from '../store/HappyContext';
import './HappinessDetailModal.css';

const memoDateTimeFormatter = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit'
});

const ReportIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path
      d="M12 5.75V12.75"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
    />
    <path
      d="M12 18C12.6904 18 13.25 17.4404 13.25 16.75C13.25 16.0596 12.6904 15.5 12 15.5C11.3096 15.5 10.75 16.0596 10.75 16.75C10.75 17.4404 11.3096 18 12 18Z"
      fill="currentColor"
    />
  </svg>
);

const FavoriteIcon = ({ isActive = false }) => (
  <svg viewBox="0 0 24 24" fill={isActive ? 'currentColor' : 'none'} aria-hidden="true" focusable="false">
    <path
      d="M12 3.9L14.5 9.06L20.18 9.89L16.07 13.88L17.04 19.5L12 16.8L6.96 19.5L7.93 13.88L3.82 9.89L9.5 9.06L12 3.9Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
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
      strokeWidth="1.8"
    />
    <path
      d="M9.45 12.65L19.25 5.25"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
  </svg>
);

const EmpathyIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <circle
      cx="12"
      cy="12"
      r="8.25"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    <path
      d="M8.25 10.2C8.65 9.75 9.35 9.75 9.75 10.2M14.25 10.2C14.65 9.75 15.35 9.75 15.75 10.2"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.8"
    />
    <path
      d="M8.8 13.55C10.2 15.45 13.8 15.45 15.2 13.55"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.8"
    />
  </svg>
);

const MemoEditIcon = () => (
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

const MemoDeleteIcon = () => (
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

const DetailTagList = ({ tags = [] }) => {
  if (!Array.isArray(tags) || tags.length === 0) {
    return null;
  }

  return (
    <div className="detail-tag-list" aria-label="태그">
      {tags.map(tag => (
        <span key={tag}>{tag}</span>
      ))}
    </div>
  );
};

const getReportErrorMessage = code => {
  switch (code) {
    case 'REASONS_REQUIRED':
      return '신고 사유를 하나 이상 선택해주세요.';
    case 'OTHER_REASON_REQUIRED':
      return '기타 신고 사유를 입력해주세요.';
    case 'ITEM_NOT_FOUND':
      return '이미 삭제되었거나 확인할 수 없는 항목이에요.';
    case 'SUPABASE_NOT_CONFIGURED':
      return '신고 기능을 준비하지 못했어요. 관리자에게 문의해주세요.';
    default:
      return '신고를 접수하지 못했어요. 잠시 후 다시 시도해주세요.';
  }
};

const getReportSuccessMessage = duplicate => {
  if (duplicate) {
    return '이미 신고한 항목이에요. 검토 후 조치할게요.';
  }

  return '신고가 접수되었어요. 검토 후 조치할게요.';
};

const getShareFeedbackMessage = result => {
  if (result?.success) {
    if (result.method === 'twitter') {
      return '공유 작성창을 열었어요.';
    }

    return result.method === 'clipboard'
      ? '공유할 내용을 복사했어요.'
      : '공유를 열었어요.';
  }

  if (result?.code === 'CANCELLED') {
    return '';
  }

  return '공유하지 못했어요. 잠시 후 다시 시도해주세요.';
};

const getItemShareText = item => {
  const tagText = Array.isArray(item?.tags) && item.tags.length > 0
    ? `태그: ${item.tags.join(', ')}`
    : '';

  return [item?.description, tagText, 'Happy Finder']
    .filter(value => typeof value === 'string' && value.trim())
    .join('\n');
};

const createDraftMemoId = () => `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const getMemoImageErrorMessage = code => {
  switch (code) {
    case 'CAMERA_PERMISSION_DENIED':
      return '카메라 권한이 필요해요. 휴대폰 설정에서 권한을 허용해주세요.';
    case 'PHOTO_PERMISSION_DENIED':
      return '사진 접근 권한이 필요해요. 휴대폰 설정에서 권한을 허용해주세요.';
    case 'PHOTO_PICK_CANCELLED':
    case 'OS-PLUG-CAMR-0006':
      return '';
    case 'IMAGE_LIMIT_REACHED':
      return `사진은 메모 하나에 최대 ${MEMO_IMAGE_MAX_COUNT}장까지 첨부할 수 있어요.`;
    case 'SAVE_TO_GALLERY_FAILED':
    case 'accessDenied':
      return '휴대폰에 저장하지 못했어요. 사진 저장 권한을 확인해주세요.';
    default:
      return '사진을 처리하지 못했어요. 잠시 후 다시 시도해주세요.';
  }
};

const MemoImageThumb = ({ image, onRemove, onOpen }) => {
  const [src, setSrc] = useState('');
  const imageId = image.id;
  const imagePath = image.path;
  const imageStorageType = image.storageType;
  const imageContentType = image.contentType;

  useEffect(() => {
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

      if (!isMounted) {
        return;
      }

      setSrc(nextSrc);
    };

    void loadImage();

    return () => {
      isMounted = false;
    };
  }, [imageContentType, imageId, imagePath, imageStorageType]);

  return (
    <div className="detail-memo-image-thumb">
      <button
        type="button"
        className="detail-memo-image-open"
        onClick={() => onOpen?.(image, src)}
        disabled={!src}
        aria-label="첨부 사진 크게 보기"
      >
        {src ? <img src={src} alt="" loading="lazy" /> : <span />}
      </button>
      {onRemove && (
        <button
          type="button"
          className="detail-memo-image-remove"
          onClick={() => onRemove(image)}
          aria-label="첨부 사진 삭제"
        >
          &times;
        </button>
      )}
    </div>
  );
};

const MemoImageStrip = ({ images = [], onRemove, onOpen }) => {
  if (images.length === 0) {
    return null;
  }

  return (
    <div className="detail-memo-image-strip">
      {images.map(image => (
        <MemoImageThumb
          key={image.id}
          image={image}
          onRemove={onRemove}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
};

const HappinessDetailModal = ({
  item,
  isOpen,
  onClose,
  canDelete = false,
  autoOpenMemoComposer = false,
  focusMemoId = '',
  overlayClassName = ''
}) => {
  const {
    items,
    userFavorites,
    userEmpathies,
    toggleFavorite,
    toggleEmpathy,
    deleteCustomItem,
    updateCustomItemVisibility,
    isItemOwnedByCurrentUser,
    getItemMemos,
    addMemo,
    updateMemo,
    deleteMemo,
    authUser,
    isReviewAuthUser
  } = useHappy();

  const [confirmDialog, setConfirmDialog] = useState(null);
  const [showMemoComposer, setShowMemoComposer] = useState(autoOpenMemoComposer);
  const [memoText, setMemoText] = useState('');
  const [memoImages, setMemoImages] = useState([]);
  const [draftMemoId, setDraftMemoId] = useState(() => createDraftMemoId());
  const [editingMemoId, setEditingMemoId] = useState(null);
  const [editingMemoText, setEditingMemoText] = useState('');
  const [editingMemoImages, setEditingMemoImages] = useState([]);
  const [memoImageFeedback, setMemoImageFeedback] = useState('');
  const [memoImageBusyTarget, setMemoImageBusyTarget] = useState('');
  const [activeMemoImage, setActiveMemoImage] = useState(null);
  const [gallerySaveState, setGallerySaveState] = useState({
    isSaving: false,
    message: ''
  });
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);
  const [visibilityError, setVisibilityError] = useState('');
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [selectedReportReasons, setSelectedReportReasons] = useState([]);
  const [reportOtherReason, setReportOtherReason] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportFeedback, setReportFeedback] = useState({
    type: 'idle',
    message: ''
  });
  const [shareFeedback, setShareFeedback] = useState({
    type: 'idle',
    message: ''
  });
  const [isShareOptionsOpen, setIsShareOptionsOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [reportStatus, setReportStatus] = useState({
    key: '',
    hasReported: false,
    isLoading: false
  });
  const [deleteFeedback, setDeleteFeedback] = useState('');
  const [isDeletingItem, setIsDeletingItem] = useState(false);
  const memoElementRefs = useRef(new Map());

  const currentItem = item ? items.find(existingItem => existingItem.id === item.id) || item : null;
  const currentItemId = currentItem?.id ?? '';
  const reportStatusKey = authUser?.id && currentItemId ? `${authUser.id}:${currentItemId}` : '';
  const isOwner = currentItem ? isItemOwnedByCurrentUser(currentItem.id) : false;
  const itemMemos = currentItem ? getItemMemos(currentItem.id) : [];
  const isMemoImageEnabled = isNativeMemoImageAvailable();
  const memoCloudAuthUserId = authUser?.id && !isReviewAuthUser ? authUser.id : null;
  const canReportItem = Boolean(currentItem?.isCloudBacked === true);
  const isFavorited = Boolean(currentItem && userFavorites[currentItem.id]);
  const isEmpathized = Boolean(currentItem && userEmpathies[currentItem.id]);
  const empathyCount = currentItem && Number.isFinite(currentItem.totalEmpathyCount)
    ? currentItem.totalEmpathyCount
    : 0;
  const shouldCheckReportStatus = Boolean(isOpen && canReportItem && reportStatusKey);
  const hasReportStatusForCurrentItem = reportStatus.key === reportStatusKey;
  const hasReportedCurrentItem = shouldCheckReportStatus && hasReportStatusForCurrentItem && reportStatus.hasReported;
  const isCheckingReportStatus = shouldCheckReportStatus && (!hasReportStatusForCurrentItem || reportStatus.isLoading);
  const isReportTriggerDisabled = isCheckingReportStatus || hasReportedCurrentItem;

  useEffect(() => {
    if (isOpen && autoOpenMemoComposer) {
      setShowMemoComposer(true);
    }
  }, [autoOpenMemoComposer, currentItemId, isOpen]);

  useEffect(() => {
    if (!isOpen || !focusMemoId) {
      return undefined;
    }

    const focusTimer = window.setTimeout(() => {
      const targetElement = memoElementRefs.current.get(focusMemoId);

      if (!targetElement) {
        return;
      }

      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }, 80);

    return () => window.clearTimeout(focusTimer);
  }, [currentItemId, focusMemoId, isOpen, itemMemos.length]);

  const cleanupImages = images => {
    if (!Array.isArray(images) || images.length === 0) {
      return;
    }

    void deleteMemoStoredImages({ images, supabase });
  };

  const getEditingOriginalImages = () => (
    itemMemos.find(memo => memo.id === editingMemoId)?.images || []
  );

  const cleanupUncommittedEditingImages = () => {
    if (!editingMemoId || editingMemoImages.length === 0) {
      return;
    }

    const originalImageIds = new Set(getEditingOriginalImages().map(image => image.id));
    const uncommittedImages = editingMemoImages.filter(image => !originalImageIds.has(image.id));
    cleanupImages(uncommittedImages);
  };

  const openMemoImage = (image, src) => {
    if (!image) {
      return;
    }

    setActiveMemoImage({ image, src: src || '' });
    setGallerySaveState({
      isSaving: false,
      message: ''
    });
  };

  const handleAttachMemoImage = async (target, source) => {
    if (!isMemoImageEnabled || !currentItem) {
      return;
    }

    const currentImages = target === 'edit' ? editingMemoImages : memoImages;

    if (currentImages.length >= MEMO_IMAGE_MAX_COUNT) {
      setMemoImageFeedback(getMemoImageErrorMessage('IMAGE_LIMIT_REACHED'));
      return;
    }

    const busyKey = `${target}:${source}`;
    setMemoImageBusyTarget(busyKey);
    setMemoImageFeedback('');

    const pickResult = source === 'camera'
      ? await takeMemoPhoto()
      : await chooseMemoPhoto();

    if (!pickResult.success) {
      setMemoImageBusyTarget('');
      setMemoImageFeedback(getMemoImageErrorMessage(pickResult.code));
      return;
    }

    const memoId = target === 'edit'
      ? editingMemoId
      : draftMemoId;

    try {
      const persistedImage = await persistMemoImage({
        supabase,
        authUserId: memoCloudAuthUserId,
        itemId: currentItem.id,
        memoId,
        mediaResult: pickResult.photo,
        source
      });

      if (target === 'edit') {
        setEditingMemoImages(prev => [...prev, persistedImage]);
      } else {
        setMemoImages(prev => [...prev, persistedImage]);
      }
    } catch {
      setMemoImageFeedback(getMemoImageErrorMessage('PERSIST_FAILED'));
    } finally {
      setMemoImageBusyTarget('');
    }
  };

  const handleRemoveDraftImage = image => {
    setMemoImages(prev => prev.filter(candidate => candidate.id !== image.id));
    cleanupImages([image]);
  };

  const handleRemoveEditingImage = image => {
    setEditingMemoImages(prev => prev.filter(candidate => candidate.id !== image.id));
  };

  const handleSaveActiveImageToGallery = async () => {
    if (!activeMemoImage?.image || activeMemoImage.image.source !== 'camera' || gallerySaveState.isSaving) {
      return;
    }

    setGallerySaveState({
      isSaving: true,
      message: ''
    });

    const result = await saveMemoImageToGallery({
      image: activeMemoImage.image,
      supabase
    });

    setGallerySaveState({
      isSaving: false,
      message: result.success
        ? '휴대폰 사진첩에 저장했어요.'
        : getMemoImageErrorMessage(result.code)
    });
  };

  const resetModalState = () => {
    cleanupImages(memoImages);
    cleanupUncommittedEditingImages();
    setConfirmDialog(null);
    setIsUpdatingVisibility(false);
    setVisibilityError('');
    setShowMemoComposer(false);
    setMemoText('');
    setMemoImages([]);
    setDraftMemoId(createDraftMemoId());
    setEditingMemoId(null);
    setEditingMemoText('');
    setEditingMemoImages([]);
    setMemoImageFeedback('');
    setMemoImageBusyTarget('');
    setActiveMemoImage(null);
    setGallerySaveState({
      isSaving: false,
      message: ''
    });
    setIsReportDialogOpen(false);
    setSelectedReportReasons([]);
    setReportOtherReason('');
    setIsSubmittingReport(false);
    setReportFeedback({
      type: 'idle',
      message: ''
    });
    setShareFeedback({
      type: 'idle',
      message: ''
    });
    setIsShareOptionsOpen(false);
    setIsSharing(false);
    setReportStatus({
      key: '',
      hasReported: false,
      isLoading: false
    });
    setDeleteFeedback('');
    setIsDeletingItem(false);
  };

  const handleClose = () => {
    resetModalState();
    onClose();
  };

  const requestClose = useModalBackNavigation({
    isOpen: isOpen && Boolean(currentItem),
    onClose: handleClose,
    historyKey: 'happiness-detail'
  });

  const openDeleteConfirm = () => {
    setDeleteFeedback('');
    setIsDeletingItem(false);
    setConfirmDialog({ type: 'item' });
  };

  const closeDeleteConfirm = () => {
    if (isDeletingItem) {
      return;
    }

    setDeleteFeedback('');
    setIsDeletingItem(false);
    setConfirmDialog(null);
  };

  const requestCloseDeleteConfirm = useModalBackNavigation({
    isOpen: isOpen && Boolean(confirmDialog),
    onClose: closeDeleteConfirm,
    canClose: confirmDialog?.type !== 'item' || !isDeletingItem,
    historyKey: 'detail-delete-confirm'
  });

  const requestCloseMemoImageViewer = useModalBackNavigation({
    isOpen: isOpen && Boolean(activeMemoImage),
    onClose: () => setActiveMemoImage(null),
    historyKey: 'memo-image-viewer'
  });

  const handleDeleteConfirm = async () => {
    if (confirmDialog?.type === 'item') {
      if (isDeletingItem) {
        return;
      }

      setDeleteFeedback('');
      setIsDeletingItem(true);
      const deleted = await deleteCustomItem(currentItem.id);
      setIsDeletingItem(false);

      if (deleted) {
        requestCloseDeleteConfirm(() => requestClose());
        return;
      }

      setDeleteFeedback('행복을 삭제하지 못했어요. 잠시 후 다시 시도해주세요.');
      return;
    }

    if (confirmDialog?.type === 'memo' && confirmDialog.memoId) {
      const didDelete = deleteMemo(item.id, confirmDialog.memoId);

      if (didDelete && editingMemoId === confirmDialog.memoId) {
        handleCancelMemoEdit();
      }
    }

    closeDeleteConfirm();
  };

  const handleSaveMemo = () => {
    const savedMemo = addMemo(item.id, memoText, memoImages, { id: draftMemoId });

    if (!savedMemo) {
      return;
    }

    setMemoText('');
    setMemoImages([]);
    setDraftMemoId(createDraftMemoId());
    setMemoImageFeedback('');
    setShowMemoComposer(false);
  };

  const handleStartMemoEdit = memo => {
    cleanupUncommittedEditingImages();
    setEditingMemoId(memo.id);
    setEditingMemoText(memo.content);
    setEditingMemoImages(Array.isArray(memo.images) ? memo.images : []);
    setMemoImageFeedback('');
  };

  const handleCancelMemoEdit = () => {
    cleanupUncommittedEditingImages();
    setEditingMemoId(null);
    setEditingMemoText('');
    setEditingMemoImages([]);
    setMemoImageFeedback('');
  };

  const handleSaveMemoEdit = memoId => {
    const didUpdate = updateMemo(item.id, memoId, editingMemoText, editingMemoImages);

    if (!didUpdate) {
      return;
    }

    handleCancelMemoEdit();
  };

  const handleDeleteMemo = memoId => {
    setConfirmDialog({ type: 'memo', memoId });
  };

  const handleVisibilityChange = async nextVisibility => {
    if (isUpdatingVisibility) {
      return;
    }

    const currentVisibility = currentItem.isPublic ? 'public' : 'private';

    if (currentVisibility === nextVisibility) {
      return;
    }

    setVisibilityError('');
    setIsUpdatingVisibility(true);

    const result = await updateCustomItemVisibility(currentItem.id, nextVisibility);

    setIsUpdatingVisibility(false);

    if (result?.success) {
      return;
    }

    if (result?.code === 'AUTH_REQUIRED') {
      setVisibilityError('공개하기는 로그인 후 사용할 수 있어요.');
      return;
    }

    setVisibilityError('공개 범위를 변경하지 못했어요. 잠시 후 다시 시도해주세요.');
  };

  const handleShareItem = async () => {
    if (!currentItem || isSharing) {
      return;
    }

    setShareFeedback({
      type: 'idle',
      message: ''
    });
    setIsShareOptionsOpen(true);
  };

  const handleShareResult = result => {
    const message = getShareFeedbackMessage(result);

    setIsSharing(false);
    setShareFeedback({
      type: result?.success ? 'success' : 'error',
      message
    });
  };

  const openReportDialog = () => {
    if (isReportTriggerDisabled) {
      return;
    }

    setSelectedReportReasons([]);
    setReportOtherReason('');
    setIsSubmittingReport(false);
    setReportFeedback({
      type: 'idle',
      message: ''
    });
    setIsReportDialogOpen(true);
  };

  const closeReportDialog = () => {
    if (isSubmittingReport) {
      return;
    }

    setIsReportDialogOpen(false);
    setSelectedReportReasons([]);
    setReportOtherReason('');
    setReportFeedback({
      type: 'idle',
      message: ''
    });
  };

  const requestCloseReportDialog = useModalBackNavigation({
    isOpen: isOpen && isReportDialogOpen,
    onClose: closeReportDialog,
    canClose: !isSubmittingReport,
    historyKey: 'detail-report-dialog'
  });

  const handleToggleReportReason = reasonCode => {
    setReportFeedback({
      type: 'idle',
      message: ''
    });

    setSelectedReportReasons(prevReasons => {
      const hasReason = prevReasons.includes(reasonCode);
      const nextReasons = hasReason
        ? prevReasons.filter(code => code !== reasonCode)
        : [...prevReasons, reasonCode];

      if (hasReason && reasonCode === OTHER_REPORT_REASON_CODE) {
        setReportOtherReason('');
      }

      return nextReasons;
    });
  };

  const handleSubmitReport = async () => {
    if (hasReportedCurrentItem) {
      setReportFeedback({
        type: 'success',
        message: getReportSuccessMessage(true)
      });
      return;
    }

    if (selectedReportReasons.length === 0) {
      setReportFeedback({
        type: 'error',
        message: '신고 사유를 하나 이상 선택해주세요.'
      });
      return;
    }

    if (selectedReportReasons.includes(OTHER_REPORT_REASON_CODE) && !reportOtherReason.trim()) {
      setReportFeedback({
        type: 'error',
        message: '기타 사유를 입력해주세요.'
      });
      return;
    }

    setIsSubmittingReport(true);
    setReportFeedback({
      type: 'idle',
      message: ''
    });

    const result = await createHappinessItemReport({
      item: currentItem,
      reporterUserId: authUser?.id || null,
      reasonCodes: selectedReportReasons,
      otherReason: reportOtherReason
    });

    setIsSubmittingReport(false);

    if (!result?.success) {
      setReportFeedback({
        type: 'error',
        message: getReportErrorMessage(result?.code)
      });
      return;
    }

    setIsReportDialogOpen(false);
    setSelectedReportReasons([]);
    setReportOtherReason('');
    setReportStatus({
      key: reportStatusKey,
      hasReported: true,
      isLoading: false
    });
    setReportFeedback({
      type: 'success',
      message: getReportSuccessMessage(result?.duplicate === true)
    });
  };

  useEffect(() => {
    if (!shouldCheckReportStatus) {
      return;
    }

    let isMounted = true;
    const itemId = currentItemId;
    const reporterUserId = authUser.id;
    const nextReportStatusKey = reportStatusKey;

    const loadExistingReport = async () => {
      setReportStatus(prev => (
        prev.key === nextReportStatusKey && prev.isLoading
          ? prev
          : {
              key: nextReportStatusKey,
              hasReported: false,
              isLoading: true
            }
      ));

      const result = await hasExistingHappinessItemReport({
        itemId,
        reporterUserId
      });

      if (!isMounted) {
        return;
      }

      setReportStatus({
        key: nextReportStatusKey,
        hasReported: result?.success === true && result?.hasReported === true,
        isLoading: false
      });
    };

    void loadExistingReport();

    return () => {
      isMounted = false;
    };
  }, [authUser?.id, currentItemId, reportStatusKey, shouldCheckReportStatus]);

  if (!isOpen || !currentItem) {
    return null;
  }

  return (
    <div
      className={`modal-overlay detail-modal-overlay${overlayClassName ? ` ${overlayClassName}` : ''}`}
      data-block-pull-refresh="true"
      onClick={() => requestClose()}
    >
      <div
        className="glass-panel detail-modal-content"
        data-block-pull-refresh="true"
        onClick={event => event.stopPropagation()}
      >
        <div className="detail-top-actions">
          <div className="detail-side-actions">
            {canReportItem && (
              <button
                type="button"
                className="detail-icon-btn detail-report-trigger"
                onClick={openReportDialog}
                disabled={isReportTriggerDisabled}
                aria-label={hasReportedCurrentItem ? '이미 신고한 행복 항목' : '행복 항목 신고'}
                aria-busy={isCheckingReportStatus}
              >
                <ReportIcon />
              </button>
            )}
            <button
              type="button"
              className={`detail-icon-btn detail-favorite-trigger ${isFavorited ? 'active' : ''}`}
              onClick={() => toggleFavorite(currentItem.id)}
              aria-label={isFavorited ? '즐겨찾기에서 제거' : '즐겨찾기에 추가'}
              aria-pressed={isFavorited}
            >
              <FavoriteIcon isActive={isFavorited} />
            </button>
            <button
              type="button"
              className="detail-icon-btn detail-share-trigger"
              onClick={handleShareItem}
              disabled={isSharing}
              aria-label="행복 공유"
            >
              <ShareIcon />
            </button>
          </div>
          <button className="close-btn detail-close" onClick={() => requestClose()}>&times;</button>
        </div>

        <div className="detail-header">
          <div className="badges-container">
            {currentItem.isCustom && isOwner && <span className="custom-badge">MY</span>}
          </div>
        </div>

        <h2 className="detail-title">{currentItem.title}</h2>
        <p className="detail-desc">{currentItem.description}</p>
        <DetailTagList tags={currentItem.tags} />

        <div className="detail-empathy-section">
          <button
            type="button"
            className={`detail-empathy-trigger ${isEmpathized ? 'active' : ''}`}
            onClick={() => toggleEmpathy(currentItem.id)}
            aria-label={isEmpathized ? '공감 취소' : '공감 남기기'}
            aria-pressed={isEmpathized}
          >
            <EmpathyIcon />
            <span>{isEmpathized ? '공감했어요' : '공감해요'}</span>
          </button>
          <span className="detail-empathy-count">
            {empathyCount > 0 ? `공감의 흔적 ${empathyCount}개` : '첫 공감의 흔적을 남겨보세요'}
          </span>
        </div>

        {reportFeedback.message && (
          <div className={`detail-inline-feedback ${reportFeedback.type === 'error' ? 'error' : 'success'}`}>
            {reportFeedback.message}
          </div>
        )}

        {shareFeedback.message && (
          <div className={`detail-inline-feedback ${shareFeedback.type === 'error' ? 'error' : 'success'}`}>
            {shareFeedback.message}
          </div>
        )}

        {canDelete && currentItem.isCustom && isOwner && (
          <div className="detail-visibility-section">
            <div className="detail-visibility-copy">
              <strong>공개 범위</strong>
              <span>{currentItem.isPublic ? '다른 사람들에게 공개되고 있어요.' : '지금은 나만 볼 수 있어요.'}</span>
            </div>

            <div className="detail-visibility-toggle">
              <button
                type="button"
                className={`detail-visibility-option ${!currentItem.isPublic ? 'active' : ''}`}
                onClick={() => handleVisibilityChange('private')}
                disabled={isUpdatingVisibility}
              >
                나만보기
              </button>
              <button
                type="button"
                className={`detail-visibility-option ${currentItem.isPublic ? 'active' : ''}`}
                onClick={() => handleVisibilityChange('public')}
                disabled={isUpdatingVisibility}
              >
                공개하기
              </button>
            </div>

            {visibilityError && <p className="detail-visibility-error">{visibilityError}</p>}
          </div>
        )}

        {((canDelete && currentItem.isCustom && isOwner) || showMemoComposer || itemMemos.length > 0) && (
          <div className="detail-record-section">
            {canDelete && currentItem.isCustom && isOwner && (
              <button
                type="button"
                className="detail-delete-btn"
                onClick={openDeleteConfirm}
              >
                이 행복 삭제하기
              </button>
            )}

            {(showMemoComposer || itemMemos.length > 0) && (
              <div className="detail-memo-section">
                {showMemoComposer && (
                  <div className="detail-memo-compose">
                    <textarea
                      value={memoText}
                      onChange={event => setMemoText(event.target.value)}
                      placeholder="오늘 어떤 순간을 남기고 싶나요?"
                      rows={3}
                      maxLength={500}
                    />
                    {isMemoImageEnabled && (
                      <div className="detail-memo-photo-actions">
                        <button
                          type="button"
                          onClick={() => handleAttachMemoImage('compose', 'camera')}
                          disabled={Boolean(memoImageBusyTarget)}
                        >
                          {memoImageBusyTarget === 'compose:camera' ? '촬영 중...' : '카메라'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAttachMemoImage('compose', 'gallery')}
                          disabled={Boolean(memoImageBusyTarget)}
                        >
                          {memoImageBusyTarget === 'compose:gallery' ? '선택 중...' : '앨범'}
                        </button>
                      </div>
                    )}
                    <MemoImageStrip
                      images={memoImages}
                      onRemove={handleRemoveDraftImage}
                      onOpen={openMemoImage}
                    />
                    {memoImageFeedback && <p className="detail-memo-image-feedback">{memoImageFeedback}</p>}
                    <div className="detail-memo-actions detail-memo-actions-compose">
                      <button
                        type="button"
                        className="btn-primary detail-memo-save"
                        onClick={handleSaveMemo}
                        disabled={!memoText.trim() && memoImages.length === 0}
                      >
                        기록 저장하기
                      </button>
                    </div>
                  </div>
                )}

              {itemMemos.length > 0 && (
                <div className="detail-memo-list">
                  {itemMemos.map(memo => (
                    <div
                      key={memo.id}
                      ref={node => {
                        if (node) {
                          memoElementRefs.current.set(memo.id, node);
                          return;
                        }

                        memoElementRefs.current.delete(memo.id);
                      }}
                      className={`detail-memo-item ${focusMemoId === memo.id ? 'is-focused' : ''}`}
                    >
                      <div className="detail-memo-meta">
                        <div className="detail-memo-time">
                          {memoDateTimeFormatter.format(new Date(memo.updatedAt))}
                        </div>
                        <div className="detail-memo-item-actions">
                          <button
                            type="button"
                            className="detail-memo-edit-btn"
                            onClick={() => handleStartMemoEdit(memo)}
                            aria-label="메모 수정"
                          >
                            <MemoEditIcon />
                          </button>
                          <button
                            type="button"
                            className="detail-memo-delete-btn"
                            onClick={() => handleDeleteMemo(memo.id)}
                            aria-label="메모 삭제"
                          >
                            <MemoDeleteIcon />
                          </button>
                        </div>
                      </div>

                      {editingMemoId === memo.id ? (
                        <div className="detail-memo-edit-wrap">
                          <textarea
                            value={editingMemoText}
                            onChange={event => setEditingMemoText(event.target.value)}
                            rows={3}
                            maxLength={500}
                          />
                          {isMemoImageEnabled && (
                            <div className="detail-memo-photo-actions">
                              <button
                                type="button"
                                onClick={() => handleAttachMemoImage('edit', 'camera')}
                                disabled={Boolean(memoImageBusyTarget)}
                              >
                                {memoImageBusyTarget === 'edit:camera' ? '촬영 중...' : '카메라'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAttachMemoImage('edit', 'gallery')}
                                disabled={Boolean(memoImageBusyTarget)}
                              >
                                {memoImageBusyTarget === 'edit:gallery' ? '선택 중...' : '앨범'}
                              </button>
                            </div>
                          )}
                          <MemoImageStrip
                            images={editingMemoImages}
                            onRemove={handleRemoveEditingImage}
                            onOpen={openMemoImage}
                          />
                          {memoImageFeedback && <p className="detail-memo-image-feedback">{memoImageFeedback}</p>}
                          <div className="detail-memo-actions">
                            <button
                              type="button"
                              className="detail-memo-skip"
                              onClick={handleCancelMemoEdit}
                            >
                              취소
                            </button>
                            <button
                              type="button"
                              className="btn-primary detail-memo-save"
                              onClick={() => handleSaveMemoEdit(memo.id)}
                              disabled={!editingMemoText.trim() && editingMemoImages.length === 0}
                            >
                              기록 수정
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {memo.content && <p>{memo.content}</p>}
                          <MemoImageStrip
                            images={memo.images}
                            onOpen={openMemoImage}
                          />
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          </div>
        )}
      </div>

      {activeMemoImage && (
        <div
          className="memo-image-viewer-overlay"
          onClick={event => {
            event.stopPropagation();
            requestCloseMemoImageViewer();
          }}
        >
          <div
            className="memo-image-viewer"
            onClick={event => event.stopPropagation()}
          >
            <button
              type="button"
              className="memo-image-viewer-close"
              onClick={() => requestCloseMemoImageViewer()}
              aria-label="사진 닫기"
            >
              &times;
            </button>
            {activeMemoImage.src && <img src={activeMemoImage.src} alt="" />}
            {activeMemoImage.image?.source === 'camera' && (
              <div className="memo-image-viewer-actions">
              <button
                type="button"
                className="btn-primary memo-image-save-btn"
                onClick={handleSaveActiveImageToGallery}
                disabled={gallerySaveState.isSaving}
              >
                {gallerySaveState.isSaving ? '저장 중...' : '휴대폰에 저장'}
              </button>
              {gallerySaveState.message && (
                <p className="memo-image-save-feedback">{gallerySaveState.message}</p>
              )}
              </div>
            )}
          </div>
        </div>
      )}

      {currentItem && (
        <ShareOptionsModal
          isOpen={isShareOptionsOpen}
          title="행복 공유하기"
          shareData={{
            title: currentItem.title,
            text: getItemShareText(currentItem),
            url: getPublicWebUrl(APP_PATH)
          }}
          onClose={() => setIsShareOptionsOpen(false)}
          onResult={handleShareResult}
        />
      )}

      {confirmDialog && (
        <div
          className="delete-confirm-overlay"
          onClick={event => {
            event.stopPropagation();
            if (isDeletingItem) {
              return;
            }
            requestCloseDeleteConfirm();
          }}
        >
          <div
            className="glass-panel delete-confirm-modal"
            onClick={event => event.stopPropagation()}
          >
            <h3 className="delete-confirm-title">
              {confirmDialog.type === 'item' ? '행복을 삭제할까요?' : '메모를 삭제할까요?'}
            </h3>
            <p className="delete-confirm-text">
              {confirmDialog.type === 'item'
                ? `"${currentItem.title}"을 삭제하면 다시 되돌릴 수 없어요.`
                : '이 메모를 삭제하면 다시 되돌릴 수 없어요.'}
            </p>
            {confirmDialog.type === 'item' && deleteFeedback && (
              <p className="report-dialog-feedback error">{deleteFeedback}</p>
            )}
            <div className="delete-confirm-actions">
              <button
                type="button"
                className="delete-confirm-cancel"
                onClick={() => requestCloseDeleteConfirm()}
                disabled={confirmDialog.type === 'item' && isDeletingItem}
              >
                취소
              </button>
              <button
                type="button"
                className={`delete-confirm-submit ${confirmDialog.type === 'item' && isDeletingItem ? 'loading' : ''}`}
                onClick={handleDeleteConfirm}
                disabled={confirmDialog.type === 'item' && isDeletingItem}
                aria-busy={confirmDialog.type === 'item' && isDeletingItem}
              >
                {confirmDialog.type === 'item' && isDeletingItem ? (
                  <>
                    <span className="delete-confirm-spinner" aria-hidden="true" />
                    삭제 중...
                  </>
                ) : (
                  '삭제하기'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {isReportDialogOpen && (
        <div
          className="report-dialog-overlay"
          onClick={event => {
            event.stopPropagation();
            requestCloseReportDialog();
          }}
        >
          <div
            className="glass-panel report-dialog-modal"
            onClick={event => event.stopPropagation()}
          >
            <div className="report-dialog-copy">
              <span className="report-dialog-eyebrow">REPORT</span>
              <h3>이 행복 항목을 신고할까요?</h3>
              <p>검토에 도움이 되도록 신고 사유를 선택해주세요.</p>
            </div>

            <div className="report-reason-list">
              {REPORT_REASON_OPTIONS.map(option => {
                const isChecked = selectedReportReasons.includes(option.code);

                return (
                  <label key={option.code} className={`report-reason-option ${isChecked ? 'checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleReportReason(option.code)}
                      disabled={isSubmittingReport}
                    />
                    <span>{option.label}</span>
                  </label>
                );
              })}
            </div>

            {selectedReportReasons.includes(OTHER_REPORT_REASON_CODE) && (
              <label className="report-other-field">
                <span>기타 신고 사유</span>
                <textarea
                  value={reportOtherReason}
                  onChange={event => setReportOtherReason(event.target.value)}
                  placeholder="신고 사유를 자세히 입력해주세요."
                  rows={4}
                  maxLength={500}
                  disabled={isSubmittingReport}
                />
              </label>
            )}

            {reportFeedback.type === 'error' && (
              <p className="report-dialog-feedback error">{reportFeedback.message}</p>
            )}

            <div className="report-dialog-actions">
              <button
                type="button"
                className="report-dialog-cancel"
                onClick={() => requestCloseReportDialog()}
                disabled={isSubmittingReport}
              >
                취소
              </button>
              <button
                type="button"
                className={`report-dialog-submit ${isSubmittingReport ? 'loading' : ''}`}
                onClick={handleSubmitReport}
                disabled={isSubmittingReport}
                aria-busy={isSubmittingReport}
              >
                {isSubmittingReport ? (
                  <>
                    <span className="report-dialog-spinner" aria-hidden="true" />
                    신고 중...
                  </>
                ) : (
                  '신고하기'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HappinessDetailModal;
