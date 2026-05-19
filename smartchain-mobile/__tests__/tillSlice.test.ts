import tillReducer, {
  clearTillSession,
  setCurrentSessionId,
} from '../src/store/slices/tillSlice';

describe('tillSlice', () => {
  it('sets currentSessionId on open', () => {
    const state = tillReducer(undefined, setCurrentSessionId('sess-1'));
    expect(state.currentSessionId).toBe('sess-1');
  });

  it('clears currentSessionId on close', () => {
    let state = tillReducer(undefined, setCurrentSessionId('sess-1'));
    state = tillReducer(state, clearTillSession());
    expect(state.currentSessionId).toBeNull();
  });
});
