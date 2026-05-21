export const HAPPINESS_ITEM_NOTIFICATIONS_TABLE = 'happiness_item_notifications';

const CREATE_EMPATHY_NOTIFICATION_RPC = 'create_happiness_item_empathy_notification';
const EMPATHY_NOTIFICATION_MESSAGE = '누군가가 내 행복에 공감을 했습니다.';

const normalizeNotification = notification => {
  const message = typeof notification?.message === 'string' && notification.message.trim()
    ? notification.message.trim()
    : EMPATHY_NOTIFICATION_MESSAGE;

  return {
    id: typeof notification?.id === 'string' ? notification.id : '',
    type: typeof notification?.type === 'string' ? notification.type : 'empathy',
    itemId: typeof notification?.item_id === 'string' ? notification.item_id : '',
    message,
    itemSnapshotTitle: typeof notification?.item_snapshot_title === 'string'
      ? notification.item_snapshot_title
      : '',
    createdAt: typeof notification?.created_at === 'string' ? notification.created_at : ''
  };
};

export const createEmpathyNotification = async ({ supabase, itemId }) => {
  if (!supabase || typeof itemId !== 'string' || !itemId.trim()) {
    return { success: false };
  }

  const { data, error } = await supabase.rpc(CREATE_EMPATHY_NOTIFICATION_RPC, {
    target_item_id: itemId
  });

  if (error) {
    return { success: false, error };
  }

  return { success: true, notificationId: typeof data === 'string' ? data : null };
};

export const fetchUnreadHappinessNotifications = async ({ supabase, recipientUserId, limit = 20 }) => {
  if (!supabase || typeof recipientUserId !== 'string' || !recipientUserId.trim()) {
    return { success: false, notifications: [] };
  }

  const { data, error } = await supabase
    .from(HAPPINESS_ITEM_NOTIFICATIONS_TABLE)
    .select('id, type, item_id, message, item_snapshot_title, created_at')
    .eq('recipient_user_id', recipientUserId)
    .is('read_at', null)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    return { success: false, error, notifications: [] };
  }

  return {
    success: true,
    notifications: Array.isArray(data) ? data.map(normalizeNotification) : []
  };
};

export const markHappinessNotificationsRead = async ({ supabase, notificationIds }) => {
  const normalizedIds = Array.isArray(notificationIds)
    ? [...new Set(notificationIds.filter(id => typeof id === 'string' && id.trim()))]
    : [];

  if (!supabase || normalizedIds.length === 0) {
    return { success: false };
  }

  const { error } = await supabase
    .from(HAPPINESS_ITEM_NOTIFICATIONS_TABLE)
    .update({ read_at: new Date().toISOString() })
    .in('id', normalizedIds);

  if (error) {
    return { success: false, error };
  }

  return { success: true };
};

export const subscribeToHappinessNotifications = ({ supabase, recipientUserId, onNotification }) => {
  if (
    !supabase
    || typeof recipientUserId !== 'string'
    || !recipientUserId.trim()
    || typeof onNotification !== 'function'
  ) {
    return null;
  }

  return supabase
    .channel(`happiness-item-notifications:${recipientUserId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: HAPPINESS_ITEM_NOTIFICATIONS_TABLE,
        filter: `recipient_user_id=eq.${recipientUserId}`
      },
      payload => {
        if (!payload?.new || payload.new.read_at) {
          return;
        }

        onNotification(normalizeNotification(payload?.new));
      }
    )
    .subscribe();
};
