import {apiCall, ApiError} from '../api/client';

/** RRA_API_TODO: confirm TIN format with official RRA documentation. */
export const RRA_TIN_REGEX = /^\d{9}$/;

const TIN_VALIDATE_PATH = '/compliance/tin/validate';
const TIN_VALIDATE_TIMEOUT_MS = 10_000;

interface TinValidationApiResponse {
  valid?: boolean;
  registered?: boolean;
  name?: string;
  type?: string;
  error?: string;
  message?: string;
}

export function isValidTinFormat(tin: string | null | undefined): boolean {
  if (!tin) {
    return true;
  }
  const normalized = tin.trim();
  if (!normalized) {
    return true;
  }
  return RRA_TIN_REGEX.test(normalized);
}

export function normalizeTin(tin: string): string {
  return tin.trim();
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      error => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function mapApiError(error: unknown): Error {
  if (error instanceof ApiError) {
    const body = error.body;
    if (typeof body === 'object' && body !== null) {
      const record = body as Record<string, unknown>;
      const message =
        (typeof record.error === 'string' && record.error) ||
        (typeof record.message === 'string' && record.message) ||
        error.message;
      return new Error(message);
    }
    return new Error(error.message);
  }
  if (error instanceof Error) {
    return error;
  }
  return new Error(String(error));
}

/**
 * Validates a Rwanda TIN via backend POST /api/v1/compliance/tin/validate.
 * Local format check runs before any network call.
 */
export async function verifyTinWithRra(
  tin: string,
): Promise<{registered: boolean; name?: string}> {
  const normalized = normalizeTin(tin);
  if (!normalized) {
    return {registered: true};
  }

  if (!isValidTinFormat(normalized)) {
    throw new Error('TIN must be exactly 9 digits');
  }

  try {
    const data = await withTimeout(
      apiCall<TinValidationApiResponse>(TIN_VALIDATE_PATH, {
        method: 'POST',
        body: JSON.stringify({tin: normalized}),
      }),
      TIN_VALIDATE_TIMEOUT_MS,
      'TIN validation timed out',
    );

    const registered = data.valid ?? data.registered ?? false;
    if (!registered) {
      return {registered: false};
    }

    return {
      registered: true,
      name: data.name,
    };
  } catch (error) {
    throw mapApiError(error);
  }
}
