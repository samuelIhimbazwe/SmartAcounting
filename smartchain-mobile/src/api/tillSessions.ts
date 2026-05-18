import {apiCall} from './client';

export type TillSessionDto = {
  id: string;
  tillId: string;
  posRegisterCode: string;
  cashierId: string;
  shiftId?: string;
  openedAt: string;
  closedAt?: string;
  openingFloat: number;
  closingCash?: number;
  variance?: number;
  status: string;
  notes?: string;
};

export async function getCurrentTillSession(): Promise<TillSessionDto> {
  return apiCall<TillSessionDto>('/pos/till-sessions/current');
}

export async function openTillSession(body: {
  posRegisterCode: string;
  openingFloat: number;
  shiftId?: string;
}): Promise<TillSessionDto> {
  return apiCall<TillSessionDto>('/pos/till-sessions', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function closeTillSession(
  sessionId: string,
  body: {closingCash: number; notes?: string},
): Promise<TillSessionDto> {
  return apiCall<TillSessionDto>(`/pos/till-sessions/${sessionId}/close`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}
