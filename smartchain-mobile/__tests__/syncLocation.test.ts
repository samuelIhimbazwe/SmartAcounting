jest.mock('../src/store', () => ({
  store: {getState: jest.fn()},
}));

import {store} from '../src/store';
import {getSyncLocationCode} from '../src/inventory/syncLocation';

const getState = store.getState as jest.Mock;

describe('getSyncLocationCode', () => {
  beforeEach(() => {
    getState.mockReset();
  });

  it('uses selectedLocationCode from Redux', () => {
    getState.mockReturnValue({
      location: {selectedLocationCode: 'BRANCH_B'},
    });
    expect(getSyncLocationCode()).toBe('BRANCH_B');
  });

  it('falls back to SHOP when unset', () => {
    getState.mockReturnValue({location: {selectedLocationCode: null}});
    expect(getSyncLocationCode()).toBe('SHOP');
  });

  it('falls back to SHOP when location slice missing', () => {
    getState.mockReturnValue({});
    expect(getSyncLocationCode()).toBe('SHOP');
  });
});
