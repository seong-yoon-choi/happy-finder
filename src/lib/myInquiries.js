import { supabase, isSupabaseConfigured } from './supabase';

const WEBSITE_INQUIRIES_TABLE = 'website_inquiries';

const ensureSupabase = () => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('SUPABASE_NOT_CONFIGURED');
  }
};

const ensureTrustedSession = async () => {
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

  const userResult = await supabase.auth.getUser();

  if (userResult.error || !userResult.data?.user?.id) {
    throw new Error('INVALID_USER_SESSION');
  }

  return userResult.data.user;
};

export const listMyInquiries = async () => {
  ensureSupabase();
  await ensureTrustedSession();

  const { data, error } = await supabase
    .from(WEBSITE_INQUIRIES_TABLE)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return Array.isArray(data) ? data : [];
};
