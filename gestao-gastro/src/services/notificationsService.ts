export type SystemNotificationType = 'update' | 'security' | 'backup' | 'info' | 'promo';
export type SystemNotificationPriority = 'low' | 'normal' | 'high';
export type SystemNotificationStatus = 'active' | 'scheduled' | 'expired';

export interface SystemNotification {
  id: string;
  type: SystemNotificationType;
  priority: SystemNotificationPriority;
  title: string;
  body: string;
  details: string;
  published: string;
  expires: string | null;
  targets: string[];
  version: string;
  target_license?: string | null;
  status: SystemNotificationStatus;
}

const NOTIFICATION_TARGET = 'gastro';
const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? '/api_notificacoes.php'
  : 'https://sistemasdegestao.tech/api_notificacoes.php';

const allowedTypes: SystemNotificationType[] = ['update', 'security', 'backup', 'info', 'promo'];
const allowedPriorities: SystemNotificationPriority[] = ['low', 'normal', 'high'];

const normalizeNotification = (notification: any): SystemNotification => {
  const type = allowedTypes.includes(String(notification?.type || '').toLowerCase() as SystemNotificationType)
    ? String(notification.type).toLowerCase() as SystemNotificationType
    : 'info';
  const priority = allowedPriorities.includes(String(notification?.priority || '').toLowerCase() as SystemNotificationPriority)
    ? String(notification.priority).toLowerCase() as SystemNotificationPriority
    : 'normal';
  const publishedAt = notification?.published ? new Date(notification.published).getTime() : 0;
  const expiresAt = notification?.expires ? new Date(notification.expires).getTime() : 0;
  const now = Date.now();
  const status: SystemNotificationStatus = publishedAt > now
    ? 'scheduled'
    : expiresAt && expiresAt < now
      ? 'expired'
      : 'active';

  return {
    id: String(notification?.id || ''),
    type,
    priority,
    title: String(notification?.title || ''),
    body: String(notification?.body || ''),
    details: String(notification?.details || ''),
    published: String(notification?.published || ''),
    expires: notification?.expires ? String(notification.expires) : null,
    targets: Array.isArray(notification?.targets)
      ? notification.targets.map((target: unknown) => String(target).toLowerCase())
      : ['all'],
    version: String(notification?.version || ''),
    target_license: notification?.target_license ? String(notification.target_license) : null,
    status,
  };
};

export const fetchSystemNotifications = async (): Promise<SystemNotification[]> => {
  const license = localStorage.getItem('plena_license') || '';
  const params = new URLSearchParams({
    target: NOTIFICATION_TARGET,
    license,
    _t: Date.now().toString(),
  });
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${API_URL}?${params.toString()}`, {
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = await response.json();
    const list = Array.isArray(payload) ? payload : [];
    return list
      .map(normalizeNotification)
      .filter(notification => notification.id && notification.status !== 'expired')
      .filter(notification => (
        notification.targets.includes('all') || notification.targets.includes(NOTIFICATION_TARGET)
      ))
      .sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime())
      .slice(0, 10);
  } finally {
    window.clearTimeout(timer);
  }
};
