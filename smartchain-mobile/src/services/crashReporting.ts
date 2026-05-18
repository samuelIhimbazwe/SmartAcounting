import * as Sentry from '@sentry/react-native';
import {Platform} from 'react-native';
import {ENV} from '../config/env';

export function initCrashReporting(): void {
  if (__DEV__) {
    return;
  }
  if (!ENV.SENTRY_DSN) {
    return;
  }

  Sentry.init({
    dsn: ENV.SENTRY_DSN,
    environment: ENV.ENVIRONMENT,
    tracesSampleRate: 0.2,
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers['Authorization'];
        delete event.request.headers['X-Tenant-Id'];
      }
      return event;
    },
  });
}

export function captureError(
  error: Error,
  context?: Record<string, unknown>,
): void {
  if (__DEV__) {
    console.error(error, context);
    return;
  }
  Sentry.captureException(error, {extra: context});
}

export function setUserContext(
  userId: string,
  tenantId: string,
  role: string,
): void {
  if (__DEV__) {
    return;
  }
  Sentry.setUser({id: userId});
  Sentry.setTag('tenantId', tenantId);
  Sentry.setTag('role', role);
  Sentry.setTag('platform', Platform.OS);
}
