import React, { useEffect, useMemo, useState } from 'react';
import AuthScreen from '../components/AuthScreen';
import { listAdminInquiries, updateAdminInquiryStatus } from '../lib/adminInquiries';
import { isAdminEmail } from '../lib/adminAccess';
import { APP_PATH } from '../lib/routes';
import { useHappy } from '../store/HappyContext';
import './AdminInquiriesPage.css';

const emptyStatus = {
  type: 'idle',
  message: ''
};

const statusOptions = [
  { value: 'all', label: '전체 상태' },
  { value: 'received', label: 'received' },
  { value: 'reviewing', label: 'reviewing' },
  { value: 'resolved', label: 'resolved' },
  { value: 'archived', label: 'archived' }
];

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
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState(emptyStatus);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState('');

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
    } catch (error) {
      const message = typeof error?.message === 'string' ? error.message : '';
      setStatus({
        type: 'error',
        message: message.includes('permission')
          ? '관리자 권한이 없거나 Supabase 정책이 아직 배포되지 않았어요.'
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
      const matchesType = typeFilter === 'all' || inquiry.submission_type === typeFilter;
      const matchesStatus = statusFilter === 'all' || inquiry.status === statusFilter;
      return matchesType && matchesStatus;
    });
  }, [inquiries, statusFilter, typeFilter]);

  const handleStatusChange = async (id, nextStatus) => {
    setUpdatingId(id);
    setStatus(emptyStatus);

    try {
      const updatedInquiry = await updateAdminInquiryStatus(id, nextStatus);
      setInquiries(prev => prev.map(inquiry => (
        inquiry.id === id ? updatedInquiry : inquiry
      )));
      setStatus({
        type: 'success',
        message: '문의 상태를 업데이트했어요.'
      });
    } catch (error) {
      const message = typeof error?.message === 'string' ? error.message : '';
      setStatus({
        type: 'error',
        message: message.includes('permission')
          ? '상태를 변경할 권한이 없어요. 정책 배포 상태를 확인해주세요.'
          : '문의 상태를 업데이트하지 못했어요.'
      });
    } finally {
      setUpdatingId('');
    }
  };

  return (
    <div className="admin-inquiries-route">
      <div className="admin-inquiries-page">
        <div className="admin-inquiries-copy">
          <span className="admin-inquiries-eyebrow">ADMIN</span>
          <h1>QnA &amp; Feedback 관리자</h1>
          <p>문의와 피드백을 확인하고 처리 상태를 관리하는 전용 페이지입니다.</p>
        </div>

        {isAuthLoading ? (
          <div className="admin-inquiries-note">
            로그인 상태를 확인하고 있어요.
          </div>
        ) : !authUser ? (
          <div className="admin-inquiries-empty">
            <p>관리자 페이지를 보려면 먼저 로그인해야 합니다.</p>
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
            <p>현재 로그인한 계정은 관리자 권한이 없습니다.</p>
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

              <label>
                상태
                <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
                  {statusOptions.map(option => (
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
                {isLoading ? '새로고침 중...' : '새로고침'}
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
              {filteredInquiries.map(inquiry => (
                <article key={inquiry.id} className="admin-inquiries-card">
                  <div className="admin-inquiries-card-top">
                    <div>
                      <span className={`admin-inquiries-type ${inquiry.submission_type}`}>
                        {inquiry.submission_type}
                      </span>
                      <h2>{inquiry.subject || '(제목 없음)'}</h2>
                    </div>

                    <label className="admin-inquiries-status-field">
                      상태
                      <select
                        value={inquiry.status}
                        onChange={event => handleStatusChange(inquiry.id, event.target.value)}
                        disabled={updatingId === inquiry.id}
                      >
                        {statusOptions.filter(option => option.value !== 'all').map(option => (
                          <option key={option.value} value={option.value}>
                            {option.value}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="admin-inquiries-meta">
                    <span>이름: {inquiry.name || '-'}</span>
                    <span>이메일: {inquiry.email || '-'}</span>
                    <span>접수: {formatDateTime(inquiry.created_at)}</span>
                    {Number.isFinite(inquiry.score) && <span>만족도: {inquiry.score}</span>}
                  </div>

                  <p className="admin-inquiries-message">{inquiry.message}</p>
                </article>
              ))}

              {filteredInquiries.length === 0 && (
                <div className="admin-inquiries-note">
                  현재 조건에 맞는 문의가 없습니다.
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
