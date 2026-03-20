import { supabase, isSupabaseConfigured } from './supabase';

const WEBSITE_INQUIRIES_TABLE = 'website_inquiries';
const REPLY_WEBSITE_INQUIRY_FUNCTION = 'reply-website-inquiry';

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

export const replyAdminInquiry = async ({ inquiryId, replyMessage }) => {
  ensureSupabase();

  const normalizedInquiryId = typeof inquiryId === 'string' ? inquiryId.trim() : '';
  const normalizedReplyMessage = typeof replyMessage === 'string' ? replyMessage.trim() : '';

  if (!normalizedInquiryId || !normalizedReplyMessage) {
    throw new Error('INVALID_REPLY');
  }

  const { data, error } = await supabase.functions.invoke(REPLY_WEBSITE_INQUIRY_FUNCTION, {
    body: {
      inquiryId: normalizedInquiryId,
      replyMessage: normalizedReplyMessage
    }
  });

  if (error) {
    if (typeof error?.context?.json === 'function') {
      const payload = await error.context.json().catch(() => null);

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
  }

  if (!data?.inquiry) {
    throw new Error('INVALID_REPLY_RESPONSE');
  }

  return data.inquiry;
};
