import {createSlice, PayloadAction} from '@reduxjs/toolkit';

interface NetworkState {
  online: boolean;
}

const initialState: NetworkState = {
  online: true,
};

const networkSlice = createSlice({
  name: 'network',
  initialState,
  reducers: {
    setOnline: (state, action: PayloadAction<boolean>) => {
      state.online = action.payload;
    },
  },
});

export const {setOnline} = networkSlice.actions;
export default networkSlice.reducer;
