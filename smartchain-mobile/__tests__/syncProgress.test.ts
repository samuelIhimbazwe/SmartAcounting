import {getSyncProgress, setSyncProgress} from '../src/services/syncProgress';

describe('syncProgress', () => {
  it('stores and clears catalog sync progress', () => {
    setSyncProgress({active: true, processed: 100, total: 500});
    expect(getSyncProgress()).toEqual({active: true, processed: 100, total: 500});
    setSyncProgress(null);
    expect(getSyncProgress()).toBeNull();
  });
});
