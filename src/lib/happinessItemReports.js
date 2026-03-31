import { isSupabaseConfigured, supabase } from './supabase';

export const OTHER_REPORT_REASON_CODE = 'other';

export const REPORT_REASON_OPTIONS = [
  { code: 'sexual_content', label: '선정적인 문구' },
  { code: 'violent_content', label: '폭력성을 유발하는 문구' },
  { code: 'hate_or_harassment', label: '혐오 또는 괴롭힘 표현' },
  { code: 'spam_or_advertising', label: '스팸 또는 광고성 내용' },
  { code: 'dangerous_behavior', label: '위험한 행동을 유도하는 내용' },
  { code: OTHER_REPORT_REASON_CODE, label: '기타' }
];

const HAPPINESS_ITEM_REPORTS_TABLE = 'happiness_item_reports';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const normalizeUuid = value => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();
  return UUID_PATTERN.test(trimmedValue) ? trimmedValue : null;
};

export const hasExistingHappinessItemReport = async ({
  itemId,
  reporterUserId
}) => {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, code: 'SUPABASE_NOT_CONFIGURED', hasReported: false };
  }

  const normalizedItemId = typeof itemId === 'string' ? itemId.trim() : '';
  const normalizedReporterUserId = normalizeUuid(reporterUserId);

  if (!normalizedItemId || !normalizedReporterUserId) {
    return { success: false, code: 'INVALID_LOOKUP', hasReported: false };
  }

  const { data, error } = await supabase
    .from(HAPPINESS_ITEM_REPORTS_TABLE)
    .select('id')
    .eq('item_id', normalizedItemId)
    .eq('reporter_user_id', normalizedReporterUserId)
    .limit(1);

  if (error) {
    return { success: false, code: 'LOOKUP_FAILED', error, hasReported: false };
  }

  return {
    success: true,
    hasReported: Array.isArray(data) && data.length > 0
  };
};

export const createHappinessItemReport = async ({
  item,
  reporterUserId = null,
  reasonCodes = [],
  otherReason = ''
}) => {
  if (!isSupabaseConfigured || !supabase) {
    return { success: false, code: 'SUPABASE_NOT_CONFIGURED' };
  }

  const normalizedItemId = typeof item?.id === 'string' ? item.id.trim() : '';
  const normalizedReasonCodes = Array.isArray(reasonCodes)
    ? Array.from(new Set(reasonCodes.filter(code => REPORT_REASON_OPTIONS.some(option => option.code === code))))
    : [];
  const normalizedOtherReason = typeof otherReason === 'string' ? otherReason.trim() : '';

  if (!normalizedItemId) {
    return { success: false, code: 'INVALID_ITEM' };
  }

  if (normalizedReasonCodes.length === 0) {
    return { success: false, code: 'REASONS_REQUIRED' };
  }

  if (normalizedReasonCodes.includes(OTHER_REPORT_REASON_CODE) && !normalizedOtherReason) {
    return { success: false, code: 'OTHER_REASON_REQUIRED' };
  }

  const { error } = await supabase
    .from(HAPPINESS_ITEM_REPORTS_TABLE)
    .insert({
      item_id: normalizedItemId,
      reported_item_owner_user_id: normalizeUuid(item?.creatorId),
      reporter_user_id: normalizeUuid(reporterUserId),
      reason_codes: normalizedReasonCodes,
      other_reason: normalizedOtherReason || null,
      item_snapshot_title: typeof item?.title === 'string' ? item.title.trim() : '',
      item_snapshot_description: typeof item?.description === 'string' ? item.description.trim() : ''
    });

  if (error) {
    return { success: false, code: 'INSERT_FAILED', error };
  }

  return { success: true };
};
