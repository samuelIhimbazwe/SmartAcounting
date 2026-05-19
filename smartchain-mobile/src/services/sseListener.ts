import {store} from '../store';
import {addAlert, type AlertItem} from '../store/slices/alertSlice';
import {addPendingApproval} from '../store/slices/copilotSlice';
import {BASE_URL} from '../api/client';

/**
 * Real-time alert listener.
 *
 * React Native does not ship a built-in `EventSource`, so we read the SSE
 * stream manually via `fetch` + `ReadableStream`. A small buffer accumulates
 * incoming bytes until we see a blank line, which terminates an SSE event;
 * then the event is dispatched into Redux.
 *
 * Mirrors the web frontend's alert subscription — same endpoint, same auth
 * headers, same payload shape.
 */

interface ActiveStream {
  reader: ReadableStreamDefaultReader<Uint8Array>;
  abort: AbortController;
}

let active: ActiveStream | null = null;

const ANOMALY_TYPES = new Set([
  'void_spike',
  'discount_abuse',
  'unusual_return',
  'stock_discrepancy',
  'cashier_performance',
  'revenue_drop',
]);

const TYPES_OF_INTEREST = new Set([
  'ANOMALY_DETECTED',
  'LOW_STOCK',
  'CREDIT_LIMIT_EXCEEDED',
  'approval_required',
  ...ANOMALY_TYPES,
]);

function dispatchAlert(event: AlertItem): void {
  if (!event || typeof event !== 'object' || typeof event.type !== 'string') {
    return;
  }
  if (event.type === 'approval_required') {
    store.dispatch(
      addPendingApproval({
        approvalId: String(event.approvalId ?? event.id ?? ''),
        description: String(
          event.actionDescription ?? event.description ?? 'Approval required',
        ),
        impactSummary: String(event.impactSummary ?? ''),
      }),
    );
  }
  store.dispatch(addAlert(event));
}

/** Process a complete SSE event block (one or more "field: value" lines). */
function processBlock(block: string): void {
  const lines = block.split(/\r?\n/);
  const dataLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart());
    }
  }
  if (dataLines.length === 0) return;
  const raw = dataLines.join('\n');
  try {
    const parsed = JSON.parse(raw) as AlertItem;
    dispatchAlert(parsed);
  } catch {
    /* heartbeats and non-JSON keep-alives are expected */
  }
}

export function startSseListener(
  token: string,
  tenantId: string,
  role: string,
): void {
  if (active) return;
  if (!token || !tenantId || !role) return;

  const roleSegment = role.toLowerCase();
  const url = `${BASE_URL}/dashboards/${roleSegment}/alerts/stream`;

  const abort = new AbortController();

  void (async () => {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Tenant-Id': tenantId,
          Accept: 'text/event-stream',
        },
        signal: abort.signal,
      });

      if (!response.ok || !response.body) {
        return;
      }

      const reader = response.body.getReader();
      active = {reader, abort};

      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      // SSE events are delimited by a blank line. We accumulate bytes until
      // we find one, then dispatch each complete block separately.
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, {stream: true});

        let separator = buffer.search(/\r?\n\r?\n/);
        while (separator !== -1) {
          const block = buffer.slice(0, separator);
          buffer = buffer.slice(separator + (buffer[separator] === '\r' ? 4 : 2));
          processBlock(block);
          separator = buffer.search(/\r?\n\r?\n/);
        }
      }

      // Flush any trailing buffered event.
      if (buffer.length > 0) {
        processBlock(buffer);
      }
    } catch {
      /* abort or network drop — caller can resubscribe on reconnect */
    } finally {
      active = null;
    }
  })();
}

export function stopSseListener(): void {
  if (!active) return;
  try {
    active.abort.abort();
  } catch {
    /* ignore */
  }
  try {
    void active.reader.cancel();
  } catch {
    /* ignore */
  }
  active = null;
}
