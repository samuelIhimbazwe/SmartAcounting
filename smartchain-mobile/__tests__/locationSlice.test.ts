import locationReducer, {
  clearLocation,
  selectLocation,
  setAccessibleLocations,
} from '../src/store/slices/locationSlice';

describe('locationSlice', () => {
  it('auto-selects when only one location', () => {
    const state = locationReducer(
      undefined,
      setAccessibleLocations([{id: 'loc-1', name: 'Shop A'}]),
    );
    expect(state.selectedLocationId).toBe('loc-1');
    expect(state.locationPickerRequired).toBe(false);
  });

  it('requires picker for multiple locations', () => {
    const state = locationReducer(
      undefined,
      setAccessibleLocations([
        {id: 'a', name: 'A'},
        {id: 'b', name: 'B'},
      ]),
    );
    expect(state.locationPickerRequired).toBe(true);
    expect(state.selectedLocationId).toBeNull();
  });

  it('selectLocation sets active branch', () => {
    let state = locationReducer(
      undefined,
      setAccessibleLocations([
        {id: 'a', name: 'A'},
        {id: 'b', name: 'B'},
      ]),
    );
    state = locationReducer(
      state,
      selectLocation({id: 'b', name: 'Branch B', locationCode: 'B1'}),
    );
    expect(state.selectedLocationId).toBe('b');
    expect(state.selectedLocationName).toBe('Branch B');
  });

  it('clearLocation resets', () => {
    let state = locationReducer(
      undefined,
      selectLocation({id: 'a', name: 'A'}),
    );
    state = locationReducer(state, clearLocation());
    expect(state.selectedLocationId).toBeNull();
  });
});
