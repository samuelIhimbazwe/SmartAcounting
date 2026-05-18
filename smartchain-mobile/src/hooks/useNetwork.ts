import {useEffect} from 'react';
import NetInfo from '@react-native-community/netinfo';
import {useDispatch, useSelector} from 'react-redux';
import type {RootState} from '../store';
import {setOnline} from '../store/slices/networkSlice';
import {syncPendingTransactions} from '../services/offlineQueue';

export function useNetwork() {
  const dispatch = useDispatch();
  const roles = useSelector((s: RootState) => s.auth.roles);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const online =
        state.isConnected === true &&
        (state.isInternetReachable === true ||
          state.isInternetReachable === null);
      dispatch(setOnline(!!online));
      if (online) {
        void syncPendingTransactions(roles);
      }
    });
    return () => unsubscribe();
  }, [dispatch, roles]);
}
