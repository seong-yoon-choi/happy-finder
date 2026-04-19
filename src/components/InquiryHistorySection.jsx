import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { listMyInquiries } from '../lib/myInquiries';
import { useHappy } from '../store/HappyContext';
import './InquiryHistorySection.css';

const emptyStatus = {
  type: 'idle',
  message: ''
};

const submissionTypeLabels = {
  qna: 'QnA',
  feedback: 'Feedback'
};

const getStatusMessage = (error) => {
  const message = typeof error?.message === 'string' ? error.message : '';
  const normalizedMessage = message.toLowerCase();

  if (
    message.includes('AUTH_SESSION_MISSING')
    || message.includes('INVALID_USER_SESSION')
    || normalizedMessage.includes('invalid_user')
  ) {
    return '로그인 정보를 다시 확인한 뒤 문의 내역을 새로 불러와 주세요.';
  }

  if (message.includes('SUPABASE_NOT_CONFIGURED')) {
    return '문의 내역 연결이 아직 준비되지 않았어요.';
  }

  if (
    normalizedMessage.includes('permission denied')
    || normalizedMessage.includes('row-level security')
    || normalizedMessage.includes('42501')
  ) {
    return '문의 내역을 불러올 권한 설정을 다시 적용하고 있어요. 잠시 후 다시 시도해 주세요.';
  }

  return '문의 내역을 불러오는 중 문제가 생겼어요. 새로고침 후 다시 확인해 주세요.';
};

const formatDateTime = (value) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

const ChevronIcon = ({ isOpen = false }) => (
  <span className={`inquiry-history-chevron ${isOpen ? 'open' : ''}`.trim()} aria-hidden="true">
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

const InquiryHistorySection = ({ variant = 'profile' }) => {
  const { authUser, isAuthLoading, isReviewAuthUser } = useHappy();
  const [inquiries, setInquiries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState(emptyStatus);
  const [openInquiryIds, setOpenInquiryIds] = useState([]);

  const accountUserId = useMemo(() => {
    if (typeof authUser?.id !== 'string') {
      return '';
    }

    return authUser.id.trim();
  }, [authUser?.id]);

  const loadInquiries = useCallback(async () => {
    if (!authUser || !accountUserId || isReviewAuthUser) {
      setInquiries([]);
      setStatus(emptyStatus);
      return;
    }

    setIsLoading(true);
    setStatus(emptyStatus);

    try {
      const nextInquiries = await listMyInquiries();
      setInquiries(nextInquiries);
    } catch (error) {
      setStatus({
        type: 'error',
        message: getStatusMessage(error)
      });
    } finally {
      setIsLoading(false);
    }
  }, [accountUserId, authUser, isReviewAuthUser]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    void loadInquiries();
  }, [isAuthLoading, loadInquiries]);

  useEffect(() => {
    setOpenInquiryIds(prev => prev.filter(id => inquiries.some(inquiry => inquiry.id === id)));
  }, [inquiries]);

  const toggleInquiry = (inquiryId) => {
    setOpenInquiryIds(prev => (
      prev.includes(inquiryId)
        ? prev.filter(id => id !== inquiryId)
        : [...prev, inquiryId]
    ));
  };

  if (isAuthLoading) {
    return (
      <div className={`inquiry-history-shell ${variant}`}>
        <div className="inquiry-history-note">
          문의 내역을 준비하고 있어요.
        </div>
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className={`inquiry-history-shell ${variant}`}>
        <div className="inquiry-history-empty">
          로그인한 계정의 문의 내역과 답변은 프로필에서 확인할 수 있어요.
        </div>
      </div>
    );
  }

  if (isReviewAuthUser) {
    return (
      <div className={`inquiry-history-shell ${variant}`}>
        <div className="inquiry-history-empty">
          관리자 테스트 세션에서는 개인 문의 내역을 표시하지 않아요.
        </div>
      </div>
    );
  }

  return (
    <div className={`inquiry-history-shell ${variant}`}>
      <div className="inquiry-history-header">
        <div className="inquiry-history-copy">
          <span className="inquiry-history-eyebrow">MY SUPPORT</span>
          <h3>내 문의와 답변</h3>
          <p>로그인한 계정으로 남긴 QnA, Feedback 내역을 확인할 수 있어요.</p>
        </div>

        <button
          type="button"
          className="inquiry-history-refresh-btn"
          onClick={loadInquiries}
          disabled={isLoading}
        >
          {isLoading ? '불러오는 중...' : '새로고침'}
        </button>
      </div>

      {status.message && (
        <div className={`inquiry-history-feedback ${status.type}`}>
          {status.message}
        </div>
      )}

      {isLoading ? (
        <div className="inquiry-history-note">
          문의 내역을 불러오고 있어요.
        </div>
      ) : inquiries.length === 0 ? (
        <div className="inquiry-history-empty">
          아직 이 계정으로 남긴 문의가 없어요.
        </div>
      ) : (
        <div className="inquiry-history-list">
          {inquiries.map(inquiry => {
            const typeLabel = submissionTypeLabels[inquiry.submission_type] || '문의';
            const hasReply = typeof inquiry.admin_reply === 'string' && inquiry.admin_reply.trim();
            const isOpen = openInquiryIds.includes(inquiry.id);

            return (
              <article
                key={inquiry.id}
                className={`inquiry-history-card ${hasReply ? 'answered' : 'pending'} ${isOpen ? 'open' : ''}`}
              >
                <button
                  type="button"
                  className="inquiry-history-card-toggle"
                  onClick={() => toggleInquiry(inquiry.id)}
                  aria-expanded={isOpen}
                >
                  <h4>{inquiry.subject || '(제목 없음)'}</h4>
                  <ChevronIcon isOpen={isOpen} />
                </button>

                {isOpen && (
                  <div className="inquiry-history-card-content">
                    <div className="inquiry-history-card-head">
                      <div className="inquiry-history-card-meta">
                        <span className="inquiry-history-type">{typeLabel}</span>
                        <span className={`inquiry-history-status ${hasReply ? 'answered' : 'pending'}`}>
                          {hasReply ? '답변 완료' : '접수됨'}
                        </span>
                      </div>
                      <span className="inquiry-history-date">{formatDateTime(inquiry.created_at)}</span>
                    </div>

                    <div className="inquiry-history-block">
                      <strong>문의 내용</strong>
                      <p>{inquiry.message || '-'}</p>
                    </div>

                    <div className={`inquiry-history-block reply ${hasReply ? 'answered' : 'pending'}`}>
                      <strong>받은 답변</strong>
                      <p>{hasReply ? inquiry.admin_reply : '아직 답변이 등록되지 않았어요.'}</p>
                      {hasReply && inquiry.replied_at && (
                        <span className="inquiry-history-reply-date">
                          답변 등록: {formatDateTime(inquiry.replied_at)}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default InquiryHistorySection;
