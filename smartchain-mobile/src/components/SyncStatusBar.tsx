import React, {useCallback, useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import {useTranslation} from 'react-i18next';
import {useSelector} from 'react-redux';
import type {RootState} from '../store';
import type {AppRole} from '../utils/roles';
import {
  getPendingTransactions,
  syncPendingTransactions,
} from '../services/offlineQueue';
import {
  getPendingEfdCount,
  retryPendingEfdSubmissions,
} from '../services/efd';
import {useSyncStatus} from '../hooks/useSyncStatus';

export function SyncStatusBar() {
  const {t} = useTranslation();
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastItemError, setLastItemError] = useState<string | null>(null);
  const [efdPending, setEfdPending] = useState(0);

  const accessToken = useSelector((s: RootState) => s.auth.accessToken);
  const roles = useSelector((s: RootState) => s.auth.roles) as AppRole[];
  const serverSync = useSyncStatus(!!accessToken);

  const refreshPending = useCallback(async () => {
    try {
      const pending = await getPendingTransactions();
      setPendingCount(pending.length);
      const err = pending.find(p => p.lastError)?.lastError;
      setLastItemError(err ?? null);
      setEfdPending(await getPendingEfdCount());
    } catch {
      setPendingCount(0);
      setLastItemError(null);
      setEfdPending(0);
    }
  }, []);

  useEffect(() => {
    void refreshPending();
  }, [refreshPending]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async state => {
      const online = !!(state.isConnected && state.isInternetReachable);
      setIsOnline(online);
      if (!online) {
        await refreshPending();
        return;
      }
      if (!accessToken) {
        return;
      }
      const pending = await getPendingTransactions();
      if (pending.length === 0) {
        setPendingCount(0);
        return;
      }
      setSyncing(true);
      try {
        const result = await syncPendingTransactions(roles);
        setPendingCount(prev => Math.max(0, prev - result.synced));
        await retryPendingEfdSubmissions(true);
        setEfdPending(await getPendingEfdCount());
      } finally {
        setSyncing(false);
        await refreshPending();
      }
    });
    return () => unsubscribe();
  }, [accessToken, roles, refreshPending]);

  const serverPending = serverSync?.pendingApprovals ?? 0;
  const serverAlerts = serverSync?.unreadAlerts ?? 0;
  const showServerBadges =
    isOnline && (serverPending > 0 || serverAlerts > 0);
  const showOfflineBar =
    !isOnline || pendingCount > 0 || efdPending > 0 || syncing;

  if (!showOfflineBar && !showServerBadges) {
    return null;
  }

  const statusText = syncing
    ? t('sync.syncing', {count: pendingCount})
    : isOnline
      ? lastItemError
        ? t('sync.syncError', {message: lastItemError.slice(0, 80)})
        : t('sync.backOnline')
      : t('sync.offline', {count: pendingCount});
  const efdNote =
    efdPending > 0
      ? ` · ${t('fiscal.efdPending', {count: efdPending, defaultValue: '{{count}} EFD pending'})}`
      : '';

  return (
    <View>
      {showServerBadges ? (
        <View style={styles.serverBar}>
          {serverPending > 0 ? (
            <Text style={styles.badgeText}>
              {t('sync.approvals', {count: serverPending})}
            </Text>
          ) : null}
          {serverAlerts > 0 ? (
            <Text style={styles.badgeText}>
              {t('sync.alerts', {count: serverAlerts})}
            </Text>
          ) : null}
        </View>
      ) : null}
      {showOfflineBar ? (
        <View style={[styles.bar, isOnline ? styles.syncing : styles.offline]}>
          <Text style={styles.text}>
            {statusText}
            {efdNote}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  serverBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 4,
    paddingHorizontal: 16,
    backgroundColor: '#1E40AF',
  },
  badgeText: {color: '#FFFFFF', fontSize: 12, fontWeight: '600'},
  bar: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  offline: {backgroundColor: '#DC2626'},
  syncing: {backgroundColor: '#D97706'},
  text: {color: '#FFFFFF', fontSize: 13, fontWeight: '600'},
});
