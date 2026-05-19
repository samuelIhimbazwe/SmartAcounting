import {AppState} from 'react-native';
import {store} from '../store';
import {fetchReorderSuggestions} from '../api/aiAnalytics';
import {
  pruneDismissed,
  setReorderCount,
} from '../store/slices/intelligenceSlice';

export function startReorderSuggestionsWatcher(): () => void {
  const refresh = async () => {
    try {
      store.dispatch(pruneDismissed());
      const res = await fetchReorderSuggestions();
      const dismissed = store.getState().intelligence.dismissedReorderUntil;
      const now = Date.now();
      const active = (res.suggestions ?? []).filter(s => {
        const until = dismissed[s.suggestionId];
        return !until || until <= now;
      });
      store.dispatch(setReorderCount(active.length));
    } catch {
      /* offline */
    }
  };

  void refresh();
  const sub = AppState.addEventListener('change', state => {
    if (state === 'active') {
      void refresh();
    }
  });
  return () => sub.remove();
}
