import { supabase, isSupabaseConfigured } from './supabase';

const WEBSITE_INTAKE_TABLE = 'website_inquiries';

const normalizeText = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

export const submitWebsiteIntake = async ({
  submissionType,
  name,
  email,
  accountUserId,
  accountEmail,
  subject,
  message,
  score
}) => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('SUPABASE_NOT_CONFIGURED');
  }

  const normalizedSubmissionType = normalizeText(submissionType);
  const normalizedMessage = normalizeText(message);

  if (!normalizedSubmissionType || !normalizedMessage) {
    throw new Error('INVALID_SUBMISSION');
  }

  const payload = {
    submission_type: normalizedSubmissionType,
    name: normalizeText(name),
    email: normalizeText(email)?.toLowerCase() || null,
    account_user_id: normalizeText(accountUserId),
    account_email: normalizeText(accountEmail)?.toLowerCase() || null,
    subject: normalizeText(subject),
    message: normalizedMessage,
    score: Number.isFinite(score) ? score : null,
    page_path: typeof window === 'undefined' ? null : window.location.pathname,
    user_agent: typeof navigator === 'undefined' ? null : navigator.userAgent
  };

  const { error } = await supabase
    .from(WEBSITE_INTAKE_TABLE)
    .insert(payload);

  if (error) {
    throw error;
  }
};
