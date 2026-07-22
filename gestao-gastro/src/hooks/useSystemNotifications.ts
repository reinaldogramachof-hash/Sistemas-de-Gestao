import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchSystemNotifications, SystemNotification } from '../services/notificationsService';

const READ_KEY = 'gestao_gastro_notifications_read';
const CACHE_KEY = 'gestao_gastro_notifications_cache';
const CHANGE_EVENT = 'gestao-gastro-notifications-updated';
const LOCAL_CACHE_MS = 0;
const PROD_CACHE_MS = 30 * 60 * 1000;

interface NotificationCache {
  fetchedAt: number;
  data: SystemNotification[];
}

const isLocalHost = () => window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
};

const getReadIds = () => readJson<string[]>(READ_KEY, []);

export const useSystemNotifications = () => {
  const [notifications, setNotifications] = useState<SystemNotification[]>(() => {
    const cache = readJson<NotificationCache | null>(CACHE_KEY, null);
    return cache?.data || [];
  });
  const [readIds, setReadIds] = useState<string[]>(() => getReadIds());
  const [loading, setLoading] = useState(() => notifications.length === 0);
  const [error, setError] = useState('');

  const persistReadIds = useCallback((next: string[]) => {
    const unique = [...new Set(next)];
    localStorage.setItem(READ_KEY, JSON.stringify(unique));
    setReadIds(unique);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const refresh = useCallback(async (forceNetwork = false) => {
    const cache = readJson<NotificationCache | null>(CACHE_KEY, null);
    const cacheMs = isLocalHost() ? LOCAL_CACHE_MS : PROD_CACHE_MS;
    const cacheFresh = cache && (Date.now() - cache.fetchedAt) < cacheMs;

    if (!forceNetwork && cacheFresh) {
      setNotifications(cache.data);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await fetchSystemNotifications();
      localStorage.setItem(CACHE_KEY, JSON.stringify({ fetchedAt: Date.now(), data }));
      setNotifications(data);
      setError('');
    } catch (err) {
      if (cache) {
        setNotifications(cache.data);
      } else {
        setError(err instanceof Error ? err.message : 'Erro ao carregar notificacoes');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh(false);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refresh(true);
      }
    };
    const handleChange = () => {
      setReadIds(getReadIds());
      const cache = readJson<NotificationCache | null>(CACHE_KEY, null);
      if (cache) setNotifications(cache.data);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener(CHANGE_EVENT, handleChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener(CHANGE_EVENT, handleChange);
    };
  }, [refresh]);

  const unreadCount = useMemo(
    () => notifications.filter(notification => !readIds.includes(notification.id)).length,
    [notifications, readIds],
  );

  const markAsRead = useCallback((id: string) => {
    persistReadIds([...getReadIds(), id]);
  }, [persistReadIds]);

  const markAllAsRead = useCallback(() => {
    persistReadIds(notifications.map(notification => notification.id));
  }, [notifications, persistReadIds]);

  return {
    notifications,
    readIds,
    unreadCount,
    loading,
    error,
    refresh,
    markAsRead,
    markAllAsRead,
  };
};
