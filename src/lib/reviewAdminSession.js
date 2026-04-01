import { supabase, isSupabaseConfigured } from './supabase';
import { createReviewAdminUser } from './reviewAdminAccess';

const REVIEW_ADMIN_LOGIN_FUNCTION = 'review-admin-login';

const ensureSupabase = () => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('SUPABASE_NOT_CONFIGURED');
  }
};

const unwrapFunctionError = async (error) => {
  if (typeof error?.context?.json === 'function') {
    const payload = await error.context.json().catch(() => null);

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

export const requestReviewAdminSession = async ({ usernameOrEmail, password }) => {
  ensureSupabase();

  const { data, error } = await supabase.functions.invoke(REVIEW_ADMIN_LOGIN_FUNCTION, {
    body: {
      usernameOrEmail,
      password
    }
  });

  if (error) {
    await unwrapFunctionError(error);
  }

  const reviewAdminToken = typeof data?.sessionToken === 'string'
    ? data.sessionToken.trim()
    : '';

  if (!reviewAdminToken) {
    throw new Error('INVALID_REVIEW_ADMIN_SESSION');
  }

  const reviewAdminUser = data?.user && typeof data.user === 'object'
    ? data.user
    : {};

  return {
    ...createReviewAdminUser(),
    ...reviewAdminUser,
    reviewAdminToken
  };
};
