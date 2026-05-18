import EventSource from 'react-native-event-source';
import {BASE_URL} from '../../api/client';
import {roleDashboardPath} from '../../utils/roles';
import type {AppRole} from '../../utils/roles';

const STREAM_TIMEOUT_MS = 5000;

function mapRoleToApi(role: string): string {
  const known: AppRole[] = [
    'CEO',
    'CFO',
    'SALES_MANAGER',
    'OPS_MANAGER',
    'HR_MANAGER',
    'MARKETING_MANAGER',
    'ACCOUNTING_CONTROLLER',
  ];
  if (known.includes(role as AppRole)) {
    return roleDashboardPath(role as AppRole);
  }
  return role.toLowerCase();
}

/**
 * Streams a copilot query via SSE (`token` events) and calls onChunk per delta.
 * Returns cleanup to abort the stream.
 */
export function streamCopilotQuery(
  question: string,
  role: string,
  token: string,
  tenantId: string | null,
  userId: string | null,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: unknown) => void,
): () => void {
  const url = `${BASE_URL}/ai/copilot/query/stream`;
  let closed = false;
  let gotToken = false;

  const timeout = setTimeout(() => {
    if (!gotToken && !closed) {
      closed = true;
      es.close();
      onError(new Error('stream_timeout'));
    }
  }, STREAM_TIMEOUT_MS);

  const es = new EventSource(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(tenantId ? {'X-Tenant-Id': tenantId} : {}),
      ...(userId ? {'X-User-Id': userId} : {}),
    },
    body: JSON.stringify({
      role: mapRoleToApi(role),
      question,
    }),
  });

  const finish = () => {
    clearTimeout(timeout);
    if (!closed) {
      closed = true;
      es.close();
      onDone();
    }
  };

  es.addEventListener('token', (e: {data?: string}) => {
    gotToken = true;
    const raw = e.data ?? '';
    if (raw) {
      onChunk(raw);
    }
  });

  es.addEventListener('message', (e: {data?: string}) => {
    const raw = e.data ?? '';
    if (raw === '[DONE]' || raw === 'complete') {
      finish();
      return;
    }
    if (raw) {
      gotToken = true;
      try {
        const parsed = JSON.parse(raw) as {delta?: string};
        onChunk(parsed.delta ?? raw);
      } catch {
        onChunk(raw);
      }
    }
  });

  es.addEventListener('done', () => {
    finish();
  });

  es.addEventListener('error', (e: unknown) => {
    clearTimeout(timeout);
    if (!closed) {
      closed = true;
      es.close();
      onError(e);
    }
  });

  return () => {
    clearTimeout(timeout);
    if (!closed) {
      closed = true;
      es.close();
    }
  };
}
