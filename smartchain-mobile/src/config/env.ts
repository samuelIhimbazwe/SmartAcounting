import {
  API_BASE_URL,
  SENTRY_DSN,
  ENVIRONMENT,
  ENABLE_FLIPPER,
} from '@env';

export const ENV = {
  API_BASE_URL: API_BASE_URL || 'http://localhost:8080/api/v1',
  SENTRY_DSN: SENTRY_DSN || '',
  ENVIRONMENT: ENVIRONMENT || 'development',
  ENABLE_FLIPPER: ENABLE_FLIPPER === 'true',
} as const;
