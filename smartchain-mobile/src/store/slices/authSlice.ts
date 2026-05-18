import {createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit';
import {setItem, removeItem} from '../../utils/storage';
import type {AppRole} from '../../utils/roles';
import {
  postLogin,
  postMfaChallenge,
  postLogout,
  type LoginBody,
  type SessionPayload,
} from '../../api/auth';

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  tenantId: string | null;
  userId: string | null;
  roles: AppRole[];
  role: AppRole | null;
  userName: string | null;
  isLoading: boolean;
  error: string | null;
  loginDraft: Pick<
    LoginBody,
    'username' | 'password' | 'tenantId' | 'userId'
  > | null;
  pendingMfaChallengeId: string | null;
  /** MFA OTP digits typed on the MFA screen — kept in Redux per project rules. */
  otpEntry: string;
  loginForm: {
    username: string;
    password: string;
    tenantId: string;
    userId: string;
  };
}

export const authInitialState: AuthState = {
  accessToken: null,
  refreshToken: null,
  tenantId: null,
  userId: null,
  roles: [],
  role: null,
  userName: null,
  isLoading: false,
  error: null,
  loginDraft: null,
  pendingMfaChallengeId: null,
  otpEntry: '',
  loginForm: {
    username: '',
    password: '',
    tenantId: '',
    userId: '',
  },
};

function pickPrimaryRole(roles: AppRole[]): AppRole | null {
  const order: AppRole[] = [
    'CEO',
    'CFO',
    'OPS_MANAGER',
    'SALES_MANAGER',
    'ACCOUNTING_CONTROLLER',
    'HR_MANAGER',
    'MARKETING_MANAGER',
  ];
  for (const r of order) {
    if (roles.includes(r)) {
      return r;
    }
  }
  return roles[0] ?? null;
}

function applySession(state: AuthState, session: SessionPayload) {
  state.accessToken = session.accessToken;
  state.refreshToken = session.refreshToken;
  state.tenantId = session.tenantId;
  state.userId = session.userId;
  state.roles = session.roles;
  state.role = pickPrimaryRole(session.roles);
  state.userName = session.userName;
  setItem('refreshToken', session.refreshToken);
}

export const loginWithPassword = createAsyncThunk<
  SessionPayload,
  void,
  {rejectValue: {needMfa: true; challengeId: string}; state: {auth: AuthState}}
>('auth/loginWithPassword', async (_, {rejectWithValue, getState}) => {
  const creds = getState().auth.loginForm;
  const challenge = await postMfaChallenge(creds);
  if (challenge.challengeId !== 'not-required') {
    return rejectWithValue({
      needMfa: true,
      challengeId: challenge.challengeId,
    });
  }
  return postLogin({
    ...creds,
    mfaChallengeId: null,
    otpCode: null,
  });
});

export const loginWithOtp = createAsyncThunk<
  SessionPayload,
  {mfaChallengeId: string; otpCode: string}
>('auth/loginWithOtp', async (payload, {getState}) => {
  const draft = (getState() as {auth: AuthState}).auth.loginDraft;
  if (!draft) {
    throw new Error('Missing login draft for MFA');
  }
  return postLogin({
    ...draft,
    mfaChallengeId: payload.mfaChallengeId,
    otpCode: payload.otpCode,
  });
});

export const logoutAsync = createAsyncThunk(
  'auth/logoutAsync',
  async (_, {getState}) => {
    const refresh = (getState() as {auth: AuthState}).auth.refreshToken;
    if (refresh) {
      try {
        await postLogout(refresh);
      } catch {
        /* ignore */
      }
    }
  },
);

const authSlice = createSlice({
  name: 'auth',
  initialState: authInitialState,
  reducers: {
    logout: state => {
      state.accessToken = null;
      state.refreshToken = null;
      state.tenantId = null;
      state.userId = null;
      state.roles = [];
      state.role = null;
      state.userName = null;
      state.loginDraft = null;
      state.pendingMfaChallengeId = null;
      state.otpEntry = '';
      state.loginForm = {
        username: '',
        password: '',
        tenantId: '',
        userId: '',
      };
      removeItem('refreshToken');
    },
    setTokens: (
      state,
      action: PayloadAction<{accessToken: string; refreshToken: string}>,
    ) => {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
    },
    setOtpEntry: (state, action: PayloadAction<string>) => {
      state.otpEntry = action.payload;
    },
    updateLoginForm: (
      state,
      action: PayloadAction<Partial<AuthState['loginForm']>>,
    ) => {
      state.loginForm = {...state.loginForm, ...action.payload};
    },
    cancelMfa: state => {
      state.pendingMfaChallengeId = null;
      state.loginDraft = null;
      state.otpEntry = '';
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(loginWithPassword.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginWithPassword.fulfilled, (state, action) => {
        state.isLoading = false;
        applySession(state, action.payload);
        state.loginDraft = null;
        state.pendingMfaChallengeId = null;
        state.otpEntry = '';
      })
      .addCase(loginWithPassword.rejected, (state, action) => {
        state.isLoading = false;
        const pv = action.payload as {needMfa?: boolean; challengeId?: string} | undefined;
        if (pv?.needMfa && pv.challengeId) {
          state.loginDraft = {...state.loginForm};
          state.pendingMfaChallengeId = pv.challengeId;
          state.error = null;
          return;
        }
        state.error =
          (action.payload as string | undefined) ||
          action.error.message ||
          'Login failed';
      })
      .addCase(loginWithOtp.pending, state => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginWithOtp.fulfilled, (state, action) => {
        state.isLoading = false;
        applySession(state, action.payload);
        state.loginDraft = null;
        state.pendingMfaChallengeId = null;
        state.otpEntry = '';
      })
      .addCase(loginWithOtp.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'MFA login failed';
      });
  },
});

export const {logout, setTokens, setOtpEntry, updateLoginForm, cancelMfa} =
  authSlice.actions;
export default authSlice.reducer;
