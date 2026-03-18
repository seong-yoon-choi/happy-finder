import React, { useState } from 'react';
import { useHappy } from '../store/HappyContext';
import './SettingsModal.css';

const DEFAULT_REMINDER_TIME = '20:00';

const PERIOD_OPTIONS = [
  { value: 'AM', label: '오전' },
  { value: 'PM', label: '오후' }
];

const HOUR_OPTIONS = Array.from({ length: 12 }, (_, index) => {
  const value = String(index + 1).padStart(2, '0');
  return { value, label: `${index + 1}시` };
});

const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) => {
  const value = String(index).padStart(2, '0');
  return { value, label: `${value}분` };
});

const parseReminderTime = (timeValue) => {
  const [rawHour = '20', rawMinute = '00'] = String(timeValue || DEFAULT_REMINDER_TIME).split(':');
  const hour24 = Number(rawHour);
  const minute = Number(rawMinute);

  if (!Number.isFinite(hour24) || !Number.isFinite(minute)) {
    return {
      period: 'PM',
      hour: '08',
      minute: '00'
    };
  }

  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 || 12;

  return {
    period,
    hour: String(hour12).padStart(2, '0'),
    minute: String(minute).padStart(2, '0')
  };
};

const toReminderTimeValue = ({ period, hour, minute }) => {
  let hour24 = Number(hour);

  if (period === 'AM') {
    hour24 = hour24 === 12 ? 0 : hour24;
  } else {
    hour24 = hour24 === 12 ? 12 : hour24 + 12;
  }

  return `${String(hour24).padStart(2, '0')}:${minute}`;
};

const formatReminderTimeLabel = (timeValue) => {
  const { period, hour, minute } = parseReminderTime(timeValue);
  return `${period === 'AM' ? '오전' : '오후'} ${Number(hour)}시 ${minute}분`;
};

const ChevronIcon = ({ isOpen = false, className = '' }) => (
  <span className={`settings-time-chevron ${className} ${isOpen ? 'open' : ''}`.trim()} aria-hidden="true">
    <svg viewBox="0 0 20 20" fill="none" focusable="false">
      <path
        d="M5 7.5L10 12.5L15 7.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </span>
);

const EditIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" focusable="false" aria-hidden="true">
    <path
      d="M4.167 13.958V15.833H6.042L13.125 8.75L11.25 6.875L4.167 13.958Z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10.833 7.29167L12.7083 9.16667"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M11.25 6.875L12.1476 5.97742C12.5337 5.59136 13.1592 5.59136 13.5452 5.97742L14.0226 6.45477C14.4086 6.84083 14.4086 7.46632 14.0226 7.85239L13.125 8.75"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" focusable="false" aria-hidden="true">
    <path
      d="M5.833 7.08333V14.1667C5.833 14.6269 6.2061 15 6.66634 15H13.333C13.7932 15 14.1663 14.6269 14.1663 14.1667V7.08333"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M4.583 5.41667H15.4163"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8.33301 5.41667V4.58333C8.33301 4.1231 8.7061 3.75 9.16634 3.75H10.833C11.2932 3.75 11.6663 4.1231 11.6663 4.58333V5.41667"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8.75 8.75V12.5"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M11.25 8.75V12.5"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PlusIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" focusable="false" aria-hidden="true">
    <path
      d="M10 4.16667V15.8333"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M4.16699 10H15.8337"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SettingsModal = ({ isOpen, onClose, onOpenAuth, onOpenAgreement, onOpenNicknameEditor }) => {
  const {
    isDarkMode,
    toggleTheme,
    reminderSettings,
    notificationPermission,
    toggleReminder,
    addReminder,
    updateReminder,
    deleteReminder,
    authUser,
    authUserNickname,
    isGuestMode,
    isAuthLoading,
    isAuthBusy,
    clearAuthFeedback,
    signOutFromSupabase
  } = useHappy();

  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [editingReminderId, setEditingReminderId] = useState(null);
  const [pickerTime, setPickerTime] = useState(() => parseReminderTime(DEFAULT_REMINDER_TIME));
  const [isAccountActionsOpen, setIsAccountActionsOpen] = useState(false);

  const reminders = reminderSettings.reminders || [];

  if (!isOpen) {
    return null;
  }

  const reminderMessage = (() => {
    if (notificationPermission === 'granted') {
      return '설정한 시간마다 브라우저 알림과 시스템 알림을 함께 보내요.';
    }

    if (notificationPermission === 'unsupported') {
      return '현재 환경에서는 시스템 알림이 지원되지 않아요. 앱이 열려 있으면 앱 안 알림으로 알려드려요.';
    }

    if (notificationPermission === 'denied') {
      return '브라우저 알림이 차단되어 있어요. 앱이 열려 있으면 앱 안 알림으로 계속 알려드려요.';
    }

    return '브라우저 알림을 허용하면 시스템 알림까지 받을 수 있어요. 앱이 열려 있으면 앱 안 알림은 그대로 동작해요.';
  })();

  const pickerPreviewText = formatReminderTimeLabel(toReminderTimeValue(pickerTime));
  const timeEditorTitle = editingReminderId === 'new' ? '알림 추가' : '알림 수정';
  const timeEditorDescription = editingReminderId === 'new'
    ? '원하는 시간을 골라 새 알림을 추가해보세요.'
    : '선택한 알림 시간을 바로 바꿀 수 있어요.';

  const resetReminderEditor = () => {
    setIsTimePickerOpen(false);
    setEditingReminderId(null);
    setPickerTime(parseReminderTime(DEFAULT_REMINDER_TIME));
  };

  const resetModalState = () => {
    resetReminderEditor();
    setIsAccountActionsOpen(false);
  };

  const handleClose = () => {
    clearAuthFeedback();
    resetModalState();
    onClose();
  };

  const handleOpenAuth = () => {
    clearAuthFeedback();
    resetModalState();
    onClose();
    onOpenAuth();
  };

  const handleOpenNicknameEditor = () => {
    resetModalState();
    onClose();
    onOpenNicknameEditor?.();
  };

  const handleOpenAgreement = () => {
    resetModalState();
    onClose();
    onOpenAgreement?.();
  };

  const handleSignOut = async () => {
    resetModalState();
    await signOutFromSupabase();
    onClose();
  };

  const openCreateReminder = () => {
    setEditingReminderId('new');
    setPickerTime(parseReminderTime(reminders[reminders.length - 1]?.time || DEFAULT_REMINDER_TIME));
    setIsTimePickerOpen(true);
  };

  const openEditReminder = reminder => {
    setEditingReminderId(reminder.id);
    setPickerTime(parseReminderTime(reminder.time));
    setIsTimePickerOpen(true);
  };

  const handlePickerValueChange = field => event => {
    const nextValue = event.target.value;
    setPickerTime(prev => ({
      ...prev,
      [field]: nextValue
    }));
  };

  const handleApplyReminderTime = () => {
    const nextTime = toReminderTimeValue(pickerTime);

    if (editingReminderId === 'new') {
      addReminder(nextTime);
    } else if (editingReminderId) {
      updateReminder(editingReminderId, nextTime);
    }

    resetReminderEditor();
  };

  const handleDeleteReminder = reminderId => {
    if (editingReminderId === reminderId) {
      resetReminderEditor();
    }

    deleteReminder(reminderId);
  };

  return (
    <div className="settings-overlay" onClick={handleClose}>
      <div className="glass-panel settings-modal" onClick={event => event.stopPropagation()}>
        <div className="settings-header">
          <div>
            <h2>설정</h2>
          </div>
          <button type="button" className="settings-close" onClick={handleClose} aria-label="설정 닫기">
            &times;
          </button>
        </div>

        <div className="settings-section">
          <div className="settings-section-copy settings-section-copy-row">
            <h3>계정</h3>
            {!isAuthLoading && authUser && (
              <button
                type="button"
                className={`settings-account-toggle ${isAccountActionsOpen ? 'open' : ''}`}
                onClick={() => setIsAccountActionsOpen(prev => !prev)}
                aria-expanded={isAccountActionsOpen}
                aria-label="계정 기능 열기"
              >
                <ChevronIcon isOpen={isAccountActionsOpen} className="settings-account-chevron" />
              </button>
            )}
          </div>

          {isAuthLoading && (
            <div className="settings-note">로그인 상태를 확인하고 있어요.</div>
          )}

          {!isAuthLoading && authUser && (
            <>
              <div className="settings-account-card">
                <div className="settings-account-copy">
                  <strong>{authUserNickname || '나'}</strong>
                  <span>{authUser.email}</span>
                </div>
              </div>

              {isAccountActionsOpen && (
                <div className="settings-account-panel">
                  <div className="settings-button-stack">
                <button
                  type="button"
                  className="settings-action-btn"
                  onClick={handleOpenAgreement}
                  disabled={isAuthBusy}
                >
                  동의 사항
                </button>
                <button
                  type="button"
                  className="settings-action-btn"
                  onClick={handleOpenNicknameEditor}
                  disabled={isAuthBusy}
                >
                  닉네임 바꾸기
                </button>
                <button
                  type="button"
                  className="settings-secondary-btn"
                  onClick={handleSignOut}
                  disabled={isAuthBusy}
                >
                  {isAuthBusy ? '처리 중...' : '로그아웃하기'}
                </button>
                  </div>
                </div>
              )}
            </>
          )}

          {!isAuthLoading && !authUser && (
            <>
              {isGuestMode && (
                <div className="settings-note settings-guest-state">게스트로 사용 중이에요.</div>
              )}
              <button type="button" className="settings-action-btn" onClick={handleOpenAuth}>
                로그인하기
              </button>
            </>
          )}
        </div>

        <div className="settings-section">
          <div className="settings-section-copy">
            <h3>다크모드</h3>
            <p>밝은 화면과 어두운 화면 중 편한 분위기로 바꿀 수 있어요.</p>
          </div>
          <button
            type="button"
            className={`settings-action-btn ${isDarkMode ? 'active' : ''}`}
            onClick={toggleTheme}
          >
            {isDarkMode ? '다크모드 켜짐' : '다크모드 꺼짐'}
          </button>
        </div>

        <div className="settings-section">
          <div className="settings-section-copy">
            <h3>행복 알림</h3>
            <p>여러 시간대를 등록해서 하루에 여러 번 행복 알림을 받을 수 있어요.</p>
          </div>

          <div className="settings-reminder-toolbar">
            <button
              type="button"
              className={`settings-action-btn settings-inline-btn ${reminderSettings.enabled ? 'active' : ''}`}
              onClick={() => toggleReminder(!reminderSettings.enabled)}
            >
              {reminderSettings.enabled ? '알림 켜짐' : '알림 꺼짐'}
            </button>

            <button
              type="button"
              className="settings-reminder-add-btn"
              onClick={openCreateReminder}
            >
              <PlusIcon />
              알림 추가
            </button>
          </div>

          {reminders.length > 0 ? (
            <div className="settings-reminder-list">
              {reminders.map((reminder, index) => (
                <div key={reminder.id} className="settings-reminder-item">
                  <button
                    type="button"
                    className={`settings-time-shell ${editingReminderId === reminder.id && isTimePickerOpen ? 'active' : ''}`}
                    onClick={() => openEditReminder(reminder)}
                    aria-label={`알림 ${index + 1} 수정`}
                  >
                    <span className="settings-reminder-order">알림 {index + 1}</span>
                    <strong className="settings-time-text">{formatReminderTimeLabel(reminder.time)}</strong>
                    <ChevronIcon isOpen={editingReminderId === reminder.id && isTimePickerOpen} />
                  </button>

                  <div className="settings-reminder-item-actions">
                    <button
                      type="button"
                      className="settings-reminder-icon-btn"
                      onClick={() => openEditReminder(reminder)}
                      aria-label={`알림 ${index + 1} 수정`}
                    >
                      <EditIcon />
                    </button>
                    <button
                      type="button"
                      className="settings-reminder-icon-btn danger"
                      onClick={() => handleDeleteReminder(reminder.id)}
                      aria-label={`알림 ${index + 1} 삭제`}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="settings-reminder-empty">
              아직 추가한 알림이 없어요. 알림 추가 버튼으로 시간을 더해보세요.
            </div>
          )}

          {isTimePickerOpen && (
            <div className="settings-time-popover">
              <div className="settings-time-popover-header">
                <div>
                  <strong>{timeEditorTitle}</strong>
                  <p>{timeEditorDescription}</p>
                </div>
                <div className="settings-time-preview">{pickerPreviewText}</div>
              </div>

              <div className="settings-period-toggle" role="tablist" aria-label="오전 오후 선택">
                {PERIOD_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    className={`settings-period-btn ${pickerTime.period === option.value ? 'active' : ''}`}
                    onClick={() => setPickerTime(prev => ({ ...prev, period: option.value }))}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="settings-time-select-grid">
                <label className="settings-time-field">
                  <span>시</span>
                  <select value={pickerTime.hour} onChange={handlePickerValueChange('hour')}>
                    {HOUR_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="settings-time-field">
                  <span>분</span>
                  <select value={pickerTime.minute} onChange={handlePickerValueChange('minute')}>
                    {MINUTE_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="settings-time-actions">
                <button
                  type="button"
                  className="settings-time-cancel-btn"
                  onClick={resetReminderEditor}
                >
                  취소
                </button>
                <button
                  type="button"
                  className="settings-time-apply-btn"
                  onClick={handleApplyReminderTime}
                >
                  적용하기
                </button>
              </div>
            </div>
          )}

          <div className="settings-note">{reminderMessage}</div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
