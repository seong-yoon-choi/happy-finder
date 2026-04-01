import { supabase, isSupabaseConfigured } from './supabase';

const WEBSITE_INQUIRIES_TABLE = 'website_inquiries';
const LIST_WEBSITE_INQUIRIES_FUNCTION = 'admin-inquiries-list';
const REPLY_WEBSITE_INQUIRY_FUNCTION = 'reply-website-inquiry';
const REVIEW_ADMIN_AUTH_STORAGE_KEY = 'happy_review_admin_auth_user';

const ensureSupabase = () => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('SUPABASE_NOT_CONFIGURED');
  }
};

const readStoredReviewAdminToken = () => {
  if (typeof window === 'undefined') {
    return '';
  }

  try {
    const rawValue = window.localStorage.getItem(REVIEW_ADMIN_AUTH_STORAGE_KEY);

    if (!rawValue) {
      return '';
    }

    const parsedValue = JSON.parse(rawValue);
    return typeof parsedValue?.reviewAdminToken === 'string'
      ? parsedValue.reviewAdminToken.trim()
      : '';
  } catch {
    return '';
  }
};

const unwrapFunctionError = async (error) => {
  if (typeof error?.context?.json === 'function') {
    const payload = await error.context.json().catch(() => null);

    if (payload?.error === 'invalid_user' || payload?.error === 'invalid_review_admin_session') {
      throw new Error('INVALID_ADMIN_SESSION');
    }

    if (payload?.error === 'missing_authorization') {
      throw new Error('AUTH_SESSION_MISSING');
    }

    if (payload?.error) {
      throw new Error(String(payload.error));
    }

    if (payload?.message) {
      throw new Error(String(payload.message));
    }

    if (payload?.code) {
      throw new Error(String(payload.code));
    }
  }

  if (typeof error?.context?.text === 'function') {
    const text = await error.context.text().catch(() => '');

    if (typeof text === 'string' && text.trim()) {
      throw new Error(text.trim());
    }
  }

  throw error;
};

const getAuthHeaders = async () => {
  ensureSupabase();

  let { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  let session = data?.session ?? null;

  if (!session?.access_token) {
    const refreshResult = await supabase.auth.refreshSession();

    if (refreshResult.error) {
      throw refreshResult.error;
    }

    session = refreshResult.data?.session ?? null;
  }

  const accessToken = typeof session?.access_token === 'string'
    ? session.access_token.trim()
    : '';

  if (!accessToken) {
    throw new Error('AUTH_SESSION_MISSING');
  }

  return {
    Authorization: `Bearer ${accessToken}`
  };
};

const invokeAdminFunction = async (functionName, body = {}) => {
  ensureSupabase();

  const reviewAdminToken = readStoredReviewAdminToken();
  const requestBody = reviewAdminToken
    ? { ...body, reviewAdminToken }
    : body;
  const headers = reviewAdminToken ? undefined : await getAuthHeaders();

  const { data, error } = await supabase.functions.invoke(functionName, {
    body: requestBody,
    ...(headers ? { headers } : {})
  });

  if (error) {
    await unwrapFunctionError(error);
  }

  return data;
};

export const listAdminInquiries = async () => {
  const reviewAdminToken = readStoredReviewAdminToken();

  if (reviewAdminToken) {
    const data = await invokeAdminFunction(LIST_WEBSITE_INQUIRIES_FUNCTION);

    if (!Array.isArray(data?.inquiries)) {
      throw new Error('INVALID_INQUIRIES_RESPONSE');
    }

    return data.inquiries;
  }

  ensureSupabase();

  const { data, error } = await supabase
    .from(WEBSITE_INQUIRIES_TABLE)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data : [];
};

export const replyAdminInquiry = async ({ inquiryId, replyMessage }) => {
  const normalizedInquiryId = typeof inquiryId === 'string' ? inquiryId.trim() : '';
  const normalizedReplyMessage = typeof replyMessage === 'string' ? replyMessage.trim() : '';

  if (!normalizedInquiryId || !normalizedReplyMessage) {
    throw new Error('INVALID_REPLY');
  }

  const data = await invokeAdminFunction(REPLY_WEBSITE_INQUIRY_FUNCTION, {
    inquiryId: normalizedInquiryId,
    replyMessage: normalizedReplyMessage
  });

  if (!data?.inquiry) {
    throw new Error('INVALID_REPLY_RESPONSE');
  }

  return data.inquiry;
};
