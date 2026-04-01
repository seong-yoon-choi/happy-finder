import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AuthScreen from '../components/AuthScreen';
import { listAdminInquiries, replyAdminInquiry } from '../lib/adminInquiries';
import { useHappy } from '../store/HappyContext';
import './AdminInquiriesPage.css';

const emptyStatus = {
  type: 'idle',
  message: ''
};

const WEB_HOME_PATH = '/';

const typeOptions = [
  { value: 'all', label: '전체 유형' },
  { value: 'qna', label: 'QnA' },
  { value: 'feedback', label: 'Feedback' }
];

const formatDateTime = value => {
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

const getReplyErrorMessage = rawMessage => {
  const message = typeof rawMessage === 'string' ? rawMessage : '';

  if (
    message.includes('AUTH_SESSION_MISSING')
    || message.includes('INVALID_ADMIN_SESSION')
    || message.includes('missing_authorization')
    || message.includes('Missing authorization header')
    || message.includes('invalid_user')
  ) {
    return '로그인 세션이 답변 함수로 전달되지 않았거나 만료됐어요. 로그아웃 후 다시 로그인해서 시도해주세요.';
  }

  if (message.includes('server_not_configured')) {
    return '메일 발송 설정이 비어 있어요. Supabase secrets에 SMTP_PASSWORD 또는 RESEND_API_KEY를 넣어주세요.';
  }

  if (message.includes('Requested function was not found') || message.includes('NOT_FOUND')) {
    return 'reply-website-inquiry 함수가 프로덕션 Supabase에 아직 배포되지 않았어요.';
  }

  if (message.includes('reply_save_failed')) {
    return '답변 저장은 실패했어요. website_inquiries_replies.sql 적용과 DB 권한을 확인해주세요.';
  }

  if (message.includes('inquiry_not_found')) {
    return '해당 문의를 다시 찾지 못했어요. 새로고침 후 다시 시도해주세요.';
  }

  if (
    message.includes('EAUTH')
    || message.includes('535')
    || message.includes('Invalid login')
    || message.includes('authentication')
  ) {
    return 'SMTP 로그인에 실패했어요. SMTP 사용자명과 비밀번호를 확인해주세요.';
  }

  if (
    message.includes('ECONNECTION')
    || message.includes('ETIMEDOUT')
    || message.includes('ESOCKET')
  ) {
    return 'SMTP 서버 연결에 실패했어요. SMTP_HOST, SMTP_PORT, SMTP_SECURE 설정을 확인해주세요.';
  }

  if (message.includes('550') || message.includes('553') || message.includes('554')) {
    return '발신 주소가 SMTP 서버에서 거부됐어요. SUPPORT_EMAIL_FROM과 발신 도메인 설정을 확인해주세요.';
  }

  if (message.includes('missing_recipient_email')) {
    return '문의자 이메일이 없어 답변 메일을 보낼 수 없어요.';
  }

  if (message.includes('permission') || message.includes('forbidden')) {
    return '답변을 보낼 권한이 없어요. 관리자 계정인지 확인해주세요.';
  }

  if (message.includes('edge function returned a non-2xx')) {
    return '답변 함수가 실패했어요. Supabase function logs와 SMTP secrets를 확인해주세요.';
  }

  return '답변 전송 중 문제가 생겼어요.';
};

const AdminInquiriesPage = () => {
  const { authUser, isAuthLoading, isReviewAuthUser } = useHappy();
  const [isAuthScreenOpen, setIsAuthScreenOpen] = useState(false);
  const [inquiries, setInquiries] = useState([]);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState(emptyStatus);
  const [typeFilter, setTypeFilter] = useState('all');
  const [replyingId, setReplyingId] = useState('');
  const [expandedId, setExpandedId] = useState('');

  const isAdmin = isReviewAuthUser;

  const loadInquiries = useCallback(async () => {
    if (!isAdmin) {
      return;
    }

    setIsLoading(true);
    setStatus(emptyStatus);

    try {
      const nextInquiries = await listAdminInquiries();
      setInquiries(nextInquiries);
      setReplyDrafts(prev => {
        const nextDrafts = { ...prev };

        nextInquiries.forEach(inquiry => {
          if (typeof nextDrafts[inquiry.id] !== 'string') {
            nextDrafts[inquiry.id] = typeof inquiry.admin_reply === 'string' ? inquiry.admin_reply : '';
          }
        });

        return nextDrafts;
      });

      setExpandedId(currentExpandedId => {
        if (!currentExpandedId) {
          return '';
        }

        return nextInquiries.some(inquiry => inquiry.id === currentExpandedId) ? currentExpandedId : '';
      });
    } catch (error) {
      const message = typeof error?.message === 'string' ? error.message : '';
      setStatus({
        type: 'error',
        message: message.includes('permission')
          ? '관리자 권한이 없거나 Supabase 정책이 아직 적용되지 않았어요.'
          : '문의 목록을 불러오지 못했어요.'
      });
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!authUser) {
      return;
    }

    setIsAuthScreenOpen(false);
  }, [authUser]);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    loadInquiries();
  }, [isAdmin, loadInquiries]);

  const filteredInquiries = useMemo(() => {
    return inquiries.filter(inquiry => typeFilter === 'all' || inquiry.submission_type === typeFilter);
  }, [inquiries, typeFilter]);

  const handleReplyDraftChange = id => event => {
    const nextValue = event.target.value;
    setReplyDrafts(prev => ({
      ...prev,
      [id]: nextValue
    }));
  };

  const handleToggleInquiry = inquiryId => {
    setExpandedId(current => (current === inquiryId ? '' : inquiryId));
  };

  const handleReplySubmit = async inquiry => {
    const replyMessage = typeof replyDrafts[inquiry.id] === 'string'
      ? replyDrafts[inquiry.id].trim()
      : '';

    if (!replyMessage) {
      setStatus({
        type: 'error',
        message: '답변 내용을 입력해주세요.'
      });
      return;
    }

    if (!inquiry.email) {
      setStatus({
        type: 'error',
        message: '이 문의에는 이메일이 없어 답변 메일을 보낼 수 없어요.'
      });
      return;
    }

    setReplyingId(inquiry.id);
    setStatus(emptyStatus);

    try {
      const updatedInquiry = await replyAdminInquiry({
        inquiryId: inquiry.id,
        replyMessage
      });

      setInquiries(prev => prev.map(entry => (
        entry.id === inquiry.id ? updatedInquiry : entry
      )));
      setReplyDrafts(prev => ({
        ...prev,
        [inquiry.id]: updatedInquiry.admin_reply || replyMessage
      }));
      setStatus({
        type: 'success',
        message: '답변을 저장했고 해당 이메일로 메일을 보냈어요.'
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: getReplyErrorMessage(error?.message)
      });
    } finally {
      setReplyingId('');
    }
  };

  return (
    <div className="admin-inquiries-route">
      <div className="admin-inquiries-page">
        <div className="admin-inquiries-header">
          <div className="admin-inquiries-copy">
            <span className="admin-inquiries-eyebrow">ADMIN</span>
            <h1>QnA &amp; Feedback 관리자</h1>
            <p>제목 목록에서 항목을 열어 문의 내용과 답변을 확인할 수 있어요.</p>
          </div>

          <a href={WEB_HOME_PATH} className="admin-inquiries-secondary-link admin-inquiries-back-link">
            뒤로 돌아가기
          </a>
        </div>

        {isAuthLoading ? (
          <div className="admin-inquiries-note">
            로그인 상태를 확인하고 있어요.
          </div>
        ) : !authUser ? (
          <div className="admin-inquiries-empty">
            <p>관리자 페이지를 보려면 먼저 로그인해주세요.</p>
            <div className="admin-inquiries-actions">
              <button
                type="button"
                className="admin-inquiries-primary-btn"
                onClick={() => setIsAuthScreenOpen(true)}
              >
                로그인하기
              </button>
              <a href={WEB_HOME_PATH} className="admin-inquiries-secondary-link">
                웹으로 돌아가기
              </a>
            </div>
          </div>
        ) : !isAdmin ? (
          <div className="admin-inquiries-empty">
            <p>현재 로그인한 계정은 관리자 권한이 없어요.</p>
            <a href={WEB_HOME_PATH} className="admin-inquiries-secondary-link">
              웹으로 돌아가기
            </a>
          </div>
        ) : (
          <>
            <div className="admin-inquiries-toolbar">
              <label>
                유형
                <select value={typeFilter} onChange={event => setTypeFilter(event.target.value)}>
                  {typeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                className="admin-inquiries-refresh-btn"
                onClick={loadInquiries}
                disabled={isLoading}
              >
                {isLoading ? '불러오는 중...' : '새로고침'}
              </button>
            </div>

            {status.message && (
              <div className={`admin-inquiries-feedback ${status.type}`}>
                {status.message}
              </div>
            )}

            <div className="admin-inquiries-summary">
              전체 {inquiries.length}건 / 현재 필터 {filteredInquiries.length}건
            </div>

            <div className="admin-inquiries-list">
              {filteredInquiries.map(inquiry => {
                const draftReply = typeof replyDrafts[inquiry.id] === 'string'
                  ? replyDrafts[inquiry.id]
                  : (inquiry.admin_reply || '');
                const hasRecipientEmail = typeof inquiry.email === 'string' && inquiry.email.trim();
                const hasExistingReply = typeof inquiry.admin_reply === 'string' && inquiry.admin_reply.trim();
                const isExpanded = expandedId === inquiry.id;

                return (
                  <article
                    key={inquiry.id}
                    className={`admin-inquiries-card ${isExpanded ? 'expanded' : ''}`}
                  >
                    <button
                      type="button"
                      className="admin-inquiries-card-toggle"
                      onClick={() => handleToggleInquiry(inquiry.id)}
                      aria-expanded={isExpanded}
                    >
                      <div className="admin-inquiries-card-toggle-main">
                        <h2>{inquiry.subject || '(제목 없음)'}</h2>
                      </div>

                      <div className="admin-inquiries-card-toggle-side">
                        <span className={`admin-inquiries-chevron ${isExpanded ? 'expanded' : ''}`}>
                          ▾
                        </span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="admin-inquiries-card-content">
                        <div className="admin-inquiries-meta">
                          <span>유형: {inquiry.submission_type}</span>
                          <span>등록: {formatDateTime(inquiry.created_at)}</span>
                          <span>이메일: {inquiry.email || '-'}</span>
                        </div>

                        <p className="admin-inquiries-message">{inquiry.message}</p>

                        {hasExistingReply && (
                          <div className="admin-inquiries-reply-history">
                            <strong>현재 저장된 답변</strong>
                            <p>{inquiry.admin_reply}</p>
                            {inquiry.replied_by_email && (
                              <span>답변자: {inquiry.replied_by_email}</span>
                            )}
                            {inquiry.replied_at && (
                              <span>최근 답변: {formatDateTime(inquiry.replied_at)}</span>
                            )}
                          </div>
                        )}

                        <div className="admin-inquiries-reply-box">
                          <label className="admin-inquiries-reply-field">
                            <span>관리자 답변</span>
                            <textarea
                              value={draftReply}
                              onChange={handleReplyDraftChange(inquiry.id)}
                              placeholder={hasRecipientEmail ? '문의자에게 보낼 답변을 입력해주세요.' : '이 문의에는 이메일이 없어 답변 메일을 보낼 수 없어요.'}
                              rows="6"
                              maxLength="5000"
                              disabled={replyingId === inquiry.id}
                            />
                          </label>

                          <div className="admin-inquiries-reply-actions">
                            {!hasRecipientEmail && (
                              <div className="admin-inquiries-inline-note">
                                이메일이 없는 문의는 메일 발송이 불가능해요.
                              </div>
                            )}

                            <button
                              type="button"
                              className="admin-inquiries-primary-btn"
                              onClick={() => handleReplySubmit(inquiry)}
                              disabled={replyingId === inquiry.id || !hasRecipientEmail || !draftReply.trim()}
                            >
                              {replyingId === inquiry.id ? '보내는 중...' : hasExistingReply ? '답변 다시 보내기' : '답변 보내기'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}

              {filteredInquiries.length === 0 && (
                <div className="admin-inquiries-note">
                  현재 조건에 맞는 문의가 없어요.
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <AuthScreen
        isOpen={isAuthScreenOpen}
        canClose
        initialMode="login"
        onClose={() => setIsAuthScreenOpen(false)}
      />
    </div>
  );
};

export default AdminInquiriesPage;
