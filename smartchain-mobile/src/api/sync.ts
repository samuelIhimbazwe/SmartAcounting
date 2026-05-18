import {apiClient} from './client';

/** POST body is a JSON array of SyncOperationRequest (root-level array). */
export async function postSyncQueue(requests: unknown[]) {
  const {data} = await apiClient.post<Record<string, unknown>>('/sync/queue', requests);
  return data;
}

export async function postSyncFlush() {
  const {data} = await apiClient.post<{processed: number}>('/sync/flush');
  return data;
}
