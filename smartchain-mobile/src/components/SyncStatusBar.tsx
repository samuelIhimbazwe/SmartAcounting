import React, {useCallback, useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import {useSelector} from 'react-redux';
import type {RootState} from '../store';
import type {AppRole} from '../utils/roles';
import {
  getPendingTransactions,
  syncPendingTransactions,
} from '../services/offlineQueue';
import {useSyncStatus} from '../hooks/useSyncStatus';

/**
 * Status bar pinned to the top of the authenticated shell.
 *
 * Renders nothing when the device is online *and* there are no pending
 * records, so it is safe to mount unconditionally above every screen.
 *
 * Behaviour matches the web `OfflineBanner` and the desktop offline-banner
 * IPC surface — all three platforms share the same wire contract and the
 * same UX language ("Offline — N saved locally", "Syncing N…", "Back online").
 */
export function SyncStatusBar() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const accessToken = useSelector((s: RootState) => s.auth.accessToken);
  const roles = useSelector((s: RootState) => s.auth.roles) as AppRole[];
  const serverSync = useSyncStatus(!!accessToken);

  const refreshPending = useCallback(async () => {
    try {
      const pending = await getPendingTransactions();
      setPendingCount(pending.length);
    } catch {
      setPendingCount(0);
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
  const showOfflineBar = !isOnline || pendingCount > 0 || syncing;

  if (!showOfflineBar && !showServerBadges) return null;

  return (
    <View>
      {showServerBadges ? (
        <View style={styles.serverBar}>
          {serverPending > 0 ? (
            <Text style={styles.badgeText}>
              {serverPending} approval{serverPending !== 1 ? 's' : ''}
            </Text>
          ) : null}
          {serverAlerts > 0 ? (
            <Text style={styles.badgeText}>
              {serverAlerts} alert{serverAlerts !== 1 ? 's' : ''}
            </Text>
          ) : null}
        </View>
      ) : null}
      {showOfflineBar ? (
        <View style={[styles.bar, isOnline ? styles.syncing : styles.offline]}>
          <Text style={styles.text}>
            {syncing
              ? `Syncing ${pendingCount} sale${pendingCount !== 1 ? 's' : ''}…`
              : isOnline
                ? 'Back online'
                : `Offline — ${pendingCount} sale${pendingCount !== 1 ? 's' : ''} saved locally`}
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
