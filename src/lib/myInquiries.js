import { supabase, isSupabaseConfigured } from './supabase';

const MY_INQUIRIES_FUNCTION = 'my-inquiries-list';

const ensureSupabase = () => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('SUPABASE_NOT_CONFIGURED');
  }
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

const unwrapFunctionError = async (error) => {
  if (typeof error?.context?.json === 'function') {
    const payload = await error.context.json().catch(() => null);

    if (payload?.error === 'invalid_user') {
      throw new Error('INVALID_USER_SESSION');
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
  }

  if (typeof error?.context?.text === 'function') {
    const text = await error.context.text().catch(() => '');

    if (typeof text === 'string' && text.trim()) {
      throw new Error(text.trim());
    }
  }

  throw error;
};

export const listMyInquiries = async () => {
  ensureSupabase();

  const headers = await getAuthHeaders();
  const { data, error } = await supabase.functions.invoke(MY_INQUIRIES_FUNCTION, {
    headers,
    body: {}
  });

  if (error) {
    await unwrapFunctionError(error);
  }

  if (!Array.isArray(data?.inquiries)) {
    throw new Error('INVALID_INQUIRIES_RESPONSE');
  }

  return data.inquiries;
};
