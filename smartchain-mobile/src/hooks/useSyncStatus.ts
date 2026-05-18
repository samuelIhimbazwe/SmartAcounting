import {useEffect, useRef, useState} from 'react';
import {AppState, type AppStateStatus} from 'react-native';
import {apiCall} from '../api/client';

export interface SyncStatus {
  pendingApprovals: number;
  unreadAlerts: number;
  lastServerEventId: number;
  serverTime: string;
}

export function useSyncStatus(enabled: boolean) {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const fetchStatus = async () => {
    if (!enabled) {
      return;
    }
    try {
      const data = await apiCall<SyncStatus>('/mobile/sync-status');
      setStatus(data);
    } catch {
      /* polling failure should not disrupt UX */
    }
  };

  useEffect(() => {
    if (!enabled) {
      return;
    }
    void fetchStatus();
    intervalRef.current = setInterval(() => void fetchStatus(), 30_000);

    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') {
        void fetchStatus();
        intervalRef.current = setInterval(() => void fetchStatus(), 30_000);
      } else {
        clearInterval(intervalRef.current);
      }
    });

    return () => {
      clearInterval(intervalRef.current);
      sub.remove();
    };
  }, [enabled]);

  return status;
}
