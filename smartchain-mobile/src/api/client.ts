import axios from 'axios';
import {API_BASE_URL} from '@env';
import {getItem, setItem, removeItem} from '../utils/storage';

export const BASE_URL = API_BASE_URL || 'https://api.smartchain.rw/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {'Content-Type': 'application/json'},
});

apiClient.interceptors.request.use(config => {
  const {store} = require('../store') as typeof import('../store');
  const state = store.getState();
  const token = state.auth.accessToken;
  const tenantId = state.auth.tenantId;
  const userId = state.auth.userId;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (tenantId) {
    config.headers['X-Tenant-Id'] = tenantId;
  }
  if (userId) {
    config.headers['X-User-Id'] = userId;
  }
  return config;
});

apiClient.interceptors.response.use(
  response => response,
  async error => {
    const original = error.config;
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('missing refresh');
        }
        const {data} = await axios.post<{
          token: string;
          refreshToken: string;
        }>(`${BASE_URL}/auth/refresh`, {refreshToken});
        setItem('refreshToken', data.refreshToken);
        const {store} = require('../store') as typeof import('../store');
        const {setTokens} = require('../store/slices/authSlice');
        store.dispatch(
          setTokens({
            accessToken: data.token,
            refreshToken: data.refreshToken,
          }),
        );
        original.headers.Authorization = `Bearer ${data.token}`;
        return apiClient(original);
      } catch {
        const {store} = require('../store') as typeof import('../store');
        const {logout} = require('../store/slices/authSlice');
        removeItem('refreshToken');
        store.dispatch(logout());
      }
    }
    return Promise.reject(error);
  },
);
