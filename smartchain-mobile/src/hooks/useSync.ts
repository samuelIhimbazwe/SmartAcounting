import {useEffect} from 'react';
import {AppState} from 'react-native';
import {useSelector} from 'react-redux';
import type {RootState} from '../store';
import {syncPendingTransactions} from '../services/offlineQueue';

/** Flush offline POS queue when app returns to foreground while online. */
export function useSync() {
  const roles = useSelector((s: RootState) => s.auth.roles);
  const online = useSelector((s: RootState) => s.network.online);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active' && online) {
        void syncPendingTransactions(roles);
      }
    });
    return () => sub.remove();
  }, [roles, online]);
}
