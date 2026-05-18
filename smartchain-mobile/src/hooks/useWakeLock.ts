import {useEffect} from 'react';
import KeepAwake from 'react-native-keep-awake';

export function useWakeLock() {
  useEffect(() => {
    KeepAwake.activate();
    return () => KeepAwake.deactivate();
  }, []);
}
