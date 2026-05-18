import {apiClient} from './client';

export async function fetchTillExpected(businessDate: string, posRegisterCode: string) {
  const {data} = await apiClient.get<Record<string, unknown>>('/retail/till/expected', {
    params: {businessDate, posRegisterCode},
  });
  return data;
}

export async function postTillClose(body: Record<string, unknown>) {
  const {data} = await apiClient.post<Record<string, unknown>>('/retail/till/close', body);
  return data;
}
