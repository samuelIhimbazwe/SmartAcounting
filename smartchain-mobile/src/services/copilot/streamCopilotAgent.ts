import EventSource from 'react-native-event-source';
import {BASE_URL} from '../../api/client';
import {roleDashboardPath} from '../../utils/roles';
import type {AppRole} from '../../utils/roles';

export type AgentStreamEvent = {
  event: string;
  data: Record<string, unknown>;
};

function mapRoleToApi(role: string): string {
  const known: AppRole[] = [
    'CEO',
    'CFO',
    'SALES_MANAGER',
    'OPS_MANAGER',
    'HR_MANAGER',
    'MARKETING_MANAGER',
    'ACCOUNTING_CONTROLLER',
    'CASHIER',
    'POS_OPERATOR',
  ];
  if (known.includes(role as AppRole)) {
    return roleDashboardPath(role as AppRole);
  }
  return role.toLowerCase();
}

function parseEventData(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {message: raw};
  }
}

export function streamCopilotAgent(
  question: string,
  role: string,
  token: string,
  tenantId: string | null,
  userId: string | null,
  onEvent: (evt: AgentStreamEvent) => void,
  onDone: () => void,
  onError: (err: unknown) => void,
): () => void {
  const url = `${BASE_URL}/ai/copilot/agent/run/stream`;
  let closed = false;

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
      dryRun: false,
      approveActions: false,
    }),
  });

  const finish = () => {
    if (!closed) {
      closed = true;
      es.close();
      onDone();
    }
  };

  const handleNamed = (eventName: string) => (e: {data?: string}) => {
    if (!e.data) {
      return;
    }
    onEvent({event: eventName, data: parseEventData(e.data)});
    if (eventName === 'completed' || eventName === 'failed') {
      finish();
    }
  };

  [
    'run_started',
    'step',
    'approval_required',
    'completed',
    'failed',
    'timed_out',
    'cancelled',
    'token',
    'message',
  ].forEach(name => {
    es.addEventListener(name, handleNamed(name));
  });

  es.addEventListener('error', (e: unknown) => {
    if (!closed) {
      closed = true;
      es.close();
      onError(e);
    }
  });

  return () => {
    if (!closed) {
      closed = true;
      es.close();
    }
  };
}
