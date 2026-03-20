import React, { useEffect, useMemo, useState } from 'react';
import AuthScreen from '../components/AuthScreen';
import { listAdminInquiries, replyAdminInquiry } from '../lib/adminInquiries';
import { isAdminEmail } from '../lib/adminAccess';
import { APP_PATH } from '../lib/routes';
import { useHappy } from '../store/HappyContext';
import './AdminInquiriesPage.css';

const emptyStatus = {
  type: 'idle',
  message: ''
};

const typeOptions = [
  { value: 'all', label: '전체 유형' },
  { value: 'qna', label: 'QnA' },
  { value: 'feedback', label: 'Feedback' }
];

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

const AdminInquiriesPage = () => {
  const { authUser, isAuthLoading } = useHappy();
  const [isAuthScreenOpen, setIsAuthScreenOpen] = useState(false);
  const [inquiries, setInquiries] = useState([]);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState(emptyStatus);
  const [typeFilter, setTypeFilter] = useState('all');
  const [replyingId, setReplyingId] = useState('');

  const isAdmin = isAdminEmail(authUser?.email);

  const loadInquiries = async () => {
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
  };

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
  }, [isAdmin]);

  const filteredInquiries = useMemo(() => {
    return inquiries.filter(inquiry => {
      return typeFilter === 'all' || inquiry.submission_type === typeFilter;
    });
  }, [inquiries, typeFilter]);

  const handleReplyDraftChange = id => event => {
    const nextValue = event.target.value;
    setReplyDrafts(prev => ({
      ...prev,
      [id]: nextValue
    }));
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
        message: '답변을 저장했고, 해당 이메일로 메일도 보냈어요.'
      });
    } catch (error) {
      const message = typeof error?.message === 'string' ? error.message : '';
      setStatus({
        type: 'error',
        message: message.includes('server_not_configured')
          ? '메일 발송 함수 설정이 비어 있어요. .env.local이 아니라 Supabase secrets에 RESEND_API_KEY를 넣어주세요.'
          : message.includes('Requested function was not found') || message.includes('NOT_FOUND')
            ? 'reply-website-inquiry 함수가 프로덕션 Supabase에 아직 배포되지 않았어요. Edge Function을 deploy 해주세요.'
          : message.includes('reply_save_failed')
            ? '답변 저장용 컬럼이 없거나 DB 저장에 실패했어요. website_inquiries_replies.sql 적용 여부를 확인해주세요.'
            : message.includes('inquiry_not_found')
              ? '해당 문의를 다시 찾지 못했어요. 새로고침 후 다시 시도해주세요.'
              : message.includes('email_send_failed')
                ? '메일 발송 서비스에서 오류가 났어요. Resend 설정을 확인해주세요.'
                : message.includes('verify a domain')
                  ? '커스텀 발신 주소를 쓰려면 Resend에서 도메인 검증이 필요해요. 없으면 기본 onboarding 발신 주소로만 테스트하세요.'
                  : message.includes('You can only send testing emails')
                    ? '기본 onboarding 발신 주소는 테스트 수신 조건이 있어요. 운영용으로는 Resend 검증 도메인 발신 주소를 설정해주세요.'
                    : message.includes('missing_recipient_email')
                      ? '문의자의 이메일이 없어 답변 메일을 보낼 수 없어요.'
                      : message.includes('permission') || message.includes('forbidden')
                        ? '답변을 보낼 권한이 없어요. 관리자 계정과 함수 배포 상태를 확인해주세요.'
                        : message.includes('edge function returned a non-2xx')
                          ? '답변 함수가 실패했어요. Supabase 함수 로그와 secrets를 확인해주세요.'
                          : '답변 전송 중 문제가 생겼어요.'
      });
    } finally {
      setReplyingId('');
    }
  };

  return (
    <div className="admin-inquiries-route">
      <div className="admin-inquiries-page">
        <div className="admin-inquiries-copy">
          <span className="admin-inquiries-eyebrow">ADMIN</span>
          <h1>QnA &amp; Feedback 관리자</h1>
          <p>문의와 피드백을 확인하고, 관리자 답변을 바로 이메일로 보낼 수 있어요.</p>
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
              <a href={APP_PATH} className="admin-inquiries-secondary-link">
                앱으로 돌아가기
              </a>
            </div>
          </div>
        ) : !isAdmin ? (
          <div className="admin-inquiries-empty">
            <p>현재 로그인한 계정은 관리자 권한이 없어요.</p>
            <a href={APP_PATH} className="admin-inquiries-secondary-link">
              앱으로 돌아가기
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

                return (
                  <article key={inquiry.id} className="admin-inquiries-card">
                    <div className="admin-inquiries-card-top">
                      <div>
                        <span className={`admin-inquiries-type ${inquiry.submission_type}`}>
                          {inquiry.submission_type}
                        </span>
                        <h2>{inquiry.subject || '(제목 없음)'}</h2>
                      </div>

                      <div className="admin-inquiries-card-side">
                        <span className="admin-inquiries-date">{formatDateTime(inquiry.created_at)}</span>
                        {inquiry.replied_at && (
                          <span className="admin-inquiries-replied-at">
                            최근 답변: {formatDateTime(inquiry.replied_at)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="admin-inquiries-meta">
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
