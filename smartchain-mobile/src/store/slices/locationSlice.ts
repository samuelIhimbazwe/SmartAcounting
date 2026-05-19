import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {logout} from './authSlice';

export type LocationSummary = {
  id: string;
  name: string;
  locationCode?: string;
  currencyDefault?: string;
};

interface LocationState {
  selectedLocationId: string | null;
  selectedLocationName: string | null;
  selectedLocationCode: string | null;
  accessibleLocations: LocationSummary[];
  locationPickerRequired: boolean;
}

const initialState: LocationState = {
  selectedLocationId: null,
  selectedLocationName: null,
  selectedLocationCode: null,
  accessibleLocations: [],
  locationPickerRequired: false,
};

const locationSlice = createSlice({
  name: 'location',
  initialState,
  reducers: {
    setAccessibleLocations: (
      state,
      action: PayloadAction<LocationSummary[]>,
    ) => {
      state.accessibleLocations = action.payload;
      state.locationPickerRequired = action.payload.length > 1;
      if (
        action.payload.length === 1 &&
        !state.selectedLocationId
      ) {
        const only = action.payload[0];
        state.selectedLocationId = only.id;
        state.selectedLocationName = only.name;
        state.selectedLocationCode = only.locationCode ?? null;
        state.locationPickerRequired = false;
      }
    },
    selectLocation: (state, action: PayloadAction<LocationSummary>) => {
      state.selectedLocationId = action.payload.id;
      state.selectedLocationName = action.payload.name;
      state.selectedLocationCode = action.payload.locationCode ?? null;
      state.locationPickerRequired = false;
    },
    clearLocation: state => {
      state.selectedLocationId = null;
      state.selectedLocationName = null;
      state.selectedLocationCode = null;
      state.accessibleLocations = [];
      state.locationPickerRequired = false;
    },
  },
  extraReducers: builder => {
    builder.addCase(logout, () => initialState);
  },
});

export const {setAccessibleLocations, selectLocation, clearLocation} =
  locationSlice.actions;
export default locationSlice.reducer;
