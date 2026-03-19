import { supabase, isSupabaseConfigured } from './supabase';

const WEBSITE_INQUIRIES_TABLE = 'website_inquiries';

const ensureSupabase = () => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('SUPABASE_NOT_CONFIGURED');
  }
};

export const listAdminInquiries = async () => {
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

export const updateAdminInquiryStatus = async (id, status) => {
  ensureSupabase();

  const { data, error } = await supabase
    .from(WEBSITE_INQUIRIES_TABLE)
    .update({ status })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
};
